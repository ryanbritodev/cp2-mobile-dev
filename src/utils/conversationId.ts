const DIRECT_ID_PATTERN = /^[A-Za-z0-9]+_[A-Za-z0-9]+$/;

/**
 * Gera o identificador determinístico da conversa individual a partir dos dois
 * `uid` ordenados. Assim o mesmo par de usuários sempre resulta na mesma conversa.
 */
export function buildDirectConversationId(firstUid: string, secondUid: string): string {
  if (!firstUid || !secondUid) {
    throw new Error('Participantes inválidos para a conversa.');
  }
  if (firstUid === secondUid) {
    throw new Error('Você não pode iniciar uma conversa consigo mesmo.');
  }
  return [firstUid, secondUid].sort().join('_');
}

/** Conversas diretas usam `uidA_uidB`; grupos usam o ID automático do Firestore (sem `_`). */
export function isDirectConversationId(conversationId: string): boolean {
  return DIRECT_ID_PATTERN.test(conversationId);
}

export function getOtherParticipantId(conversationId: string, currentUid: string): string | null {
  if (!isDirectConversationId(conversationId)) return null;
  const [first, second] = conversationId.split('_');
  if (first === currentUid) return second;
  if (second === currentUid) return first;
  return null;
}
