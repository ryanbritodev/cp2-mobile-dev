import type { User } from 'firebase/auth';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authService from '../services/authService';
import { unregisterDevice } from '../services/notificationService';
import { subscribeOwnProfile } from '../services/userService';
import type { ChatUser, LoginInput, RegisterInput, RegisterResult } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { withTimeout } from '../utils/timeout';

const UNREGISTER_TIMEOUT_MS = 5_000;

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

export type AuthContextValue = {
  status: AuthStatus;
  firebaseUser: User | null;
  /** Perfil do Firestore; `null` enquanto carrega ou se o cadastro não foi concluído. */
  profile: ChatUser | null;
  profileError: string | null;
  /** Verdadeiro enquanto o cadastro (conta + foto + perfil) está em andamento. */
  registering: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  // Recupera a sessão persistida e reage a login, logout e expiração.
  useEffect(() => {
    return authService.observeSession((user) => {
      setFirebaseUser(user);
      setSessionResolved(true);
    });
  }, []);

  const uid = firebaseUser?.uid ?? null;

  // Listener do perfil: removido automaticamente no logout (uid passa a ser null).
  useEffect(() => {
    setProfile(null);
    setProfileError(null);
    if (!uid) return undefined;
    return subscribeOwnProfile(
      uid,
      (nextProfile) => setProfile(nextProfile),
      (error) => setProfileError(getErrorMessage(error, 'Não foi possível carregar seu perfil.')),
    );
  }, [uid]);

  const login = useCallback((input: LoginInput) => authService.login(input), []);
  const register = useCallback(async (input: RegisterInput) => {
    setRegistering(true);
    try {
      return await authService.register(input);
    } finally {
      setRegistering(false);
    }
  }, []);
  const resetPassword = useCallback((email: string) => authService.requestPasswordReset(email), []);

  const logout = useCallback(async () => {
    if (uid) {
      // Remove o token deste aparelho antes de encerrar a sessão. A remoção só
      // resolve quando o Firestore confirma, então o timeout garante que uma
      // falha de rede não impeça o logout — o token restante é desativado pela
      // API assim que o FCM o recusar.
      await withTimeout(unregisterDevice(uid), UNREGISTER_TIMEOUT_MS);
    }
    await authService.logout();
  }, [uid]);

  const status: AuthStatus = !sessionResolved ? 'loading' : firebaseUser ? 'authenticated' : 'unauthenticated';

  const value = useMemo<AuthContextValue>(
    () => ({ status, firebaseUser, profile, profileError, registering, login, register, logout, resetPassword }),
    [status, firebaseUser, profile, profileError, registering, login, register, logout, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
