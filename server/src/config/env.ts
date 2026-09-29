export type FirebaseCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseURL: string;
};

export type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type ServerEnv = {
  port: number;
  firebase: FirebaseCredentials | null;
  cloudinary: CloudinaryCredentials | null;
  expoAccessToken: string | null;
};

function readVariable(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/**
 * Lê as variáveis de ambiente. As credenciais administrativas existem apenas nos
 * segredos da hospedagem — nunca no repositório nem no aplicativo mobile.
 */
export function loadEnv(): ServerEnv {
  const projectId = readVariable('FIREBASE_PROJECT_ID');
  const clientEmail = readVariable('FIREBASE_CLIENT_EMAIL');
  // Hospedagens costumam guardar a chave com "\n" literais; convertemos para quebras reais.
  const privateKey = readVariable('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n') ?? null;
  const databaseURL = readVariable('FIREBASE_DATABASE_URL');

  const firebase =
    projectId && clientEmail && privateKey && databaseURL ? { projectId, clientEmail, privateKey, databaseURL } : null;

  const cloudName = readVariable('CLOUDINARY_CLOUD_NAME');
  const apiKey = readVariable('CLOUDINARY_API_KEY');
  const apiSecret = readVariable('CLOUDINARY_API_SECRET');
  const cloudinary = cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;

  return {
    port: Number(readVariable('PORT') ?? 3000),
    firebase,
    cloudinary,
    expoAccessToken: readVariable('EXPO_ACCESS_TOKEN'),
  };
}

export const env = loadEnv();
