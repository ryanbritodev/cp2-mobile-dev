export type NotificationPolicy = 'all_group_messages' | 'mentioned_members' | 'direct_messages_only' | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type ConversationType = 'direct' | 'group';

export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

/** Mensagem lida do Realtime Database. */
export type StoredMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type GroupRecord = {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export type DirectConversationRecord = {
  id: string;
  participantIds: string[];
};

/** Configuração efetiva de notificação de uma conversa (derivada do Firestore). */
export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type NotificationPreferences = {
  pushEnabled: boolean;
  mutedConversationIds: string[];
};

export type PushProvider = 'fcm' | 'expo';

export type DeviceTarget = {
  uid: string;
  deviceId: string;
  token: string;
  provider: PushProvider;
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};
