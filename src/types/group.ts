import type { NotificationPolicy } from './notification';

export type ChatGroup = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type GroupDocument = Omit<ChatGroup, 'id'>;

export type CreateGroupInput = {
  name: string;
  photoUri: string | null;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export type UpdateGroupInput = {
  name: string;
  photoUri: string | null;
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  addMemberIds: string[];
  removeMemberIds: string[];
};

export type GroupMutationResult = {
  groupId: string;
  /** Aviso não bloqueante (ex.: falha ao sincronizar integrantes ou enviar foto). */
  warning: string | null;
};
