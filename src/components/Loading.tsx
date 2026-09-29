import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';

type LoadingProps = {
  message?: string;
};

export function Loading({ message }: LoadingProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message ?? 'Carregando'}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  message: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
