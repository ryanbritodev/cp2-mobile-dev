import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { AppError } from '../utils/errors';
import { isRecord, readString } from '../utils/guards';
import { requestUploadSignature, type UploadTarget } from './apiClient';

const MAX_IMAGE_SIZE = 512;

export type { UploadTarget };

/** Reduz a imagem para no máximo 512px em JPEG, economizando armazenamento e dados móveis. */
async function compressImage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri).resize({ width: MAX_IMAGE_SIZE });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!result.base64) throw new AppError('Não foi possível processar a imagem selecionada.');
  return result.base64;
}

function encodeForm(fields: Readonly<Record<string, string>>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * Envia a imagem ao Cloudinary com uma autorização assinada pela nossa API (o API
 * secret nunca fica no app) e devolve somente a URL HTTPS final, que é o único dado
 * gravado no Firestore. O Base64 é usado apenas no transporte, nunca nos bancos.
 */
export async function uploadImage(target: UploadTarget, localUri: string): Promise<string> {
  const base64 = await compressImage(localUri);
  const signed = await requestUploadSignature(target);

  const response = await fetch(signed.uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeForm({
      file: `data:image/jpeg;base64,${base64}`,
      api_key: signed.apiKey,
      timestamp: signed.timestamp,
      signature: signed.signature,
      public_id: signed.publicId,
      overwrite: signed.overwrite,
      invalidate: signed.invalidate,
      allowed_formats: signed.allowedFormats,
    }),
  });

  const json: unknown = await response.json().catch(() => null);
  const secureUrl = isRecord(json) ? readString(json, 'secure_url') : '';
  if (!response.ok || !secureUrl.startsWith('https://')) {
    throw new AppError('Não foi possível enviar a imagem. Tente novamente.');
  }
  return secureUrl;
}
