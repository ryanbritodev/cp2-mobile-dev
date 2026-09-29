import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { get, ref, serverTimestamp, set, update } from 'firebase/database';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';

let env: RulesTestEnvironment;

const OWNER = 'owner1';
const ANA = 'ana1';
const STRANGER = 'zed1';
const GROUP = 'group1';
const DIRECT = [ANA, OWNER].sort().join('_');

const rtdb = (uid: string) => env.authenticatedContext(uid).database();

function message(conversationId: string, senderId: string, extra: Record<string, unknown> = {}) {
  return {
    conversationId,
    conversationType: conversationId.includes('_') ? 'direct' : 'group',
    senderId,
    text: 'Olá!',
    target: { type: 'conversation' },
    createdAt: serverTimestamp(),
    ...extra,
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-chat-rules',
    database: { rules: readFileSync(resolve(__dirname, '..', 'database.rules.json'), 'utf8') },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearDatabase();
  // Espelho de integrantes: na produção é escrito apenas pela API (Admin SDK).
  await env.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), `conversationMembers/${GROUP}`), { [OWNER]: true, [ANA]: true });
  });
});

describe('mensagens de grupo', () => {
  it('integrante envia e lê mensagens', async () => {
    await assertSucceeds(set(ref(rtdb(ANA), `messages/${GROUP}/m1`), message(GROUP, ANA)));
    await assertSucceeds(get(ref(rtdb(OWNER), `messages/${GROUP}`)));
  });

  it('não integrante (ou removido) não lê nem envia', async () => {
    await assertFails(get(ref(rtdb(STRANGER), `messages/${GROUP}`)));
    await assertFails(set(ref(rtdb(STRANGER), `messages/${GROUP}/m1`), message(GROUP, STRANGER)));
  });

  it('senderId precisa ser o usuário autenticado', async () => {
    await assertFails(set(ref(rtdb(ANA), `messages/${GROUP}/m1`), message(GROUP, OWNER)));
  });

  it('createdAt precisa ser o horário do servidor', async () => {
    await assertFails(set(ref(rtdb(ANA), `messages/${GROUP}/m1`), message(GROUP, ANA, { createdAt: 123 })));
  });

  it('mensagens são imutáveis', async () => {
    await assertSucceeds(set(ref(rtdb(ANA), `messages/${GROUP}/m1`), message(GROUP, ANA)));
    await assertFails(set(ref(rtdb(ANA), `messages/${GROUP}/m1`), message(GROUP, ANA, { text: 'editado' })));
  });

  it('destinatário e menções devem ser integrantes', async () => {
    await assertSucceeds(
      set(ref(rtdb(ANA), `messages/${GROUP}/m1`), message(GROUP, ANA, { target: { type: 'member', memberId: OWNER }, mentionedUserIds: [OWNER] })),
    );
    await assertFails(
      set(ref(rtdb(ANA), `messages/${GROUP}/m2`), message(GROUP, ANA, { target: { type: 'member', memberId: STRANGER } })),
    );
    await assertFails(set(ref(rtdb(ANA), `messages/${GROUP}/m3`), message(GROUP, ANA, { mentionedUserIds: [STRANGER] })));
  });

  it('mensagem + prévia em escrita atômica', async () => {
    await assertSucceeds(
      update(ref(rtdb(ANA)), {
        [`messages/${GROUP}/m1`]: message(GROUP, ANA),
        [`lastMessages/${GROUP}`]: { messageId: 'm1', senderId: ANA, text: 'Olá!', createdAt: serverTimestamp() },
      }),
    );
  });

  it('clientes não alteram o espelho de integrantes', async () => {
    await assertFails(set(ref(rtdb(STRANGER), `conversationMembers/${GROUP}/${STRANGER}`), true));
  });
});

describe('mensagens individuais', () => {
  it('participantes enviam e leem; terceiros não', async () => {
    await assertSucceeds(set(ref(rtdb(ANA), `messages/${DIRECT}/m1`), message(DIRECT, ANA)));
    await assertSucceeds(get(ref(rtdb(OWNER), `messages/${DIRECT}`)));
    await assertFails(get(ref(rtdb(STRANGER), `messages/${DIRECT}`)));
    await assertFails(set(ref(rtdb(STRANGER), `messages/${DIRECT}/m2`), message(DIRECT, STRANGER)));
  });

  it('tipo da conversa deve corresponder ao ID', async () => {
    await assertFails(set(ref(rtdb(ANA), `messages/${DIRECT}/m1`), message(DIRECT, ANA, { conversationType: 'group' })));
  });
});
