import { useEffect, useMemo, useState } from 'react';
import { getPublicProfiles } from '../services/userService';
import type { PublicProfile, PublicProfileMap } from '../types/user';

/** Carrega nome/foto dos usuários informados, buscando somente os que ainda não estão em memória. */
export function usePublicProfiles(uids: readonly string[]): PublicProfileMap {
  const [profiles, setProfiles] = useState<PublicProfileMap>({});
  const key = useMemo(() => [...new Set(uids)].sort().join(','), [uids]);

  useEffect(() => {
    const requested = key ? key.split(',') : [];
    const missing = requested.filter((uid) => !(uid in profiles));
    if (missing.length === 0) return undefined;
    let active = true;
    getPublicProfiles(missing)
      .then((loaded) => {
        if (!active) return;
        setProfiles((previous) => {
          const next: Record<string, PublicProfile> = { ...previous };
          loaded.forEach((profile) => {
            next[profile.uid] = profile;
          });
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // `profiles` fica fora das dependências para não refazer a busca a cada resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return profiles;
}
