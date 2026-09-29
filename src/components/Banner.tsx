import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';

type BannerTone = 'info' | 'warning' | 'danger' | 'success';

type BannerProps = {
  tone: BannerTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
};

const TONES: Record<BannerTone, { background: string; foreground: string; icon: ComponentProps<typeof Ionicons>['name'] }> = {
  info: { background: colors.primarySoft, foreground: colors.primaryDark, icon: 'information-circle' },
  warning: { background: colors.warningSoft, foreground: colors.warning, icon: 'warning' },
  danger: { background: colors.dangerSoft, foreground: colors.danger, icon: 'alert-circle' },
  success: { background: colors.successSoft, foreground: colors.success, icon: 'checkmark-circle' },
};

export function Banner({ tone, message, actionLabel, onAction, onDismiss }: BannerProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.container, { backgroundColor: palette.background }]} accessibilityRole="alert">
      <Ionicons name={palette.icon} size={18} color={palette.foreground} />
      <Text style={[styles.message, { color: palette.foreground }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.action, { color: palette.foreground }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Fechar aviso" hitSlop={8}>
          <Ionicons name="close" size={18} color={palette.foreground} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  message: { flex: 1, fontSize: 13 },
  action: { fontWeight: '700', fontSize: 13 },
});
