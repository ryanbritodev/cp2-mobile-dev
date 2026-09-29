import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { env } from '../config/env';
import type { PermissionState, PushPayloadData, PushToken } from '../types/notification';
import { AppError } from '../utils/errors';
import { isRecord } from '../utils/guards';
import { deviceConverter } from './converters';
import { firestore } from './firebase';

export const MESSAGES_CHANNEL_ID = 'messages';
const DEVICE_ID_STORAGE_KEY = '@chat-firebase/device-id';

// Exibe o banner mesmo com o app em primeiro plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL_ID, {
    name: 'Mensagens',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
  });
}

function toPermissionState(status: Notifications.PermissionStatus): PermissionState {
  if (status === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (status === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function getPermissionState(): Promise<PermissionState> {
  const permissions = await Notifications.getPermissionsAsync();
  return toPermissionState(permissions.status);
}

/** Solicita permissão (o canal Android precisa existir antes, no Android 13+). */
export async function requestPermission(): Promise<PermissionState> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (!current.canAskAgain) return 'denied';
  const requested = await Notifications.requestPermissionsAsync();
  return toPermissionState(requested.status);
}

/**
 * Obtém o token de push do dispositivo:
 * - Android: token nativo do Firebase Cloud Messaging (enviado pela API com o Admin SDK);
 * - iOS: token do Expo Push Service (que entrega via APNs).
 * Retorna `null` em emuladores/simuladores, que não possuem token.
 */
export async function getPushToken(): Promise<PushToken | null> {
  if (!Device.isDevice) return null;
  await ensureAndroidChannel();

  if (Platform.OS === 'android') {
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    return typeof deviceToken.data === 'string'
      ? { token: deviceToken.data, provider: 'fcm', platform: 'android' }
      : null;
  }
  if (Platform.OS === 'ios') {
    if (!env.easProjectId) throw new AppError('EXPO_PUBLIC_EAS_PROJECT_ID não configurado.');
    const expoToken = await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId });
    return { token: expoToken.data, provider: 'expo', platform: 'ios' };
  }
  return null;
}

/** Identificador estável deste aparelho, usado como ID do documento em `devices`. */
export async function getDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (stored) return stored;
  const created = randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
  return created;
}

export async function registerDevice(uid: string, pushToken: PushToken): Promise<void> {
  const deviceId = await getDeviceId();
  await setDoc(doc(firestore, 'users', uid, 'devices', deviceId).withConverter(deviceConverter), {
    token: pushToken.token,
    provider: pushToken.provider,
    platform: pushToken.platform,
    enabled: true,
    updatedAt: Date.now(),
  });
}

/** Remove o token no logout para que o usuário anterior não receba pushes neste aparelho. */
export async function unregisterDevice(uid: string): Promise<void> {
  const deviceId = await getDeviceId();
  await deleteDoc(doc(firestore, 'users', uid, 'devices', deviceId));
}

/** Atualiza o documento do dispositivo sempre que o sistema renovar o token. */
export function addTokenRefreshListener(uid: string, onError: (error: unknown) => void): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    getPushToken()
      .then((token) => (token ? registerDevice(uid, token) : undefined))
      .catch(onError);
  });
  return () => subscription.remove();
}

function toPayload(source: unknown): PushPayloadData | null {
  if (!isRecord(source)) return null;
  const { conversationId, conversationType } = source;
  if (typeof conversationId !== 'string' || !conversationId) return null;
  if (conversationType !== 'direct' && conversationType !== 'group') return null;
  return { conversationId, conversationType };
}

/** Extrai `conversationId`/`conversationType` do payload, qualquer que seja o provedor. */
export function extractPayload(response: Notifications.NotificationResponse): PushPayloadData | null {
  const { request } = response.notification;
  const fromContent = toPayload(request.content.data);
  if (fromContent) return fromContent;
  const trigger: unknown = request.trigger;
  if (isRecord(trigger) && isRecord(trigger.remoteMessage)) return toPayload(trigger.remoteMessage.data);
  return null;
}

export function addNotificationTapListener(onTap: (payload: PushPayloadData) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const payload = extractPayload(response);
    if (payload) onTap(payload);
  });
  return () => subscription.remove();
}

/** Notificação que abriu o app a partir do estado fechado. */
export async function consumeInitialNotification(): Promise<PushPayloadData | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  await Notifications.clearLastNotificationResponseAsync();
  return extractPayload(response);
}
