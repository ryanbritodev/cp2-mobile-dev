import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../services/firebaseAdmin';
import { HttpError } from '../utils/httpError';

export type AuthLocals = { uid: string };

/** Valida o Firebase ID Token enviado em `Authorization: Bearer <token>`. */
export async function authenticate(req: Request, res: Response<unknown, AuthLocals>, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer (.+)$/i.exec(header);
  if (!match?.[1]) {
    next(new HttpError(401, 'Token de autenticação ausente.'));
    return;
  }
  try {
    const decoded = await adminAuth().verifyIdToken(match[1]);
    res.locals.uid = decoded.uid;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Token de autenticação inválido ou expirado.'));
  }
}

export function getAuthenticatedUid(res: Response): string {
  const uid: unknown = res.locals.uid;
  if (typeof uid !== 'string' || !uid) throw new HttpError(401, 'Não autenticado.');
  return uid;
}
