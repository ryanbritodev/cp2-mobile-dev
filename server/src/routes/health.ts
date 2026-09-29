import { Router } from 'express';
import { isCloudinaryConfigured } from '../services/cloudinary';
import { isFirebaseConfigured } from '../services/firebaseAdmin';

export const healthRouter = Router();

const startedAt = Date.now();

/** GET /health — verificação pública de disponibilidade (sem dados sensíveis). */
healthRouter.get('/', (_req, res) => {
  const firebaseReady = isFirebaseConfigured();
  res.status(firebaseReady ? 200 : 503).json({
    status: firebaseReady ? 'ok' : 'degraded',
    firebase: firebaseReady ? 'configured' : 'missing-credentials',
    imageStorage: isCloudinaryConfigured() ? 'configured' : 'missing-credentials',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});
