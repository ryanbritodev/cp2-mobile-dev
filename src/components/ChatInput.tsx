import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MESSAGE_MAX_LENGTH } from '../services/chatService';
import { colors, spacing } from '../theme/colors';
import type { MessageDraft, MessageTarget } from '../types/chat';
import type { PublicProfile } from '../types/user';
import { appendMention, extractMentionedUserIds } from '../utils/mentions';
import { MemberPickerModal } from './MemberPickerModal';

type ChatInputProps = {
  onSend: (draft: MessageDraft) => void;
  currentUid: string;
  /** Outros integrantes do grupo; vazio em conversas individuais (sem menções). */
  members: readonly PublicProfile[];
  disabled?: boolean;
};

type PickerMode = 'mention' | 'target' | null;

export function ChatInput({ onSend, currentUid, members, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const [target, setTarget] = useState<MessageTarget>({ type: 'conversation' });
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  const canMention = members.length > 0;
  const trimmed = text.trim();
  const canSend = !disabled && trimmed.length > 0;

  const targetName = useMemo(() => {
    if (target.type !== 'member') return null;
    return members.find((member) => member.uid === target.memberId)?.name ?? 'integrante';
  }, [members, target]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend({
      text: trimmed,
      target,
      mentionedUserIds: extractMentionedUserIds(trimmed, members, currentUid),
    });
    setText('');
    setTarget({ type: 'conversation' });
  }, [canSend, currentUid, members, onSend, target, trimmed]);

  const handlePick = useCallback(
    (member: PublicProfile) => {
      if (pickerMode === 'mention') setText((previous) => appendMention(previous, member.name));
      if (pickerMode === 'target') setTarget({ type: 'member', memberId: member.uid });
      setPickerMode(null);
    },
    [pickerMode],
  );

  return (
    <View style={styles.wrapper}>
      {targetName ? (
        <View style={styles.targetChip}>
          <Ionicons name="arrow-redo" size={14} color={colors.group} />
          <Text style={styles.targetText}>Direcionada a {targetName}</Text>
          <Pressable
            onPress={() => setTarget({ type: 'conversation' })}
            accessibilityRole="button"
            accessibilityLabel="Remover destinatário"
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={colors.group} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.container}>
        {canMention ? (
          <>
            <Pressable
              onPress={() => setPickerMode('mention')}
              accessibilityRole="button"
              accessibilityLabel="Mencionar integrante"
              hitSlop={6}
              style={styles.iconButton}
            >
              <Ionicons name="at" size={22} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => setPickerMode('target')}
              accessibilityRole="button"
              accessibilityLabel="Direcionar a um integrante"
              hitSlop={6}
              style={styles.iconButton}
            >
              <Ionicons name="person-add-outline" size={20} color={colors.primary} />
            </Pressable>
          </>
        ) : null}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Digite uma mensagem"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          editable={!disabled}
          accessibilityLabel="Mensagem"
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.send, !canSend && styles.sendDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
        >
          <Ionicons name="send" size={20} color={colors.textOnPrimary} />
        </Pressable>
      </View>
      <MemberPickerModal
        visible={pickerMode !== null}
        title={pickerMode === 'target' ? 'Direcionar mensagem a' : 'Mencionar integrante'}
        members={members}
        onSelect={handlePick}
        onClose={() => setPickerMode(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.groupSoft,
  },
  targetText: { color: colors.group, fontSize: 13, fontWeight: '600' },
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, padding: spacing.sm },
  iconButton: { height: 44, width: 34, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: colors.textMuted },
});
