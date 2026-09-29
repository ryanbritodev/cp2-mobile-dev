import { findGroupsOfUser, getDirectConversation } from './repositories';

function directConversationId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

/**
 * Um usuário só pode consultar os dados cadastrais de outro se ambos tiverem uma
 * conversa individual ou participarem de um mesmo grupo.
 */
export async function sharesConversation(viewerUid: string, targetUid: string): Promise<boolean> {
  if (viewerUid === targetUid) return true;
  const direct = await getDirectConversation(directConversationId(viewerUid, targetUid));
  if (direct?.participantIds.includes(viewerUid) && direct.participantIds.includes(targetUid)) return true;
  const groups = await findGroupsOfUser(viewerUid);
  return groups.some((group) => group.memberIds.includes(targetUid));
}
