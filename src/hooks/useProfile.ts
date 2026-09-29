import { useCallback, useEffect, useState } from 'react';
import { getProfile } from '../services/userService';
import type { ChatUser } from '../types/user';
import { ApiError, getErrorMessage } from '../utils/errors';

type UseProfileResult = {
  profile: ChatUser | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useProfile(uid: string, currentUser: ChatUser): UseProfileResult {
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getProfile(uid, currentUser)
      .then((loaded) => {
        if (active) setProfile(loaded);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setProfile(null);
        setError(
          loadError instanceof ApiError && loadError.status === 403
            ? 'Você só pode ver o perfil de pessoas com quem compartilha uma conversa ou grupo.'
            : getErrorMessage(loadError, 'Não foi possível carregar o perfil.'),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid, currentUser, reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);
  return { profile, loading, error, reload };
}
