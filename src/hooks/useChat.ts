import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestMessageNotification } from '../services/apiClient';
import { createMessageId, sendMessage, subscribeMessages } from '../services/chatService';
import { resyncGroupMembers } from '../services/groupService';
import type { ChatListItem, ChatMessage, ConversationType, MessageDraft, OutgoingMessage } from '../types/chat';
import { getErrorMessage, isPermissionDenied } from '../utils/errors';

type UseChatParams = {
  conversationId: string;
  conversationType: ConversationType;
  currentUid: string;
};

export type UseChatResult = {
  items: ChatListItem[];
  loading: boolean;
  error: string | null;
  pushWarning: string | null;
  send: (draft: MessageDraft) => void;
  retry: (messageId: string) => void;
  discard: (messageId: string) => void;
  dismissPushWarning: () => void;
};

export function useChat({ conversationId, conversationType, currentUid }: UseChatParams): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState<string | null>(null);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
  const resyncAttempted = useRef(false);

  useEffect(() => {
    resyncAttempted.current = false;
    setMessages([]);
    setOutgoing([]);
    setPushWarning(null);
  }, [conversationId]);

  // Listener em tempo real; removido ao desmontar a tela ou ao trocar de conversa.
  useEffect(() => {
    setLoading(true);
    setError(null);
    return subscribeMessages(
      conversationId,
      (items) => {
        setMessages(items);
        setLoading(false);
        setError(null);
      },
      (subscriptionError) => {
        // Integrante recém-adicionado: pede à API para sincronizar o acesso e tenta de novo uma vez.
        if (conversationType === 'group' && isPermissionDenied(subscriptionError) && !resyncAttempted.current) {
          resyncAttempted.current = true;
          resyncGroupMembers(conversationId).finally(() => setSubscriptionAttempt((value) => value + 1));
          return;
        }
        setLoading(false);
        setError(
          isPermissionDenied(subscriptionError)
            ? 'Você não tem acesso a esta conversa.'
            : getErrorMessage(subscriptionError, 'Não foi possível carregar as mensagens.'),
        );
      },
    );
  }, [conversationId, conversationType, subscriptionAttempt]);

  const deliver = useCallback(
    async (messageId: string, draft: MessageDraft) => {
      setOutgoing((previous) => [
        ...previous.filter((item) => item.id !== messageId),
        { id: messageId, draft, status: 'sending', errorMessage: null, createdAt: Date.now() },
      ]);
      try {
        await sendMessage({ conversationId, conversationType, messageId, senderId: currentUid, draft });
        setOutgoing((previous) => previous.filter((item) => item.id !== messageId));
      } catch (sendError) {
        setOutgoing((previous) =>
          previous.map((item) =>
            item.id === messageId
              ? { ...item, status: 'failed', errorMessage: getErrorMessage(sendError, 'Falha ao enviar.') }
              : item,
          ),
        );
        return;
      }
      // A mensagem já está salva; o push é solicitado à API sem bloquear a conversa.
      try {
        await requestMessageNotification(conversationId, messageId);
        setPushWarning(null);
      } catch (notifyError) {
        setPushWarning(`Mensagem enviada, mas a notificação não foi disparada: ${getErrorMessage(notifyError)}`);
      }
    },
    [conversationId, conversationType, currentUid],
  );

  const send = useCallback(
    (draft: MessageDraft) => {
      try {
        void deliver(createMessageId(conversationId), draft);
      } catch (idError) {
        setError(getErrorMessage(idError));
      }
    },
    [conversationId, deliver],
  );

  const retry = useCallback(
    (messageId: string) => {
      const pending = outgoing.find((item) => item.id === messageId);
      if (pending) void deliver(messageId, pending.draft);
    },
    [deliver, outgoing],
  );

  const discard = useCallback((messageId: string) => {
    setOutgoing((previous) => previous.filter((item) => item.id !== messageId));
  }, []);

  const dismissPushWarning = useCallback(() => setPushWarning(null), []);

  // Mensagens persistidas + pendentes/falhas que ainda não aparecem no banco.
  const items = useMemo<ChatListItem[]>(() => {
    const outgoingById = new Map(outgoing.map((item) => [item.id, item]));
    const persistedIds = new Set(messages.map((message) => message.id));
    const persisted = messages.map((message): ChatListItem => {
      const pending = outgoingById.get(message.id);
      return { message, status: pending?.status ?? 'sent', errorMessage: pending?.errorMessage ?? null };
    });
    const notPersisted = outgoing
      .filter((item) => !persistedIds.has(item.id))
      .map(
        (item): ChatListItem => ({
          message: {
            id: item.id,
            conversationId,
            conversationType,
            senderId: currentUid,
            text: item.draft.text.trim(),
            target: item.draft.target,
            mentionedUserIds: item.draft.mentionedUserIds,
            createdAt: item.createdAt,
          },
          status: item.status,
          errorMessage: item.errorMessage,
        }),
      );
    return [...persisted, ...notPersisted].sort((a, b) => a.message.createdAt - b.message.createdAt);
  }, [messages, outgoing, conversationId, conversationType, currentUid]);

  return { items, loading, error, pushWarning, send, retry, discard, dismissPushWarning };
}
