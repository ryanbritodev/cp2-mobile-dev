import type {
  DeviceTarget,
  DirectConversationRecord,
  GroupRecord,
  MessageTarget,
  NotificationPreferences,
  NotificationPolicy,
  StoredMessage,
  UserProfile,
} from '../types/domain';
import { NOTIFICATION_POLICIES } from '../types/domain';
import { isRecord, readBoolean, readNumber, readString, readStringArray } from '../utils/guards';
import { adminDatabase, adminFirestore } from './firebaseAdmin';

function parsePolicy(value: string): NotificationPolicy {
  return NOTIFICATION_POLICIES.find((policy) => policy === value) ?? 'all_group_messages';
}

function parseTarget(raw: unknown): MessageTarget {
  if (isRecord(raw) && raw.type === 'member' && typeof raw.memberId === 'string') {
    return { type: 'member', memberId: raw.memberId };
  }
  return { type: 'conversation' };
}

// ---------------------------------------------------------------------------
// Realtime Database
// ---------------------------------------------------------------------------

export async function getMessage(conversationId: string, messageId: string): Promise<StoredMessage | null> {
  const snapshot = await adminDatabase().ref(`messages/${conversationId}/${messageId}`).get();
  const raw: unknown = snapshot.val();
  if (!isRecord(raw)) return null;
  const conversationType = readString(raw, 'conversationType');
  return {
    id: messageId,
    conversationId: readString(raw, 'conversationId'),
    conversationType: conversationType === 'group' ? 'group' : 'direct',
    senderId: readString(raw, 'senderId'),
    target: parseTarget(raw.target),
    mentionedUserIds: readStringArray(raw, 'mentionedUserIds'),
    createdAt: readNumber(raw, 'createdAt'),
  };
}

/** Espelha os integrantes do grupo (fonte da verdade: Firestore) no Realtime Database. */
export async function writeConversationMembers(conversationId: string, memberIds: readonly string[] | null): Promise<void> {
  const ref = adminDatabase().ref(`conversationMembers/${conversationId}`);
  if (!memberIds || memberIds.length === 0) {
    await ref.remove();
    return;
  }
  const members: Record<string, true> = {};
  memberIds.forEach((uid) => {
    members[uid] = true;
  });
  await ref.set(members);
}

export async function wasConversationMember(conversationId: string, uid: string): Promise<boolean> {
  const snapshot = await adminDatabase().ref(`conversationMembers/${conversationId}/${uid}`).get();
  return snapshot.val() === true;
}

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

export async function getGroup(groupId: string): Promise<GroupRecord | null> {
  const snapshot = await adminFirestore().collection('groups').doc(groupId).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data) return null;
  return {
    id: snapshot.id,
    name: readString(data, 'name'),
    ownerId: readString(data, 'ownerId'),
    memberIds: readStringArray(data, 'memberIds'),
    memberLimit: readNumber(data, 'memberLimit'),
    notificationPolicy: parsePolicy(readString(data, 'notificationPolicy')),
  };
}

export async function getDirectConversation(conversationId: string): Promise<DirectConversationRecord | null> {
  const snapshot = await adminFirestore().collection('directConversations').doc(conversationId).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data) return null;
  return { id: snapshot.id, participantIds: readStringArray(data, 'participantIds') };
}

export async function getPublicNames(uids: readonly string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (uids.length === 0) return names;
  const firestore = adminFirestore();
  const snapshots = await firestore.getAll(...uids.map((uid) => firestore.collection('publicProfiles').doc(uid)));
  snapshots.forEach((snapshot) => {
    const data = snapshot.data();
    if (data) names.set(snapshot.id, readString(data, 'name', 'Alguém'));
  });
  return names;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await adminFirestore().collection('users').doc(uid).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data) return null;
  return {
    uid,
    name: readString(data, 'name'),
    email: readString(data, 'email'),
    phoneNumber: readString(data, 'phoneNumber'),
    birthDate: readString(data, 'birthDate'),
    photoUrl: readString(data, 'photoUrl'),
    createdAt: readNumber(data, 'createdAt'),
  };
}

export async function findGroupsOfUser(uid: string): Promise<GroupRecord[]> {
  const snapshot = await adminFirestore().collection('groups').where('memberIds', 'array-contains', uid).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: readString(data, 'name'),
      ownerId: readString(data, 'ownerId'),
      memberIds: readStringArray(data, 'memberIds'),
      memberLimit: readNumber(data, 'memberLimit'),
      notificationPolicy: parsePolicy(readString(data, 'notificationPolicy')),
    };
  });
}

export async function getPreferences(uids: readonly string[]): Promise<Map<string, NotificationPreferences>> {
  const preferences = new Map<string, NotificationPreferences>();
  if (uids.length === 0) return preferences;
  const firestore = adminFirestore();
  const snapshots = await firestore.getAll(
    ...uids.map((uid) => firestore.collection('users').doc(uid).collection('preferences').doc('notifications')),
  );
  snapshots.forEach((snapshot, index) => {
    const data = snapshot.data();
    const uid = uids[index];
    if (!uid) return;
    preferences.set(uid, {
      pushEnabled: data ? readBoolean(data, 'pushEnabled', true) : true,
      mutedConversationIds: data ? readStringArray(data, 'mutedConversationIds') : [],
    });
  });
  return preferences;
}

/** Tokens ativos dos destinatários (subcoleção privada `users/{uid}/devices`). */
export async function getActiveDevices(uids: readonly string[]): Promise<DeviceTarget[]> {
  const firestore = adminFirestore();
  const results = await Promise.all(
    uids.map((uid) => firestore.collection('users').doc(uid).collection('devices').where('enabled', '==', true).get()),
  );
  return results.flatMap((snapshot, index) =>
    snapshot.docs
      .map((doc): DeviceTarget | null => {
        const data = doc.data();
        const token = readString(data, 'token');
        const uid = uids[index];
        if (!token || !uid) return null;
        return { uid, deviceId: doc.id, token, provider: readString(data, 'provider') === 'expo' ? 'expo' : 'fcm' };
      })
      .filter((device): device is DeviceTarget => device !== null),
  );
}

/** Desativa tokens rejeitados pelo FCM/Expo para não tentar reenviar a eles. */
export async function disableDevices(devices: readonly DeviceTarget[], reason: string): Promise<void> {
  if (devices.length === 0) return;
  const firestore = adminFirestore();
  const batch = firestore.batch();
  devices.forEach((device) => {
    batch.set(
      firestore.collection('users').doc(device.uid).collection('devices').doc(device.deviceId),
      { enabled: false, disabledReason: reason, updatedAt: Date.now() },
      { merge: true },
    );
  });
  await batch.commit();
}
