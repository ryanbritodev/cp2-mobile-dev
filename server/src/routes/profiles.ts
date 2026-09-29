import { Router } from 'express';
import { authenticate, getAuthenticatedUid } from '../middleware/authenticate';
import { sharesConversation } from '../services/profileAccess';
import { getUserProfile } from '../services/repositories';
import { assertValidId, HttpError } from '../utils/httpError';

export const profilesRouter = Router();

/**
 * GET /profiles/:uid
 * Retorna os dados cadastrais apenas se o solicitante compartilha uma conversa
 * individual ou um grupo com o usuário consultado.
 */
profilesRouter.get('/:uid', authenticate, async (req, res) => {
  const viewerUid = getAuthenticatedUid(res);
  const targetUid = assertValidId(req.params.uid, 'uid');
  if (!(await sharesConversation(viewerUid, targetUid))) {
    throw new HttpError(403, 'Perfil disponível apenas para quem compartilha uma conversa ou grupo.');
  }
  const profile = await getUserProfile(targetUid);
  if (!profile) throw new HttpError(404, 'Perfil não encontrado.');
  res.json({ profile });
});
