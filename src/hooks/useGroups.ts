import { useEffect, useState } from 'react';
import { subscribeGroup, subscribeUserGroups } from '../services/groupService';
import type { ChatGroup } from '../types/group';
import { getErrorMessage } from '../utils/errors';

type AsyncState<T> = { data: T; loading: boolean; error: string | null };

/** Grupos dos quais o usuário participa, atualizados em tempo real. */
export function useUserGroups(uid: string): AsyncState<ChatGroup[]> {
  const [state, setState] = useState<AsyncState<ChatGroup[]>>({ data: [], loading: true, error: null });

  useEffect(() => {
    setState({ data: [], loading: true, error: null });
    return subscribeUserGroups(
      uid,
      (groups) => setState({ data: groups, loading: false, error: null }),
      (error) => setState((previous) => ({ ...previous, loading: false, error: getErrorMessage(error) })),
    );
  }, [uid]);

  return state;
}

/** Um grupo específico; `data` fica `null` se o grupo não existir ou o usuário perder o acesso. */
export function useGroup(groupId: string | undefined): AsyncState<ChatGroup | null> {
  const [state, setState] = useState<AsyncState<ChatGroup | null>>({ data: null, loading: Boolean(groupId), error: null });

  useEffect(() => {
    if (!groupId) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    setState({ data: null, loading: true, error: null });
    return subscribeGroup(
      groupId,
      (group) => setState({ data: group, loading: false, error: group ? null : 'Grupo não encontrado.' }),
      (error) =>
        setState({
          data: null,
          loading: false,
          error: getErrorMessage(error, 'Você não participa mais deste grupo.'),
        }),
    );
  }, [groupId]);

  return state;
}
