import Constants from 'expo-constants';
import { isRecord } from '../utils/guards';

function readEasProjectId(): string | null {
  const extra: unknown = Constants.expoConfig?.extra;
  if (!isRecord(extra) || !isRecord(extra.eas)) return null;
  const projectId = extra.eas.projectId;
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null;
}

export const env = {
  /** URL pública da API de notificações (sem barra final). */
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
  easProjectId: readEasProjectId() ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? null,
} as const;

export const isApiConfigured = env.apiUrl.startsWith('https://') || env.apiUrl.startsWith('http://');
