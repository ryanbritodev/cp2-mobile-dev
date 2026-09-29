import { FirebaseError } from 'firebase/app';
import { GroupFullError } from './groupValidation';

/** Erro com mensagem já adequada para exibição ao usuário. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const FIREBASE_MESSAGES: Readonly<Record<string, string>> = {
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/user-not-found': 'E-mail ou senha inválidos.',
  'auth/invalid-email': 'O e-mail informado é inválido.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique sua rede.',
  'auth/user-token-expired': 'Sua sessão expirou. Entre novamente.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/requires-recent-login': 'Por segurança, entre novamente para continuar.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  unavailable: 'Serviço indisponível no momento. Verifique sua conexão.',
  'deadline-exceeded': 'A operação demorou demais. Tente novamente.',
  'not-found': 'O item solicitado não foi encontrado.',
  aborted: 'A operação conflitou com outra alteração. Tente novamente.',
  'failed-precondition': 'Não foi possível concluir a operação agora. Tente novamente.',
  unauthenticated: 'Sua sessão expirou. Entre novamente.',
};

function isPermissionDeniedMessage(message: string): boolean {
  return /permission[_ ]denied/i.test(message);
}

export function isPermissionDenied(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return error.code === 'permission-denied' || isPermissionDeniedMessage(error.message);
  }
  return error instanceof Error && isPermissionDeniedMessage(error.message);
}

/** Converte qualquer erro em uma mensagem compreensível, sem expor detalhes internos. */
export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof AppError || error instanceof GroupFullError) return error.message;
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
    if (error.status === 403) return 'Você não tem permissão para acessar este conteúdo.';
    if (error.status === 404) return 'O item solicitado não foi encontrado.';
    if (error.status === 0) return 'Não foi possível contatar o servidor. Verifique sua conexão.';
    return error.message || fallback;
  }
  if (error instanceof FirebaseError) {
    const mapped = FIREBASE_MESSAGES[error.code] ?? FIREBASE_MESSAGES[error.code.replace(/^firestore\//, '')];
    if (mapped) return mapped;
    if (isPermissionDeniedMessage(error.message)) return FIREBASE_MESSAGES['permission-denied'];
    return fallback;
  }
  if (error instanceof Error) {
    if (isPermissionDeniedMessage(error.message)) return FIREBASE_MESSAGES['permission-denied'];
    if (/network|offline|internet/i.test(error.message)) return 'Sem conexão com a internet. Verifique sua rede.';
  }
  return fallback;
}
