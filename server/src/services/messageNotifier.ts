import type { GroupRecord, NotificationSettings } from '../types/domain';
import { HttpError } from '../utils/httpError';
import { claimDispatch, finishDispatch } from './dispatchRegistry';
import { buildContent, sendPushes, type OutgoingPush } from './notificationSender';
import { applyPreferences, resolveRecipients, type ConversationContext } from './recipientResolver';
import {
  disableDevices,
  getActiveDevices,
  getDirectConversation,
  getGroup,
  getMessage,
  getPreferences,
  getPublicNames,
  writeConversationMembers,
} from './repositories';

// Evita que mensagens antigas sejam usadas para disparar pushes tardios.
const MAX_MESSAGE_AGE_MS = 15 * 60 * 1000;

export type NotifyOutcome = {
  status: 'sent' | 'duplicate' | 'skipped';
  recipients: number;
  delivered: number;
  failed: number;
  invalidTokensDisabled: number;
  policy: NotificationSettings['policy'] | 'direct';
};

async function loadConversation(
  conversationId: string,
  conversationType: 'direct' | 'group',
): Promise<{ context: ConversationContext; group: GroupRecord | null }> {
  if (conversationType === 'direct') {
    const direct = await getDirectConversation(conversationId);
    if (!direct) throw new HttpError(404, 'Conversa não encontrada.');
    return { context: { type: 'direct', participantIds: direct.participantIds }, group: null };
  }
  const group = await getGroup(conversationId);
  if (!group) throw new HttpError(404, 'Grupo não encontrado.');
  // Mantém o espelho de integrantes do Realtime Database alinhado ao Firestore.
  await writeConversationMembers(group.id, group.memberIds);
  return {
    context: { type: 'group', memberIds: group.memberIds, notificationPolicy: group.notificationPolicy },
    group,
  };
}

/**
 * Fluxo completo do push de uma mensagem:
 * 1. confirma no Realtime Database que a mensagem existe e foi enviada pelo usuário autenticado;
 * 2. consulta no Firestore os participantes e a política de notificação;
 * 3. calcula os destinatários no servidor e aplica as preferências de cada um;
 * 4. envia pelo FCM/Expo e desativa tokens inválidos — uma única vez por mensagem.
 */
export async function notifyMessage(callerUid: string, conversationId: string, messageId: string): Promise<NotifyOutcome> {
  const message = await getMessage(conversationId, messageId);
  if (!message || message.conversationId !== conversationId) throw new HttpError(404, 'Mensagem não encontrada.');
  if (message.senderId !== callerUid) throw new HttpError(403, 'Somente o remetente pode solicitar o push da mensagem.');
  if (message.createdAt > 0 && Date.now() - message.createdAt > MAX_MESSAGE_AGE_MS) {
    throw new HttpError(409, 'Mensagem antiga demais para gerar notificação.');
  }

  const { context, group } = await loadConversation(conversationId, message.conversationType);
  const isParticipant =
    context.type === 'direct' ? context.participantIds.includes(callerUid) : context.memberIds.includes(callerUid);
  if (!isParticipant) throw new HttpError(403, 'Você não participa desta conversa.');

  const policy = context.type === 'group' ? context.notificationPolicy : 'direct';
  const empty = { recipients: 0, delivered: 0, failed: 0, invalidTokensDisabled: 0, policy } as const;

  if (!(await claimDispatch(conversationId, messageId, callerUid))) return { status: 'duplicate', ...empty };

  try {
    const resolved = resolveRecipients(context, message);
    const preferences = await getPreferences(resolved.map((recipient) => recipient.uid));
    const recipients = applyPreferences(resolved, preferences, conversationId);
    if (recipients.length === 0) {
      await finishDispatch(conversationId, messageId, 'sent', { recipients: 0, delivered: 0, failed: 0 });
      return { status: 'skipped', ...empty };
    }

    const [devices, names] = await Promise.all([
      getActiveDevices(recipients.map((recipient) => recipient.uid)),
      getPublicNames([callerUid]),
    ]);
    const senderName = names.get(callerUid) ?? 'Alguém';
    const reasonByUid = new Map(recipients.map((recipient) => [recipient.uid, recipient.reason]));

    const pushes: OutgoingPush[] = devices.map((device) => ({
      device,
      content: buildContent({
        conversationType: message.conversationType,
        reason: reasonByUid.get(device.uid) ?? 'group',
        senderName,
        groupName: group?.name ?? null,
      }),
    }));

    const report = await sendPushes(pushes, { conversationId, conversationType: message.conversationType });
    await disableDevices(report.invalidDevices, 'invalid-token');
    await finishDispatch(conversationId, messageId, 'sent', {
      recipients: recipients.length,
      delivered: report.delivered,
      failed: report.failed,
    });

    return {
      status: 'sent',
      recipients: recipients.length,
      delivered: report.delivered,
      failed: report.failed,
      invalidTokensDisabled: report.invalidDevices.length,
      policy,
    };
  } catch (error) {
    // Libera a reserva para permitir nova tentativa do app.
    await finishDispatch(conversationId, messageId, 'failed', { recipients: 0, delivered: 0, failed: 0 }).catch(
      () => undefined,
    );
    throw error;
  }
}
