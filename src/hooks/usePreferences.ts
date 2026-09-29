import { useCallback, useEffect, useState } from 'react';
import { setConversationMuted, setPushEnabled, subscribePreferences } from '../services/userService';
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '../types/notification';
import { getErrorMessage } from '../utils/errors';

type UsePreferencesResult = {
  preferences: NotificationPreferences;
  error: string | null;
  togglePush: (enabled: boolean) => Promise<void>;
  toggleMute: (conversationId: string, muted: boolean) => Promise<void>;
};

/** Preferências de notificação do usuário (Firestore), lidas pela API ao calcular destinatários. */
export function usePreferences(uid: string): UsePreferencesResult {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribePreferences(
        uid,
        (next) => {
          setPreferences(next);
          setError(null);
        },
        (subscribeError) => setError(getErrorMessage(subscribeError)),
      ),
    [uid],
  );

  const togglePush = useCallback(
    async (enabled: boolean) => {
      try {
        await setPushEnabled(uid, enabled);
      } catch (updateError) {
        setError(getErrorMessage(updateError, 'Não foi possível salvar a preferência.'));
      }
    },
    [uid],
  );

  const toggleMute = useCallback(
    async (conversationId: string, muted: boolean) => {
      try {
        await setConversationMuted(uid, conversationId, muted);
      } catch (updateError) {
        setError(getErrorMessage(updateError, 'Não foi possível salvar a preferência.'));
      }
    },
    [uid],
  );

  return { preferences, error, togglePush, toggleMute };
}
