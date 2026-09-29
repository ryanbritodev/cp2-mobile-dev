import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types/notification';
import type { LoginInput, RegisterInput, RegisterResult } from '../types/user';
import { publicProfileConverter, preferencesConverter, userConverter } from './converters';
import { auth, firestore } from './firebase';
import { uploadImage } from './storageService';

/**
 * Cria a conta (e-mail/senha), envia a foto ao Cloudinary e grava o perfil no Firestore.
 * Se a gravação do perfil falhar, a conta recém-criada é removida para não ficar órfã.
 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const { user } = credential;
  const name = input.name.trim();
  let photoUrl = '';
  let warning: string | null = null;

  if (input.photoUri) {
    try {
      photoUrl = await uploadImage({ kind: 'user-avatar' }, input.photoUri);
    } catch {
      warning = 'Conta criada, mas não foi possível enviar a foto. Uma imagem padrão será exibida.';
    }
  }

  try {
    const now = Date.now();
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'users', user.uid).withConverter(userConverter), {
      uid: user.uid,
      name,
      email: user.email ?? input.email.trim(),
      phoneNumber: input.phoneNumber,
      birthDate: input.birthDate,
      photoUrl,
      createdAt: now,
    });
    batch.set(doc(firestore, 'publicProfiles', user.uid).withConverter(publicProfileConverter), {
      uid: user.uid,
      name,
      nameLower: name.toLowerCase(),
      photoUrl,
      updatedAt: now,
    });
    batch.set(doc(firestore, 'users', user.uid, 'preferences', 'notifications').withConverter(preferencesConverter), {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      updatedAt: now,
    });
    await batch.commit();
    await updateProfile(user, { displayName: name, photoURL: photoUrl || null }).catch(() => undefined);
  } catch (error) {
    await deleteUser(user).catch(() => signOut(auth));
    throw error;
  }

  return { uid: user.uid, warning };
}

export async function login(input: LoginInput): Promise<void> {
  await signInWithEmailAndPassword(auth, input.email.trim(), input.password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/** Observa a sessão persistida; o callback é chamado com `null` após logout ou expiração. */
export function observeSession(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
