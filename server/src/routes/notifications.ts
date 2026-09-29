import { Router } from 'express';
import { authenticate, getAuthenticatedUid } from '../middleware/authenticate';
import { notifyMessage } from '../services/messageNotifier';
import { isRecord } from '../utils/guards';
import { assertValidId } from '../utils/httpError';

export const notificationsRouter = Router();

/**
 * POST /notifications/messages
 * Body: { conversationId, messageId }
 * Os destinatários são calculados no servidor; o corpo não aceita lista de destinatários.
 */
notificationsRouter.post('/messages', authenticate, async (req, res) => {
  const body: unknown = req.body;
  const source = isRecord(body) ? body : {};
  const conversationId = assertValidId(source.conversationId, 'conversationId');
  const messageId = assertValidId(source.messageId, 'messageId');
  const outcome = await notifyMessage(getAuthenticatedUid(res), conversationId, messageId);
  res.status(outcome.status === 'duplicate' ? 200 : 202).json(outcome);
});
