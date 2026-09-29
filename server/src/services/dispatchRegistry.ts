import { adminFirestore } from './firebaseAdmin';

// Um envio "processing" parado há mais tempo que isso (queda da API) pode ser retomado.
const STALE_PROCESSING_MS = 2 * 60 * 1000;

type DispatchStatus = 'processing' | 'sent' | 'failed';

function dispatchRef(conversationId: string, messageId: string) {
  return adminFirestore().collection('notificationDispatches').doc(`${conversationId}__${messageId}`);
}

/**
 * Reserva o envio da mensagem de forma atômica (transação). Se a mesma mensagem já
 * foi (ou está sendo) notificada, retorna `false` e nenhum push é repetido — mesmo que
 * o app reenvie a requisição ou duas requisições cheguem ao mesmo tempo.
 */
export async function claimDispatch(conversationId: string, messageId: string, senderId: string): Promise<boolean> {
  const ref = dispatchRef(conversationId, messageId);
  return adminFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    if (snapshot.exists && data) {
      const status: unknown = data.status;
      const updatedAt: unknown = data.updatedAt;
      const stale = status === 'processing' && typeof updatedAt === 'number' && Date.now() - updatedAt > STALE_PROCESSING_MS;
      if (status !== 'failed' && !stale) return false;
    }
    transaction.set(ref, { conversationId, messageId, senderId, status: 'processing', updatedAt: Date.now() });
    return true;
  });
}

export async function finishDispatch(
  conversationId: string,
  messageId: string,
  status: Exclude<DispatchStatus, 'processing'>,
  details: { recipients: number; delivered: number; failed: number },
): Promise<void> {
  await dispatchRef(conversationId, messageId).set({ status, ...details, updatedAt: Date.now() }, { merge: true });
}
