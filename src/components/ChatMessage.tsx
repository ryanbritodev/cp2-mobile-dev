import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import type { ChatListItem } from '../types/chat';
import { formatMessageTime } from '../utils/formatters';

type ChatMessageProps = {
  item: ChatListItem;
  isOwn: boolean;
  /** Nome do autor — exibido apenas em grupos, nas mensagens recebidas. */
  authorName: string | null;
  /** Nome do integrante a quem a mensagem foi direcionada, quando houver. */
  targetName: string | null;
  mentionsCurrentUser: boolean;
  onRetry: (messageId: string) => void;
  onDiscard: (messageId: string) => void;
};

function ChatMessageComponent({ item, isOwn, authorName, targetName, mentionsCurrentUser, onRetry, onDiscard }: ChatMessageProps) {
  const { message, status } = item;
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          mentionsCurrentUser && !isOwn && styles.bubbleMention,
          status === 'failed' && styles.bubbleFailed,
        ]}
      >
        {authorName ? <Text style={styles.author}>{authorName}</Text> : null}
        {targetName ? (
          <View style={styles.target}>
            <Ionicons name="arrow-redo" size={12} color={isOwn ? colors.primarySoft : colors.group} />
            <Text style={[styles.targetText, isOwn && styles.targetTextOwn]}>Para {targetName}</Text>
          </View>
        ) : null}
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.text}</Text>
        <View style={styles.meta}>
          {status === 'sending' ? (
            <Ionicons name="time-outline" size={12} color={isOwn ? colors.primarySoft : colors.textMuted} />
          ) : null}
          {status === 'sent' && isOwn ? <Ionicons name="checkmark" size={12} color={colors.primarySoft} /> : null}
          <Text style={[styles.time, isOwn && styles.timeOwn]}>{formatMessageTime(message.createdAt)}</Text>
        </View>
      </View>
      {status === 'failed' ? (
        <View style={styles.failure}>
          <Text style={styles.failureText}>{item.errorMessage ?? 'Falha no envio.'}</Text>
          <Pressable onPress={() => onRetry(message.id)} accessibilityRole="button" hitSlop={6}>
            <Text style={styles.failureAction}>Reenviar</Text>
          </Pressable>
          <Pressable onPress={() => onDiscard(message.id)} accessibilityRole="button" hitSlop={6}>
            <Text style={styles.failureAction}>Descartar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const ChatMessage = memo(ChatMessageComponent);

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, marginVertical: 3, maxWidth: '100%' },
  rowOwn: { alignItems: 'flex-end' },
  rowOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  bubbleOwn: { backgroundColor: colors.bubbleOwn, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleMention: { borderColor: colors.mention, borderWidth: 2 },
  bubbleFailed: { opacity: 0.7 },
  author: { fontSize: 12, fontWeight: '700', color: colors.group },
  target: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  targetText: { fontSize: 12, fontStyle: 'italic', color: colors.group },
  targetTextOwn: { color: colors.primarySoft },
  text: { fontSize: 16, color: colors.text },
  textOwn: { color: colors.textOnPrimary },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  time: { fontSize: 11, color: colors.textMuted },
  timeOwn: { color: colors.primarySoft },
  failure: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  failureText: { fontSize: 12, color: colors.danger },
  failureAction: { fontSize: 12, color: colors.primary, fontWeight: '700' },
});
