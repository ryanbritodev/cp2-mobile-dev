import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { NotificationPreferences } from '../types/notification';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types/notification';
import type { ChatUser, PublicProfile } from '../types/user';
import { fetchSharedProfile } from './apiClient';
import { preferencesConverter, publicProfileConverter, userConverter } from './converters';
import { firestore } from './firebase';

const USERS_PAGE_SIZE = 300;
// Limite do operador `in` do Firestore.
const IN_QUERY_CHUNK = 30;

const publicProfilesCollection = collection(firestore, 'publicProfiles').withConverter(publicProfileConverter);

function preferencesRef(uid: string) {
  return doc(firestore, 'users', uid, 'preferences', 'notifications').withConverter(preferencesConverter);
}

/** Observa o perfil completo do próprio usuário autenticado. */
export function subscribeOwnProfile(
  uid: string,
  onChange: (profile: ChatUser | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(firestore, 'users', uid).withConverter(userConverter),
    (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}

/** Lista os usuários cadastrados (somente nome e foto, que são dados públicos). */
export async function listPublicProfiles(): Promise<PublicProfile[]> {
  const snapshot = await getDocs(query(publicProfilesCollection, orderBy('nameLower'), limit(USERS_PAGE_SIZE)));
  return snapshot.docs.map((item) => item.data());
}

export async function getPublicProfiles(uids: readonly string[]): Promise<PublicProfile[]> {
  const unique = [...new Set(uids)].filter(Boolean);
  const chunks: string[][] = [];
  for (let index = 0; index < unique.length; index += IN_QUERY_CHUNK) {
    chunks.push(unique.slice(index, index + IN_QUERY_CHUNK));
  }
  const results = await Promise.all(
    chunks.map((chunk) => getDocs(query(publicProfilesCollection, where(documentId(), 'in', chunk)))),
  );
  return results.flatMap((snapshot) => snapshot.docs.map((item) => item.data()));
}

/**
 * Perfil completo com dados cadastrais. Para outros usuários a consulta passa pela API,
 * que confirma se existe conversa individual ou grupo em comum antes de responder.
 */
export async function getProfile(uid: string, currentUser: ChatUser): Promise<ChatUser> {
  if (uid === currentUser.uid) return currentUser;
  return fetchSharedProfile(uid);
}

export function subscribePreferences(
  uid: string,
  onChange: (preferences: NotificationPreferences) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    preferencesRef(uid),
    (snapshot) => onChange(snapshot.exists() ? snapshot.data() : DEFAULT_NOTIFICATION_PREFERENCES),
    onError,
  );
}

export async function setPushEnabled(uid: string, pushEnabled: boolean): Promise<void> {
  await setDoc(doc(firestore, 'users', uid, 'preferences', 'notifications'), { pushEnabled, updatedAt: Date.now() }, { merge: true });
}

export async function setConversationMuted(uid: string, conversationId: string, muted: boolean): Promise<void> {
  await setDoc(
    doc(firestore, 'users', uid, 'preferences', 'notifications'),
    {
      mutedConversationIds: muted ? arrayUnion(conversationId) : arrayRemove(conversationId),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}
