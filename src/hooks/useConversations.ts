import { useEffect, useMemo, useState } from 'react';
import { subscribeDirectConversations, subscribeLastMessage } from '../services/chatService';
import type { ConversationSummary, DirectConversation, LastMessage } from '../types/chat';
import { getErrorMessage } from '../utils/errors';
import { useUserGroups } from './useGroups';
import { usePublicProfiles } from './usePublicProfiles';

type ConversationsState = {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
};

/**
 * Junta conversas individuais e grupos (Firestore) com a última mensagem de cada
 * uma (Realtime Database), ordenando pela atividade mais recente.
 */
export function useConversations(uid: string): ConversationsState {
  const groups = useUserGroups(uid);
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [directsLoading, setDirectsLoading] = useState(true);
  const [directsError, setDirectsError] = useState<string | null>(null);
  const [lastMessages, setLastMessages] = useState<Readonly<Record<string, LastMessage | null>>>({});

  useEffect(() => {
    setDirectsLoading(true);
    return subscribeDirectConversations(
      uid,
      (items) => {
        setDirects(items);
        setDirectsLoading(false);
        setDirectsError(null);
      },
      (error) => {
        setDirectsLoading(false);
        setDirectsError(getErrorMessage(error));
      },
    );
  }, [uid]);

  const otherUserIds = useMemo(
    () => directs.map((conversation) => conversation.participants.find((id) => id !== uid) ?? ''),
    [directs, uid],
  );
  const profiles = usePublicProfiles(otherUserIds);

  const conversationIdsKey = useMemo(
    () => [...directs.map((item) => item.id), ...groups.data.map((item) => item.id)].sort().join(','),
    [directs, groups.data],
  );

  // Um listener de prévia por conversa; todos são removidos quando a lista muda.
  useEffect(() => {
    const ids = conversationIdsKey ? conversationIdsKey.split(',') : [];
    const unsubscribers = ids.map((conversationId) =>
      subscribeLastMessage(conversationId, (lastMessage) =>
        setLastMessages((previous) => ({ ...previous, [conversationId]: lastMessage })),
      ),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [conversationIdsKey]);

  const conversations = useMemo<ConversationSummary[]>(() => {
    const directSummaries = directs.map((conversation): ConversationSummary => {
      const otherUserId = conversation.participants.find((id) => id !== uid) ?? '';
      const profile = profiles[otherUserId];
      const lastMessage = lastMessages[conversation.id] ?? null;
      return {
        id: conversation.id,
        type: 'direct',
        title: profile?.name ?? 'Usuário',
        photoUrl: profile?.photoUrl ?? '',
        otherUserId,
        memberCount: 2,
        lastMessage,
        sortTimestamp: lastMessage?.createdAt ?? conversation.createdAt,
      };
    });
    const groupSummaries = groups.data.map((group): ConversationSummary => {
      const lastMessage = lastMessages[group.id] ?? null;
      return {
        id: group.id,
        type: 'group',
        title: group.name,
        photoUrl: group.photoUrl,
        otherUserId: null,
        memberCount: group.memberIds.length,
        lastMessage,
        sortTimestamp: Math.max(lastMessage?.createdAt ?? 0, group.updatedAt),
      };
    });
    return [...directSummaries, ...groupSummaries].sort((a, b) => b.sortTimestamp - a.sortTimestamp);
  }, [directs, groups.data, lastMessages, profiles, uid]);

  return {
    conversations,
    loading: directsLoading || groups.loading,
    error: directsError ?? groups.error,
  };
}
