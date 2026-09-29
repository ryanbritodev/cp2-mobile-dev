import {
  child,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref,
  serverTimestamp,
  update,
  type DataSnapshot,
} from 'firebase/database';
import { collection, doc, onSnapshot, query, runTransaction, where } from 'firebase/firestore';
import type {
  ChatMessage,
  ConversationType,
  DirectConversation,
  LastMessage,
  MessageDraft,
  MessageRecord,
  MessageTarget,
} from '../types/chat';
import { buildDirectConversationId } from '../utils/conversationId';
import { AppError } from '../utils/errors';
import { isRecord, readNumber, readString, readStringArray } from '../utils/guards';
import { directConversationConverter } from './converters';
import { database, firestore } from './firebase';

export const MESSAGE_MAX_LENGTH = 2000;
const MESSAGE_HISTORY_LIMIT = 200;
const PREVIEW_LENGTH = 120;

const directCollection = collection(firestore, 'directConversations').withConverter(directConversationConverter);

// ---------------------------------------------------------------------------
// Conversas individuais (metadados no Firestore)
// ---------------------------------------------------------------------------

/**
 * Localiza ou cria a conversa individual entre dois usuários. O ID é derivado dos
 * `uid` ordenados e a criação ocorre em transação, garantindo uma única conversa por par.
 */
export async function getOrCreateDirectConversation(currentUid: string, otherUid: string): Promise<DirectConversation> {
  const conversationId = buildDirectConversationId(currentUid, otherUid);
  const conversationRef = doc(directCollection, conversationId);

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (snapshot.exists()) return snapshot.data();
    const participants: [string, string] = currentUid < otherUid ? [currentUid, otherUid] : [otherUid, currentUid];
    const conversation: DirectConversation = {
      id: conversationId,
      type: 'direct',
      participants,
      createdAt: Date.now(),
    };
    transaction.set(conversationRef, conversation);
    return conversation;
  });
}

export function subscribeDirectConversations(
  uid: string,
  onChange: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(directCollection, where('participantIds', 'array-contains', uid)),
    (snapshot) => onChange(snapshot.docs.map((item) => item.data())),
    onError,
  );
}

// ---------------------------------------------------------------------------
// Mensagens (Realtime Database)
// ---------------------------------------------------------------------------

function parseTarget(raw: unknown): MessageTarget {
  if (isRecord(raw) && raw.type === 'member' && typeof raw.memberId === 'string') {
    return { type: 'member', memberId: raw.memberId };
  }
  return { type: 'conversation' };
}

export function parseMessage(id: string, conversationId: string, raw: unknown): ChatMessage | null {
  if (!isRecord(raw)) return null;
  const senderId = readString(raw, 'senderId');
  const text = readString(raw, 'text');
  if (!senderId || !text) return null;
  return {
    id,
    conversationId,
    conversationType: readString(raw, 'conversationType') === 'group' ? 'group' : 'direct',
    senderId,
    text,
    target: parseTarget(raw.target),
    mentionedUserIds: readStringArray(raw, 'mentionedUserIds'),
    createdAt: readNumber(raw, 'createdAt'),
  };
}

function parseLastMessage(raw: unknown): LastMessage | null {
  if (!isRecord(raw)) return null;
  const messageId = readString(raw, 'messageId');
  if (!messageId) return null;
  return {
    messageId,
    senderId: readString(raw, 'senderId'),
    text: readString(raw, 'text'),
    createdAt: readNumber(raw, 'createdAt'),
  };
}

/**
 * Escuta as últimas mensagens da conversa em tempo real. Retorna a função que remove
 * o listener — deve ser chamada ao desmontar a tela ou trocar de conversa.
 */
export function subscribeMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): () => void {
  const messagesQuery = rtdbQuery(
    ref(database, `messages/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(MESSAGE_HISTORY_LIMIT),
  );
  return onValue(
    messagesQuery,
    (snapshot: DataSnapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((item) => {
        const message = item.key ? parseMessage(item.key, conversationId, item.val()) : null;
        if (message) messages.push(message);
        return false;
      });
      onChange(messages);
    },
    onError,
  );
}

export function subscribeLastMessage(
  conversationId: string,
  onChange: (lastMessage: LastMessage | null) => void,
): () => void {
  return onValue(
    ref(database, `lastMessages/${conversationId}`),
    (snapshot) => onChange(parseLastMessage(snapshot.val())),
    () => onChange(null),
  );
}

/** Gera o ID da mensagem antes do envio, permitindo reenviar com o mesmo ID em caso de falha. */
export function createMessageId(conversationId: string): string {
  const key = push(child(ref(database), `messages/${conversationId}`)).key;
  if (!key) throw new AppError('Não foi possível gerar o identificador da mensagem.');
  return key;
}

export type SendMessageParams = {
  conversationId: string;
  conversationType: ConversationType;
  messageId: string;
  senderId: string;
  draft: MessageDraft;
};

/**
 * Persiste a mensagem e a prévia da conversa em uma única escrita atômica (multi-path).
 * `createdAt` usa o horário do servidor, validado pelas regras do Realtime Database.
 */
export async function sendMessage(params: SendMessageParams): Promise<void> {
  const text = params.draft.text.trim();
  if (!text) throw new AppError('Digite uma mensagem.');
  if (text.length > MESSAGE_MAX_LENGTH) throw new AppError(`A mensagem pode ter no máximo ${MESSAGE_MAX_LENGTH} caracteres.`);

  const record: MessageRecord = {
    conversationId: params.conversationId,
    conversationType: params.conversationType,
    senderId: params.senderId,
    text,
    target: params.draft.target,
    mentionedUserIds: [...new Set(params.draft.mentionedUserIds)].filter((id) => id !== params.senderId),
    createdAt: serverTimestamp(),
  };

  await update(ref(database), {
    [`messages/${params.conversationId}/${params.messageId}`]: record,
    [`lastMessages/${params.conversationId}`]: {
      messageId: params.messageId,
      senderId: params.senderId,
      text: text.slice(0, PREVIEW_LENGTH),
      createdAt: serverTimestamp(),
    },
  });
}

/** Observa o estado da conexão com o Firebase (`.info/connected`). */
export function subscribeConnection(onChange: (connected: boolean) => void): () => void {
  return onValue(ref(database, '.info/connected'), (snapshot) => onChange(snapshot.val() === true));
}
