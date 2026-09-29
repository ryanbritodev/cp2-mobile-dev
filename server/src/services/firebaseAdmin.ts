import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getDatabase, type Database } from 'firebase-admin/database';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

let app: App | null = null;

export function isFirebaseConfigured(): boolean {
  return env.firebase !== null;
}

/** Inicializa o Admin SDK com as credenciais das variáveis secretas da hospedagem. */
function getAdminApp(): App {
  if (app) return app;
  if (!env.firebase) throw new HttpError(503, 'API sem credenciais do Firebase configuradas.');
  app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
      databaseURL: env.firebase.databaseURL,
    });
  return app;
}

export const adminAuth = (): Auth => getAuth(getAdminApp());
export const adminFirestore = (): Firestore => getFirestore(getAdminApp());
export const adminDatabase = (): Database => getDatabase(getAdminApp());
export const adminMessaging = (): Messaging => getMessaging(getAdminApp());
