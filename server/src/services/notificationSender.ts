import type { Message } from 'firebase-admin/messaging';
import { env } from '../config/env';
import type { ConversationType, DeviceTarget } from '../types/domain';
import { isRecord } from '../utils/guards';
import { adminMessaging } from './firebaseAdmin';
import type { RecipientReason } from './recipientResolver';

const ANDROID_CHANNEL_ID = 'messages';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_CHUNK_SIZE = 100;
const FCM_CHUNK_SIZE = 500;

const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export type NotificationContent = { title: string; body: string };

export type PushPayload = {
  conversationId: string;
  conversationType: ConversationType;
};

export type OutgoingPush = {
  device: DeviceTarget;
  content: NotificationContent;
};

export type SendReport = {
  delivered: number;
  failed: number;
  invalidDevices: DeviceTarget[];
};

/**
 * Texto do push sem o conteúdo da mensagem, para não expor informações sensíveis
 * na tela de bloqueio.
 */
export function buildContent(params: {
  conversationType: ConversationType;
  reason: RecipientReason;
  senderName: string;
  groupName: string | null;
}): NotificationContent {
  if (params.conversationType === 'direct') {
    return { title: params.senderName, body: 'Enviou uma nova mensagem para você.' };
  }
  const title = params.groupName ?? 'Grupo';
  return params.reason === 'mention'
    ? { title, body: `${params.senderName} mencionou você.` }
    : { title, body: `Nova mensagem de ${params.senderName}.` };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

/** Android: envio direto pelo Firebase Cloud Messaging com o Admin SDK. */
async function sendViaFcm(pushes: readonly OutgoingPush[], payload: PushPayload): Promise<SendReport> {
  const report: SendReport = { delivered: 0, failed: 0, invalidDevices: [] };
  for (const group of chunk(pushes, FCM_CHUNK_SIZE)) {
    const messages: Message[] = group.map(({ device, content }) => ({
      token: device.token,
      notification: { title: content.title, body: content.body },
      data: { conversationId: payload.conversationId, conversationType: payload.conversationType },
      android: {
        priority: 'high',
        notification: { channelId: ANDROID_CHANNEL_ID, tag: payload.conversationId, sound: 'default' },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    }));
    const response = await adminMessaging().sendEach(messages);
    response.responses.forEach((result, index) => {
      const device = group[index]?.device;
      if (!device) return;
      if (result.success) {
        report.delivered += 1;
        return;
      }
      report.failed += 1;
      if (result.error && INVALID_FCM_CODES.has(result.error.code)) report.invalidDevices.push(device);
    });
  }
  return report;
}

/** iOS: Expo Push Service (entrega via APNs) usando o token Expo do aparelho. */
async function sendViaExpo(pushes: readonly OutgoingPush[], payload: PushPayload): Promise<SendReport> {
  const report: SendReport = { delivered: 0, failed: 0, invalidDevices: [] };
  for (const group of chunk(pushes, EXPO_CHUNK_SIZE)) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (env.expoAccessToken) headers.Authorization = `Bearer ${env.expoAccessToken}`;
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(
        group.map(({ device, content }) => ({
          to: device.token,
          title: content.title,
          body: content.body,
          data: payload,
          sound: 'default',
          priority: 'high',
          channelId: ANDROID_CHANNEL_ID,
        })),
      ),
    });
    const json: unknown = await response.json().catch(() => null);
    const tickets: unknown[] = isRecord(json) && Array.isArray(json.data) ? json.data : [];
    group.forEach(({ device }, index) => {
      const ticket = tickets[index];
      if (isRecord(ticket) && ticket.status === 'ok') {
        report.delivered += 1;
        return;
      }
      report.failed += 1;
      const details = isRecord(ticket) && isRecord(ticket.details) ? ticket.details : null;
      if (details?.error === 'DeviceNotRegistered') report.invalidDevices.push(device);
    });
  }
  return report;
}

export async function sendPushes(pushes: readonly OutgoingPush[], payload: PushPayload): Promise<SendReport> {
  const fcm = pushes.filter((push) => push.device.provider === 'fcm');
  const expo = pushes.filter((push) => push.device.provider === 'expo');
  const reports = await Promise.all([
    fcm.length > 0 ? sendViaFcm(fcm, payload) : null,
    expo.length > 0 ? sendViaExpo(expo, payload) : null,
  ]);
  return reports.reduce<SendReport>(
    (total, report) =>
      report
        ? {
            delivered: total.delivered + report.delivered,
            failed: total.failed + report.failed,
            invalidDevices: [...total.invalidDevices, ...report.invalidDevices],
          }
        : total,
    { delivered: 0, failed: 0, invalidDevices: [] },
  );
}
