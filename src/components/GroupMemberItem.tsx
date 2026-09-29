import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import { Avatar } from './Avatar';

type GroupMemberItemProps = {
  uid: string;
  name: string;
  photoUrl: string;
  isOwner: boolean;
  isCurrentUser: boolean;
  onPress?: (uid: string) => void;
  onRemove?: (uid: string) => void;
};

export function GroupMemberItem({ uid, name, photoUrl, isOwner, isCurrentUser, onPress, onRemove }: GroupMemberItemProps) {
  return (
    <Pressable
      onPress={onPress ? () => onPress(uid) : undefined}
      disabled={!onPress}
      style={({ pressed }) => [styles.container, pressed && onPress ? styles.pressed : null]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Perfil de ${name}`}
    >
      <Avatar uri={photoUrl} name={name} size={40} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
          {isCurrentUser ? ' (você)' : ''}
        </Text>
        {isOwner ? <Text style={styles.owner}>Proprietário</Text> : null}
      </View>
      {onRemove && !isOwner ? (
        <Pressable
          onPress={() => onRemove(uid)}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${name}`}
          hitSlop={10}
        >
          <Ionicons name="remove-circle-outline" size={24} color={colors.danger} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.background },
  body: { flex: 1 },
  name: { fontSize: 15, color: colors.text },
  owner: { fontSize: 12, color: colors.group, fontWeight: '700' },
});
