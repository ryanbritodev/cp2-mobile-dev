import { Router } from 'express';
import { authenticate, getAuthenticatedUid } from '../middleware/authenticate';
import { getGroup, wasConversationMember, writeConversationMembers } from '../services/repositories';
import { assertValidId, HttpError } from '../utils/httpError';

export const groupsRouter = Router();

/**
 * POST /groups/:groupId/sync-members
 * Copia os integrantes atuais do grupo (Firestore) para `conversationMembers` no
 * Realtime Database, que é o que as regras do RTDB usam para liberar leitura/escrita
 * das mensagens. Assim, quem foi removido perde o acesso a novas mensagens.
 */
groupsRouter.post('/:groupId/sync-members', authenticate, async (req, res) => {
  const uid = getAuthenticatedUid(res);
  const groupId = assertValidId(req.params.groupId, 'groupId');
  const group = await getGroup(groupId);

  if (!group) {
    await writeConversationMembers(groupId, null);
    throw new HttpError(404, 'Grupo não encontrado.');
  }

  // Integrantes atuais ou recém-saídos (ainda presentes no espelho) podem solicitar.
  const allowed = group.memberIds.includes(uid) || (await wasConversationMember(groupId, uid));
  if (!allowed) throw new HttpError(403, 'Você não participa deste grupo.');

  await writeConversationMembers(groupId, group.memberIds);
  res.json({ status: 'synced', memberCount: group.memberIds.length, memberLimit: group.memberLimit });
});
