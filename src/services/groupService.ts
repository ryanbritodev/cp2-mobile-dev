import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type UpdateData,
} from 'firebase/firestore';
import type { ChatGroup, CreateGroupInput, GroupDocument, GroupMutationResult, UpdateGroupInput } from '../types/group';
import type { NotificationPolicy } from '../types/notification';
import { AppError, getErrorMessage } from '../utils/errors';
import {
  applyMemberChanges,
  GROUP_NAME_MAX_LENGTH,
  GroupFullError,
  MIN_GROUP_MEMBERS,
  validateMemberLimit,
} from '../utils/groupValidation';
import { syncGroupMembers } from './apiClient';
import { groupConverter } from './converters';
import { firestore } from './firebase';
import { uploadImage } from './storageService';

const groupsCollection = collection(firestore, 'groups').withConverter(groupConverter);

function groupRef(groupId: string) {
  return doc(groupsCollection, groupId);
}

function assertOwner(group: ChatGroup, uid: string): void {
  if (group.ownerId !== uid) throw new AppError('Somente o proprietário pode gerenciar o grupo.');
}

function assertValidName(name: string): void {
  if (!name) throw new AppError('Informe o nome do grupo.');
  if (name.length > GROUP_NAME_MAX_LENGTH) throw new AppError(`Use no máximo ${GROUP_NAME_MAX_LENGTH} caracteres.`);
}

function assertValidCapacity(memberCount: number, memberLimit: number): void {
  if (memberCount > memberLimit) throw new GroupFullError(memberLimit);
  const limitError = validateMemberLimit(memberLimit, memberCount);
  if (limitError) throw new AppError(limitError);
  if (memberCount < MIN_GROUP_MEMBERS) throw new AppError('O grupo precisa ter pelo menos dois integrantes.');
}

/** Sincroniza os integrantes no Realtime Database via API; falhas viram aviso não bloqueante. */
async function syncMembersSafely(groupId: string): Promise<string | null> {
  try {
    await syncGroupMembers(groupId);
    return null;
  } catch (error) {
    return `Grupo salvo, mas o acesso às mensagens ainda não foi sincronizado (${getErrorMessage(error)}).`;
  }
}

export function subscribeUserGroups(
  uid: string,
  onChange: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(groupsCollection, where('memberIds', 'array-contains', uid)),
    (snapshot) => onChange(snapshot.docs.map((item) => item.data())),
    onError,
  );
}

export function subscribeGroup(
  groupId: string,
  onChange: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(groupRef(groupId), (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null), onError);
}

export async function createGroup(ownerId: string, input: CreateGroupInput): Promise<GroupMutationResult> {
  const name = input.name.trim();
  const memberIds = [ownerId, ...input.memberIds.filter((id) => id !== ownerId)];
  const uniqueMemberIds = [...new Set(memberIds)];
  assertValidName(name);
  assertValidCapacity(uniqueMemberIds.length, input.memberLimit);

  const ref = doc(groupsCollection);
  const now = Date.now();
  await setDoc(ref, {
    id: ref.id,
    name,
    photoUrl: '',
    ownerId,
    memberIds: uniqueMemberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  });

  const warnings: string[] = [];
  if (input.photoUri) {
    try {
      const photoUrl = await uploadImage({ kind: 'group-photo', groupId: ref.id }, input.photoUri);
      await updateDoc(ref, { photoUrl, updatedAt: Date.now() });
    } catch {
      warnings.push('Não foi possível enviar a foto do grupo.');
    }
  }
  const syncWarning = await syncMembersSafely(ref.id);
  if (syncWarning) warnings.push(syncWarning);

  return { groupId: ref.id, warning: warnings.length > 0 ? warnings.join('\n') : null };
}

/**
 * Atualiza o grupo dentro de uma transação: o documento é relido no servidor e as
 * alterações de integrantes são aplicadas como diferença sobre o estado mais recente.
 * Assim, duas edições concorrentes não ultrapassam `memberLimit` — a transação é
 * repetida em caso de conflito e as regras do Firestore validam o resultado final.
 */
export async function updateGroup(
  groupId: string,
  uid: string,
  input: UpdateGroupInput,
): Promise<GroupMutationResult> {
  const name = input.name.trim();
  assertValidName(name);

  let photoUrl: string | null = null;
  const warnings: string[] = [];
  if (input.photoUri) {
    try {
      photoUrl = await uploadImage({ kind: 'group-photo', groupId }, input.photoUri);
    } catch {
      warnings.push('Não foi possível enviar a nova foto do grupo.');
    }
  }

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    if (!snapshot.exists()) throw new AppError('Este grupo não existe mais.');
    const group = snapshot.data();
    assertOwner(group, uid);

    const removeIds = input.removeMemberIds.filter((id) => id !== group.ownerId);
    const memberIds = applyMemberChanges(group.memberIds, input.addMemberIds, removeIds);
    assertValidCapacity(memberIds.length, input.memberLimit);

    const changes: UpdateData<GroupDocument> = {
      name,
      memberIds,
      memberLimit: input.memberLimit,
      notificationPolicy: input.notificationPolicy,
      updatedAt: Date.now(),
    };
    if (photoUrl) changes.photoUrl = photoUrl;
    transaction.update(groupRef(groupId), changes);
  });

  const syncWarning = await syncMembersSafely(groupId);
  if (syncWarning) warnings.push(syncWarning);
  return { groupId, warning: warnings.length > 0 ? warnings.join('\n') : null };
}

export async function addMembers(groupId: string, uid: string, newMemberIds: readonly string[]): Promise<GroupMutationResult> {
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    if (!snapshot.exists()) throw new AppError('Este grupo não existe mais.');
    const group = snapshot.data();
    assertOwner(group, uid);
    const memberIds = applyMemberChanges(group.memberIds, newMemberIds, []);
    if (memberIds.length > group.memberLimit) throw new GroupFullError(group.memberLimit);
    transaction.update(groupRef(groupId), { memberIds, updatedAt: Date.now() });
  });
  return { groupId, warning: await syncMembersSafely(groupId) };
}

export async function removeMember(groupId: string, uid: string, memberId: string): Promise<GroupMutationResult> {
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    if (!snapshot.exists()) throw new AppError('Este grupo não existe mais.');
    const group = snapshot.data();
    assertOwner(group, uid);
    if (memberId === group.ownerId) throw new AppError('O proprietário não pode ser removido do grupo.');
    const memberIds = group.memberIds.filter((id) => id !== memberId);
    if (memberIds.length < MIN_GROUP_MEMBERS) throw new AppError('O grupo precisa ter pelo menos dois integrantes.');
    transaction.update(groupRef(groupId), { memberIds, updatedAt: Date.now() });
  });
  return { groupId, warning: await syncMembersSafely(groupId) };
}

export async function updateMemberLimit(groupId: string, uid: string, memberLimit: number): Promise<void> {
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    if (!snapshot.exists()) throw new AppError('Este grupo não existe mais.');
    const group = snapshot.data();
    assertOwner(group, uid);
    assertValidCapacity(group.memberIds.length, memberLimit);
    transaction.update(groupRef(groupId), { memberLimit, updatedAt: Date.now() });
  });
}

export async function updateNotificationPolicy(groupId: string, uid: string, policy: NotificationPolicy): Promise<void> {
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    if (!snapshot.exists()) throw new AppError('Este grupo não existe mais.');
    assertOwner(snapshot.data(), uid);
    transaction.update(groupRef(groupId), { notificationPolicy: policy, updatedAt: Date.now() });
  });
}

/** Um integrante (não proprietário) pode sair do grupo por conta própria. */
export async function leaveGroup(groupId: string, uid: string): Promise<GroupMutationResult> {
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    if (!snapshot.exists()) throw new AppError('Este grupo não existe mais.');
    const group = snapshot.data();
    if (group.ownerId === uid) throw new AppError('O proprietário não pode sair do próprio grupo.');
    transaction.update(groupRef(groupId), {
      memberIds: group.memberIds.filter((id) => id !== uid),
      updatedAt: Date.now(),
    });
  });
  return { groupId, warning: await syncMembersSafely(groupId) };
}

export { syncMembersSafely as resyncGroupMembers };
