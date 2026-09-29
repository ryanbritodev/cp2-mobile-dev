import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError';

/** Responde com mensagens genéricas; detalhes internos ficam apenas no log do servidor. */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: 'JSON inválido.' });
    return;
  }
  console.error(`[${req.method} ${req.path}]`, error);
  res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Rota não encontrada.' });
}
