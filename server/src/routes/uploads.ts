import { Router } from 'express';
import { authenticate, getAuthenticatedUid } from '../middleware/authenticate';
import { createSignedUpload, publicIdFor, type UploadTarget } from '../services/cloudinary';
import { getGroup } from '../services/repositories';
import { isRecord } from '../utils/guards';
import { assertValidId, HttpError } from '../utils/httpError';

export const uploadsRouter = Router();

/**
 * POST /uploads/signature
 * Body: { kind: 'user-avatar' } | { kind: 'group-photo', groupId }
 * Autoriza o envio de UMA imagem ao Cloudinary: a foto de perfil do próprio usuário
 * ou a foto de um grupo do qual ele é proprietário.
 */
uploadsRouter.post('/signature', authenticate, async (req, res) => {
  const uid = getAuthenticatedUid(res);
  const body: unknown = req.body;
  const source = isRecord(body) ? body : {};

  let target: UploadTarget;
  if (source.kind === 'user-avatar') {
    target = { kind: 'user-avatar' };
  } else if (source.kind === 'group-photo') {
    const groupId = assertValidId(source.groupId, 'groupId');
    const group = await getGroup(groupId);
    if (!group) throw new HttpError(404, 'Grupo não encontrado.');
    if (group.ownerId !== uid) throw new HttpError(403, 'Somente o proprietário pode alterar a foto do grupo.');
    target = { kind: 'group-photo', groupId };
  } else {
    throw new HttpError(400, 'Campo "kind" inválido.');
  }

  res.json(createSignedUpload(publicIdFor(target, uid)));
});
