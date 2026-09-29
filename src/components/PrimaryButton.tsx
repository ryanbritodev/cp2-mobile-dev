import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
};

const VARIANT_STYLES: Record<ButtonVariant, { background: string; text: string; border: string }> = {
  primary: { background: colors.primary, text: colors.textOnPrimary, border: colors.primary },
  secondary: { background: colors.surface, text: colors.primary, border: colors.primary },
  danger: { background: colors.surface, text: colors.danger, border: colors.danger },
  ghost: { background: 'transparent', text: colors.primary, border: 'transparent' },
};

export function PrimaryButton({ title, onPress, loading = false, disabled = false, variant = 'primary' }: PrimaryButtonProps) {
  const palette = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.background, borderColor: palette.border },
        (pressed || isDisabled) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: { fontSize: 16, fontWeight: '600' },
  dimmed: { opacity: 0.6 },
});
