import { useCallback, useEffect, useMemo, useState } from 'react';
import { listPublicProfiles } from '../services/userService';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';

type UseUsersResult = {
  users: PublicProfile[];
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** Lista de usuários cadastrados com filtro por nome, sempre excluindo o próprio usuário. */
export function useUsers(currentUid: string): UseUsersResult {
  const [allUsers, setAllUsers] = useState<PublicProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listPublicProfiles()
      .then((users) => {
        if (active) setAllUsers(users);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError, 'Não foi possível carregar os usuários.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const users = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allUsers.filter((user) => user.uid !== currentUid && (!term || user.nameLower.includes(term)));
  }, [allUsers, currentUid, search]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  return { users, search, setSearch, loading, error, reload };
}
