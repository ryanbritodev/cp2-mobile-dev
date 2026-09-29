import { createHash } from 'node:crypto';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

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

const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,heic';

export function isCloudinaryConfigured(): boolean {
  return env.cloudinary !== null;
}

/**
 * Assinatura do Cloudinary: parâmetros ordenados alfabeticamente no formato
 * `chave=valor` unidos por `&`, concatenados ao API secret e passados por SHA-1.
 */
export function signParams(params: Readonly<Record<string, string>>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
}

/** O caminho da imagem é definido pelo servidor — o app não escolhe onde gravar. */
export function publicIdFor(target: UploadTarget, uid: string): string {
  return target.kind === 'user-avatar' ? `chat-firebase/users/${uid}/avatar` : `chat-firebase/groups/${target.groupId}/photo`;
}

/**
 * Gera uma autorização de upload válida por uma hora (limite do Cloudinary) para um
 * único `public_id`. O API secret nunca sai da API.
 */
export function createSignedUpload(publicId: string, now: Date = new Date()): SignedUpload {
  if (!env.cloudinary) throw new HttpError(503, 'Armazenamento de imagens não configurado na API.');
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    invalidate: 'true',
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(Math.floor(now.getTime() / 1000)),
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`,
    apiKey: env.cloudinary.apiKey,
    timestamp: params.timestamp,
    signature: signParams(params, env.cloudinary.apiSecret),
    publicId,
    overwrite: params.overwrite,
    invalidate: params.invalidate,
    allowedFormats: params.allowed_formats,
  };
}
