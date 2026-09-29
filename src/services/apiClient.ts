import { env, isApiConfigured } from '../config/env';
import type { ChatUser } from '../types/user';
import { ApiError } from '../utils/errors';
import { isRecord, readNumber, readString } from '../utils/guards';
import { auth } from './firebase';

// Hospedagens gratuitas podem levar alguns segundos para "acordar" a API.
const REQUEST_TIMEOUT_MS = 45_000;

type HttpMethod = 'GET' | 'POST';

async function request(method: HttpMethod, path: string, body?: Record<string, string>): Promise<unknown> {
  if (!isApiConfigured) throw new ApiError(0, 'A URL da API não foi configurada.');
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'Sessão expirada.');

  // O ID Token do Firebase Authentication é validado pela API com o Admin SDK.
  const idToken = await user.getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = isRecord(json) ? readString(json, 'error', 'Erro na API.') : 'Erro na API.';
      throw new ApiError(response.status, message);
    }
    return json;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Não foi possível contatar o servidor.');
  } finally {
    clearTimeout(timeout);
  }
}

export type NotifyResult = {
  status: 'sent' | 'duplicate' | 'skipped';
  recipients: number;
};

/** Solicita à API o envio do push de uma mensagem já persistida no Realtime Database. */
export async function requestMessageNotification(conversationId: string, messageId: string): Promise<NotifyResult> {
  const json = await request('POST', '/notifications/messages', { conversationId, messageId });
  const data = isRecord(json) ? json : {};
  const status = readString(data, 'status');
  return {
    status: status === 'duplicate' || status === 'skipped' ? status : 'sent',
    recipients: readNumber(data, 'recipients'),
  };
}

/** Pede à API que espelhe os integrantes do grupo (Firestore) no Realtime Database. */
export async function syncGroupMembers(groupId: string): Promise<void> {
  await request('POST', `/groups/${encodeURIComponent(groupId)}/sync-members`);
}

/**
 * Busca o perfil completo de outro usuário. A API só devolve os dados se os dois
 * compartilharem uma conversa individual ou um grupo.
 */
export async function fetchSharedProfile(uid: string): Promise<ChatUser> {
  const json = await request('GET', `/profiles/${encodeURIComponent(uid)}`);
  if (!isRecord(json) || !isRecord(json.profile)) throw new ApiError(500, 'Resposta inválida da API.');
  const profile = json.profile;
  return {
    uid: readString(profile, 'uid', uid),
    name: readString(profile, 'name'),
    email: readString(profile, 'email'),
    phoneNumber: readString(profile, 'phoneNumber'),
    birthDate: readString(profile, 'birthDate'),
    photoUrl: readString(profile, 'photoUrl'),
    createdAt: readNumber(profile, 'createdAt'),
  };
}

export type UploadTarget = { kind: 'user-avatar' } | { kind: 'group-photo'; groupId: string };

export type SignedUpload = {
  uploadUrl: string;
  apiKey: string;
  timestamp: string;
  signature: string;
  publicId: string;
  overwrite: string;
  invalidate: string;
  allowedFormats: string;
};

/** Pede à API uma autorização assinada para enviar UMA imagem ao Cloudinary. */
export async function requestUploadSignature(target: UploadTarget): Promise<SignedUpload> {
  const body: Record<string, string> =
    target.kind === 'group-photo' ? { kind: target.kind, groupId: target.groupId } : { kind: target.kind };
  const json = await request('POST', '/uploads/signature', body);
  if (!isRecord(json)) throw new ApiError(500, 'Resposta inválida da API.');
  const signed: SignedUpload = {
    uploadUrl: readString(json, 'uploadUrl'),
    apiKey: readString(json, 'apiKey'),
    timestamp: readString(json, 'timestamp'),
    signature: readString(json, 'signature'),
    publicId: readString(json, 'publicId'),
    overwrite: readString(json, 'overwrite'),
    invalidate: readString(json, 'invalidate'),
    allowedFormats: readString(json, 'allowedFormats'),
  };
  if (!signed.uploadUrl.startsWith('https://') || !signed.signature) throw new ApiError(500, 'Resposta inválida da API.');
  return signed;
}

/** Acorda a API hospedada (health check público) sem bloquear a interface. */
export function warmUpApi(): void {
  if (!isApiConfigured) return;
  fetch(`${env.apiUrl}/health`).catch(() => undefined);
}
