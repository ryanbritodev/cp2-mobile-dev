import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import { PrimaryButton } from './PrimaryButton';

type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
  /** `inline` para mensagens dentro de formulários; `screen` para ocupar a tela. */
  variant?: 'inline' | 'screen';
};

export function ErrorMessage({ message, onRetry, variant = 'inline' }: ErrorMessageProps) {
  if (variant === 'inline') {
    return (
      <View style={styles.inline} accessibilityRole="alert">
        <Ionicons name="alert-circle" size={18} color={colors.danger} />
        <Text style={styles.inlineText}>{message}</Text>
      </View>
    );
  }
  return (
    <View style={styles.screen} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
      <Text style={styles.screenText}>{message}</Text>
      {onRetry ? <PrimaryButton title="Tentar novamente" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    padding: spacing.md,
  },
  inlineText: { color: colors.danger, flex: 1, fontSize: 14 },
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  screenText: { color: colors.text, fontSize: 16, textAlign: 'center' },
});
