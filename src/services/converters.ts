import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase/firestore';
import type { DirectConversation, DirectConversationDocument } from '../types/chat';
import type { ChatGroup, GroupDocument } from '../types/group';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_POLICIES,
  type DeviceRegistration,
  type NotificationPolicy,
  type NotificationPreferences,
} from '../types/notification';
import type { ChatUser, ChatUserDocument, PublicProfile, PublicProfileDocument } from '../types/user';
import { readBoolean, readNumber, readString, readStringArray } from '../utils/guards';

function isNotificationPolicy(value: string): value is NotificationPolicy {
  return NOTIFICATION_POLICIES.some((policy) => policy === value);
}

function omitId<T extends { id: string }>(model: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = model;
  return rest;
}

export const userConverter: FirestoreDataConverter<ChatUser, ChatUserDocument> = {
  toFirestore: (user: ChatUser): ChatUserDocument => {
    const { uid: _uid, ...rest } = user;
    return rest;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>): ChatUser => {
    const data = snapshot.data();
    return {
      uid: snapshot.id,
      name: readString(data, 'name'),
      email: readString(data, 'email'),
      phoneNumber: readString(data, 'phoneNumber'),
      birthDate: readString(data, 'birthDate'),
      photoUrl: readString(data, 'photoUrl'),
      createdAt: readNumber(data, 'createdAt'),
    };
  },
};

export const publicProfileConverter: FirestoreDataConverter<PublicProfile, PublicProfileDocument> = {
  toFirestore: (profile: PublicProfile): PublicProfileDocument => {
    const { uid: _uid, ...rest } = profile;
    return rest;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>): PublicProfile => {
    const data = snapshot.data();
    const name = readString(data, 'name');
    return {
      uid: snapshot.id,
      name,
      nameLower: readString(data, 'nameLower', name.toLowerCase()),
      photoUrl: readString(data, 'photoUrl'),
      updatedAt: readNumber(data, 'updatedAt'),
    };
  },
};

export const groupConverter: FirestoreDataConverter<ChatGroup, GroupDocument> = {
  toFirestore: (group: ChatGroup): GroupDocument => omitId(group),
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>): ChatGroup => {
    const data = snapshot.data();
    const policy = readString(data, 'notificationPolicy');
    return {
      id: snapshot.id,
      name: readString(data, 'name'),
      photoUrl: readString(data, 'photoUrl'),
      ownerId: readString(data, 'ownerId'),
      memberIds: readStringArray(data, 'memberIds'),
      memberLimit: readNumber(data, 'memberLimit'),
      notificationPolicy: isNotificationPolicy(policy) ? policy : 'all_group_messages',
      createdAt: readNumber(data, 'createdAt'),
      updatedAt: readNumber(data, 'updatedAt'),
    };
  },
};

export const directConversationConverter: FirestoreDataConverter<DirectConversation, DirectConversationDocument> = {
  toFirestore: (conversation: DirectConversation): DirectConversationDocument => ({
    participantIds: [...conversation.participants],
    createdAt: conversation.createdAt,
  }),
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>): DirectConversation => {
    const data = snapshot.data();
    const [first = '', second = ''] = readStringArray(data, 'participantIds');
    return {
      id: snapshot.id,
      type: 'direct',
      participants: [first, second],
      createdAt: readNumber(data, 'createdAt'),
    };
  },
};

export const preferencesConverter: FirestoreDataConverter<NotificationPreferences, NotificationPreferences> = {
  toFirestore: (preferences: NotificationPreferences): NotificationPreferences => preferences,
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>): NotificationPreferences => {
    const data = snapshot.data();
    return {
      pushEnabled: readBoolean(data, 'pushEnabled', DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled),
      mutedConversationIds: readStringArray(data, 'mutedConversationIds'),
      updatedAt: readNumber(data, 'updatedAt'),
    };
  },
};

export const deviceConverter: FirestoreDataConverter<DeviceRegistration, DeviceRegistration> = {
  toFirestore: (device: DeviceRegistration): DeviceRegistration => device,
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>): DeviceRegistration => {
    const data = snapshot.data();
    return {
      token: readString(data, 'token'),
      provider: readString(data, 'provider') === 'expo' ? 'expo' : 'fcm',
      platform: readString(data, 'platform') === 'ios' ? 'ios' : 'android',
      enabled: readBoolean(data, 'enabled', false),
      updatedAt: readNumber(data, 'updatedAt'),
    };
  },
};
