export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type PushProvider = 'fcm' | 'expo';
export type DevicePlatform = 'android' | 'ios';

/** Firestore `users/{uid}/devices/{deviceId}` — legível apenas pelo próprio usuário e pela API. */
export type DeviceRegistration = {
  token: string;
  provider: PushProvider;
  platform: DevicePlatform;
  enabled: boolean;
  updatedAt: number;
};

/** Firestore `users/{uid}/preferences/notifications`. */
export type NotificationPreferences = {
  pushEnabled: boolean;
  mutedConversationIds: string[];
  updatedAt: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  mutedConversationIds: [],
  updatedAt: 0,
};

/** Dados mínimos enviados no payload do push. */
export type PushPayloadData = {
  conversationId: string;
  conversationType: 'direct' | 'group';
};

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export type NotificationRegistrationStatus =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'permission-denied'
  | 'no-token'
  | 'error';

export type PushToken = {
  token: string;
  provider: PushProvider;
  platform: DevicePlatform;
};
