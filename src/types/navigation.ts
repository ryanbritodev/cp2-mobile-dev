import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ConversationType } from './chat';

export type UsersScreenParams =
  | { mode: 'direct' }
  | {
      mode: 'select';
      /** Presente quando a seleção é para um grupo existente (edição). */
      groupId?: string;
      selectedIds: string[];
      /** Integrantes que não podem ser desmarcados (ex.: proprietário). */
      lockedIds: string[];
      memberLimit: number;
    };

export type RootStackParamList = {
  // Fluxo de autenticação
  Login: undefined;
  Register: undefined;
  // Fluxo autenticado
  Conversations: undefined;
  Users: UsersScreenParams;
  GroupForm: { groupId?: string; selectedMemberIds?: string[] } | undefined;
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { uid: string };
  GroupMembers: { groupId: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Tipagem global para `useNavigation()` sem parâmetros genéricos.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
