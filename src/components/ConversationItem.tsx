import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import type { ConversationSummary } from '../types/chat';
import { formatListTimestamp } from '../utils/formatters';
import { Avatar } from './Avatar';

type ConversationItemProps = {
  conversation: ConversationSummary;
  currentUid: string;
  onPress: (conversation: ConversationSummary) => void;
};

function ConversationItemComponent({ conversation, currentUid, onPress }: ConversationItemProps) {
  const isGroup = conversation.type === 'group';
  const last = conversation.lastMessage;
  const preview = last
    ? `${last.senderId === currentUid ? 'Você: ' : ''}${last.text}`
    : isGroup
      ? `${conversation.memberCount} integrantes · sem mensagens`
      : 'Nenhuma mensagem ainda';

  return (
    <Pressable
      onPress={() => onPress(conversation)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${isGroup ? 'Grupo' : 'Conversa com'} ${conversation.title}`}
    >
      <Avatar uri={conversation.photoUrl} name={conversation.title} size={52} variant={isGroup ? 'group' : 'user'} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {conversation.title}
          </Text>
          <Text style={styles.time}>{last ? formatListTimestamp(last.createdAt) : ''}</Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: isGroup ? colors.groupSoft : colors.directSoft }]}>
            <Ionicons name={isGroup ? 'people' : 'person'} size={11} color={isGroup ? colors.group : colors.direct} />
            <Text style={[styles.badgeText, { color: isGroup ? colors.group : colors.direct }]}>
              {isGroup ? 'Grupo' : 'Individual'}
            </Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {preview}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const ConversationItem = memo(ConversationItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.background },
  body: { flex: 1, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  time: { fontSize: 12, color: colors.textMuted },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  preview: { flex: 1, fontSize: 14, color: colors.textMuted },
});
