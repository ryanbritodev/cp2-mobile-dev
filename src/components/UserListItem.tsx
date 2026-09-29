import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import type { PublicProfile } from '../types/user';
import { Avatar } from './Avatar';

type UserListItemProps = {
  user: PublicProfile;
  onPress: (user: PublicProfile) => void;
  /** Quando definido, exibe uma caixa de seleção (modo seleção de integrantes). */
  selected?: boolean;
  disabled?: boolean;
  caption?: string;
};

function UserListItemComponent({ user, onPress, selected, disabled = false, caption }: UserListItemProps) {
  const selectable = selected !== undefined;
  return (
    <Pressable
      onPress={() => onPress(user)}
      disabled={disabled}
      style={({ pressed }) => [styles.container, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={selectable ? { checked: selected, disabled } : { disabled }}
    >
      <Avatar uri={user.photoUrl} name={user.name} size={44} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {selectable ? (
        <Ionicons
          name={selected ? 'checkbox' : 'square-outline'}
          size={24}
          color={selected ? colors.primary : colors.textMuted}
        />
      ) : (
        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
      )}
    </Pressable>
  );
}

export const UserListItem = memo(UserListItemComponent);

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
  disabled: { opacity: 0.5 },
  body: { flex: 1 },
  name: { fontSize: 16, color: colors.text, fontWeight: '500' },
  caption: { fontSize: 12, color: colors.textMuted },
});
