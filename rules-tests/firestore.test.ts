import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';

let env: RulesTestEnvironment;

const OWNER = 'owner1';
const ANA = 'ana1';
const BIA = 'bia1';
const CAIO = 'caio1';
const STRANGER = 'zed1';

function groupData(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Turma',
    photoUrl: '',
    ownerId: OWNER,
    memberIds: [OWNER, ANA],
    memberLimit: 3,
    notificationPolicy: 'all_group_messages',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const db = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@test.com` }).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-chat-rules',
    firestore: { rules: readFileSync(resolve(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const admin = context.firestore();
    for (const uid of [OWNER, ANA, BIA, CAIO, STRANGER]) {
      await setDoc(doc(admin, 'publicProfiles', uid), { name: uid, nameLower: uid, photoUrl: '', updatedAt: 1 });
      await setDoc(doc(admin, 'users', uid), {
        name: uid,
        email: `${uid}@test.com`,
        phoneNumber: '(11) 99999-9999',
        birthDate: '2000-01-01',
        photoUrl: '',
        createdAt: 1,
      });
      await setDoc(doc(admin, 'users', uid, 'devices', 'd1'), {
        token: 'tok',
        provider: 'fcm',
        platform: 'android',
        enabled: true,
        updatedAt: 1,
      });
    }
    await setDoc(doc(admin, 'groups', 'g1'), groupData());
  });
});

describe('groups', () => {
  it('proprietário cria grupo válido', async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), 'groups', 'g2'), groupData()));
  });

  it('recusa criação acima do limite, sem o proprietário ou com um único integrante', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'groups', 'g2'), groupData({ memberIds: [OWNER, ANA, BIA, CAIO] })));
    await assertFails(setDoc(doc(db(OWNER), 'groups', 'g3'), groupData({ memberIds: [ANA, BIA] })));
    await assertFails(setDoc(doc(db(OWNER), 'groups', 'g4'), groupData({ memberIds: [OWNER] })));
    await assertFails(setDoc(doc(db(OWNER), 'groups', 'g5'), groupData({ memberLimit: 2.5 })));
  });

  it('foto só aceita URL do Cloudinary (nunca Base64)', async () => {
    await assertSucceeds(
      setDoc(doc(db(OWNER), 'groups', 'g2'), groupData({ photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/g2.jpg' })),
    );
    await assertFails(setDoc(doc(db(OWNER), 'groups', 'g3'), groupData({ photoUrl: 'data:image/jpeg;base64,/9j/4AAQ' })));
    await assertFails(
      updateDoc(doc(db(ANA), 'users', ANA), { photoUrl: 'data:image/jpeg;base64,/9j/4AAQ' }),
    );
  });

  it('não permite criar grupo em nome de outro proprietário', async () => {
    await assertFails(setDoc(doc(db(ANA), 'groups', 'g2'), groupData()));
  });

  it('somente integrantes leem o grupo', async () => {
    await assertSucceeds(getDoc(doc(db(ANA), 'groups', 'g1')));
    await assertFails(getDoc(doc(db(STRANGER), 'groups', 'g1')));
  });

  it('proprietário adiciona integrante dentro do limite', async () => {
    await assertSucceeds(updateDoc(doc(db(OWNER), 'groups', 'g1'), { memberIds: arrayUnion(BIA), updatedAt: 2 }));
  });

  it('integrante comum não gerencia o grupo', async () => {
    await assertFails(updateDoc(doc(db(ANA), 'groups', 'g1'), { memberIds: arrayUnion(BIA), updatedAt: 2 }));
    await assertFails(updateDoc(doc(db(ANA), 'groups', 'g1'), { notificationPolicy: 'disabled', updatedAt: 2 }));
  });

  it('limite não pode ficar abaixo da quantidade atual', async () => {
    await assertFails(
      updateDoc(doc(db(OWNER), 'groups', 'g1'), { memberIds: [OWNER, ANA, BIA], memberLimit: 2, updatedAt: 2 }),
    );
  });

  it('integrante pode sair, mas não remover outra pessoa', async () => {
    await assertFails(updateDoc(doc(db(ANA), 'groups', 'g1'), { memberIds: [ANA], updatedAt: 2 }));
    await assertSucceeds(updateDoc(doc(db(ANA), 'groups', 'g1'), { memberIds: [OWNER], updatedAt: 2 }));
  });

  it('adições simultâneas não ultrapassam o limite', async () => {
    // Uma vaga restante (2 de 3): duas adições concorrentes a partir de clientes diferentes.
    const owner1 = db(OWNER);
    const owner2 = db(OWNER);
    const results = await Promise.allSettled([
      updateDoc(doc(owner1, 'groups', 'g1'), { memberIds: arrayUnion(BIA), updatedAt: 2 }),
      updateDoc(doc(owner2, 'groups', 'g1'), { memberIds: arrayUnion(CAIO), updatedAt: 3 }),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    await env.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDoc(doc(context.firestore(), 'groups', 'g1'));
      const memberIds: unknown = snapshot.get('memberIds');
      assert.ok(Array.isArray(memberIds));
      assert.equal(memberIds.length, 3);
    });
  });
});

describe('directConversations', () => {
  it('cria conversa válida entre dois usuários (ID ordenado)', async () => {
    const id = [ANA, BIA].sort().join('_');
    await assertSucceeds(setDoc(doc(db(ANA), 'directConversations', id), { participantIds: [ANA, BIA].sort(), createdAt: 1 }));
  });

  it('recusa conversa consigo mesmo, fora de ordem ou de terceiros', async () => {
    await assertFails(setDoc(doc(db(ANA), 'directConversations', `${ANA}_${ANA}`), { participantIds: [ANA, ANA], createdAt: 1 }));
    await assertFails(setDoc(doc(db(ANA), 'directConversations', `${BIA}_${ANA}`), { participantIds: [BIA, ANA], createdAt: 1 }));
    const id = [BIA, CAIO].sort().join('_');
    await assertFails(setDoc(doc(db(ANA), 'directConversations', id), { participantIds: [BIA, CAIO].sort(), createdAt: 1 }));
  });
});

describe('users e devices', () => {
  it('dados cadastrais: próprio usuário e parceiro de conversa sim, estranho não', async () => {
    await assertSucceeds(getDoc(doc(db(ANA), 'users', ANA)));
    await assertFails(getDoc(doc(db(STRANGER), 'users', ANA)));
    const id = [ANA, BIA].sort().join('_');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'directConversations', id), { participantIds: [ANA, BIA].sort(), createdAt: 1 });
    });
    await assertSucceeds(getDoc(doc(db(BIA), 'users', ANA)));
  });

  it('tokens de dispositivos não são públicos', async () => {
    await assertSucceeds(getDoc(doc(db(ANA), 'users', ANA, 'devices', 'd1')));
    await assertFails(getDoc(doc(db(BIA), 'users', ANA, 'devices', 'd1')));
  });

  it('perfil público é legível apenas por autenticados', async () => {
    await assertSucceeds(getDoc(doc(db(STRANGER), 'publicProfiles', ANA)));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'publicProfiles', ANA)));
  });

  it('controle de idempotência é inacessível aos clientes', async () => {
    await assertFails(getDoc(doc(db(ANA), 'notificationDispatches', 'x')));
  });
});
