import type { MessageTarget, NotificationPolicy, NotificationPreferences } from '../types/domain';

export type ConversationContext =
  | { type: 'direct'; participantIds: readonly string[] }
  | { type: 'group'; memberIds: readonly string[]; notificationPolicy: NotificationPolicy };

export type MessageContext = {
  senderId: string;
  target: MessageTarget;
  mentionedUserIds: readonly string[];
};

/** `mention`: o destinatário foi mencionado ou escolhido como destinatário da mensagem. */
export type RecipientReason = 'direct' | 'group' | 'mention';

export type Recipient = {
  uid: string;
  reason: RecipientReason;
};

function explicitlyAddressed(message: MessageContext): Set<string> {
  const addressed = new Set(message.mentionedUserIds);
  if (message.target.type === 'member') addressed.add(message.target.memberId);
  return addressed;
}

/**
 * Calcula, no servidor, quem deve receber o push de uma mensagem. Nunca confia em
 * listas enviadas pelo app: usa apenas os participantes atuais lidos do Firestore.
 *
 * Regras gerais: o remetente nunca é notificado e somente participantes da conversa
 * podem ser destinatários (menções a não integrantes são ignoradas).
 */
export function resolveRecipients(conversation: ConversationContext, message: MessageContext): Recipient[] {
  if (conversation.type === 'direct') {
    if (!conversation.participantIds.includes(message.senderId)) return [];
    return conversation.participantIds
      .filter((uid) => uid !== message.senderId)
      .map((uid) => ({ uid, reason: 'direct' }));
  }

  const members = new Set(conversation.memberIds);
  if (!members.has(message.senderId)) return [];
  const addressed = explicitlyAddressed(message);

  switch (conversation.notificationPolicy) {
    case 'all_group_messages':
      return [...members]
        .filter((uid) => uid !== message.senderId)
        .map((uid) => ({ uid, reason: addressed.has(uid) ? 'mention' : 'group' }));
    case 'mentioned_members':
      return [...addressed]
        .filter((uid) => uid !== message.senderId && members.has(uid))
        .map((uid) => ({ uid, reason: 'mention' }));
    case 'direct_messages_only':
    case 'disabled':
      return [];
  }
}

/** Remove quem desativou os pushes ou silenciou a conversa. */
export function applyPreferences(
  recipients: readonly Recipient[],
  preferences: ReadonlyMap<string, NotificationPreferences>,
  conversationId: string,
): Recipient[] {
  return recipients.filter((recipient) => {
    const preference = preferences.get(recipient.uid);
    if (!preference) return true;
    return preference.pushEnabled && !preference.mutedConversationIds.includes(conversationId);
  });
}
