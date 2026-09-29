/** Perfil completo (dados cadastrais) — Firestore `users/{uid}`. */
export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  /** Data no formato ISO `YYYY-MM-DD`. */
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

export type ChatUserDocument = Omit<ChatUser, 'uid'>;

/**
 * Dados mínimos visíveis a qualquer usuário autenticado — Firestore `publicProfiles/{uid}`.
 * Usados na busca de usuários e para exibir nome/foto de autores de mensagens.
 */
export type PublicProfile = {
  uid: string;
  name: string;
  nameLower: string;
  photoUrl: string;
  updatedAt: number;
};

export type PublicProfileDocument = Omit<PublicProfile, 'uid'>;

export type PublicProfileMap = Readonly<Record<string, PublicProfile>>;

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterResult = {
  uid: string;
  /** Preenchido quando a conta foi criada mas a foto não pôde ser enviada. */
  warning: string | null;
};
