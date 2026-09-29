import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebaseConfig.json';

const firebaseConfig: FirebaseOptions = firebaseConfigJson;

const REQUIRED_KEYS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'] as const;

/** Indica se o `firebaseConfig.json` foi preenchido com um projeto real. */
export const isFirebaseConfigured = REQUIRED_KEYS.every((key) => {
  const value = firebaseConfigJson[key];
  return typeof value === 'string' && value.length > 0 && !/SUBSTITUA|seu-projeto/i.test(value);
});

function createApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function createAuth(app: FirebaseApp): Auth {
  try {
    // Persistência em AsyncStorage permite recuperar a sessão ao reabrir o app.
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Fast Refresh: o Auth já foi inicializado neste processo.
    return getAuth(app);
  }
}

function createFirestore(app: FirebaseApp): Firestore {
  try {
    // Long polling é mais estável no React Native do que WebChannel/streams.
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}

export const firebaseApp = createApp();
export const auth = createAuth(firebaseApp);
export const firestore = createFirestore(firebaseApp);
export const database: Database = getDatabase(firebaseApp);
