import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildContent } from '../src/services/notificationSender';
import { applyPreferences, resolveRecipients, type ConversationContext, type MessageContext } from '../src/services/recipientResolver';
import type { NotificationPolicy, NotificationPreferences } from '../src/types/domain';

const group = (policy: NotificationPolicy, memberIds = ['owner', 'ana', 'bia', 'caio']): ConversationContext => ({
  type: 'group',
  memberIds,
  notificationPolicy: policy,
});

const general: MessageContext = { senderId: 'owner', target: { type: 'conversation' }, mentionedUserIds: [] };
const uids = (list: { uid: string }[]) => list.map((item) => item.uid).sort();

describe('resolveRecipients — conversa individual', () => {
  it('notifica apenas o outro participante', () => {
    const result = resolveRecipients({ type: 'direct', participantIds: ['a', 'b'] }, { ...general, senderId: 'a' });
    assert.deepEqual(result, [{ uid: 'b', reason: 'direct' }]);
  });

  it('não notifica ninguém se o remetente não participa', () => {
    assert.deepEqual(resolveRecipients({ type: 'direct', participantIds: ['a', 'b'] }, { ...general, senderId: 'x' }), []);
  });
});

describe('resolveRecipients — all_group_messages', () => {
  it('notifica todos os integrantes exceto o remetente', () => {
    assert.deepEqual(uids(resolveRecipients(group('all_group_messages'), general)), ['ana', 'bia', 'caio']);
  });

  it('marca mencionados/destinatários com o motivo "mention"', () => {
    const result = resolveRecipients(group('all_group_messages'), {
      senderId: 'owner',
      target: { type: 'member', memberId: 'bia' },
      mentionedUserIds: ['ana'],
    });
    const reasons = Object.fromEntries(result.map((item) => [item.uid, item.reason]));
    assert.deepEqual(reasons, { ana: 'mention', bia: 'mention', caio: 'group' });
  });
});

describe('resolveRecipients — mentioned_members', () => {
  it('notifica somente mencionados e o destinatário selecionado', () => {
    const result = resolveRecipients(group('mentioned_members'), {
      senderId: 'owner',
      target: { type: 'member', memberId: 'caio' },
      mentionedUserIds: ['ana'],
    });
    assert.deepEqual(uids(result), ['ana', 'caio']);
  });

  it('mensagem geral sem menções não gera push', () => {
    assert.deepEqual(resolveRecipients(group('mentioned_members'), general), []);
  });

  it('ignora menções a quem não é integrante e ao próprio remetente', () => {
    const result = resolveRecipients(group('mentioned_members'), {
      senderId: 'owner',
      target: { type: 'conversation' },
      mentionedUserIds: ['intruso', 'owner', 'bia'],
    });
    assert.deepEqual(uids(result), ['bia']);
  });
});

describe('resolveRecipients — direct_messages_only e disabled', () => {
  for (const policy of ['direct_messages_only', 'disabled'] as const) {
    it(`${policy}: mensagens de grupo não geram push`, () => {
      const withMention: MessageContext = { ...general, mentionedUserIds: ['ana'] };
      assert.deepEqual(resolveRecipients(group(policy), withMention), []);
    });
  }
});

describe('resolveRecipients — integrante removido', () => {
  it('remetente que não está mais no grupo não gera push', () => {
    assert.deepEqual(resolveRecipients(group('all_group_messages', ['owner', 'ana']), { ...general, senderId: 'bia' }), []);
  });

  it('integrante removido não recebe push', () => {
    assert.deepEqual(uids(resolveRecipients(group('all_group_messages', ['owner', 'ana']), general)), ['ana']);
  });
});

describe('applyPreferences', () => {
  it('remove quem desativou push ou silenciou a conversa', () => {
    const preferences = new Map<string, NotificationPreferences>([
      ['ana', { pushEnabled: false, mutedConversationIds: [] }],
      ['bia', { pushEnabled: true, mutedConversationIds: ['g1'] }],
      ['caio', { pushEnabled: true, mutedConversationIds: ['outra'] }],
    ]);
    const recipients = resolveRecipients(group('all_group_messages'), general);
    assert.deepEqual(uids(applyPreferences(recipients, preferences, 'g1')), ['caio']);
  });
});

describe('buildContent', () => {
  it('não expõe o texto da mensagem', () => {
    const direct = buildContent({ conversationType: 'direct', reason: 'direct', senderName: 'Ana', groupName: null });
    assert.deepEqual(direct, { title: 'Ana', body: 'Enviou uma nova mensagem para você.' });
    const mention = buildContent({ conversationType: 'group', reason: 'mention', senderName: 'Ana', groupName: 'Turma' });
    assert.deepEqual(mention, { title: 'Turma', body: 'Ana mencionou você.' });
  });
});
