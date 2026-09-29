import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { groupsRouter } from './routes/groups';
import { healthRouter } from './routes/health';
import { notificationsRouter } from './routes/notifications';
import { profilesRouter } from './routes/profiles';
import { uploadsRouter } from './routes/uploads';

export function createApp(): Express {
  const app = express();

  // Necessário atrás do proxy HTTPS da hospedagem (IP real para o rate limit).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Muitas requisições. Tente novamente em instantes.' },
    }),
  );

  app.get('/', (_req, res) => {
    res.json({
      name: 'Chat Firebase — API de notificações',
      endpoints: ['GET /health', 'POST /notifications/messages', 'POST /groups/:groupId/sync-members', 'GET /profiles/:uid', 'POST /uploads/signature'],
    });
  });
  app.use('/health', healthRouter);
  app.use('/notifications', notificationsRouter);
  app.use('/groups', groupsRouter);
  app.use('/profiles', profilesRouter);
  app.use('/uploads', uploadsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
