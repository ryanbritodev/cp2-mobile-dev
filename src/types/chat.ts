export type ConversationType = 'direct' | 'group';

export type DirectConversation = {
  id: string;
  type: 'direct';
  participants: [string, string];
  createdAt: number;
};

/** Firestore `directConversations/{conversationId}`. */
export type DirectConversationDocument = {
  participantIds: string[];
  createdAt: number;
};

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

/** Formato gravado no Realtime Database em `messages/{conversationId}/{messageId}`. */
export type MessageRecord = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: object | number;
};

/** Realtime Database `lastMessages/{conversationId}` — prévia para a lista de conversas. */
export type LastMessage = {
  messageId: string;
  senderId: string;
  text: string;
  createdAt: number;
};

export type MessageDraft = {
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

export type OutgoingMessage = {
  id: string;
  draft: MessageDraft;
  status: 'sending' | 'failed';
  errorMessage: string | null;
  createdAt: number;
};

export type ConversationSummary = {
  id: string;
  type: ConversationType;
  title: string;
  photoUrl: string;
  /** Para conversas diretas: uid do outro participante. */
  otherUserId: string | null;
  memberCount: number;
  lastMessage: LastMessage | null;
  sortTimestamp: number;
};

export type DeliveryStatus = 'sent' | 'sending' | 'failed';

/** Item exibido na tela de chat: mensagem persistida ou pendente de envio. */
export type ChatListItem = {
  message: ChatMessage;
  status: DeliveryStatus;
  errorMessage: string | null;
};
