import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorMessage } from '../components/ErrorMessage';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing } from '../theme/colors';
import type { ScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { isValidEmail } from '../utils/formatters';

export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => isValidEmail(email) && password.length > 0, [email, password]);

  const handleLogin = useCallback(async () => {
    if (!canSubmit) {
      setError('Informe um e-mail válido e a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'Não foi possível entrar. Tente novamente.'));
      setLoading(false);
    }
  }, [canSubmit, email, login, password]);

  const handleResetPassword = useCallback(async () => {
    if (!isValidEmail(email)) {
      setError('Digite seu e-mail para receber o link de redefinição de senha.');
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert('Verifique seu e-mail', 'Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha.');
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    }
  }, [email, resetPassword]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>💬</Text>
            <Text style={styles.title}>Chat Firebase</Text>
            <Text style={styles.subtitle}>Converse com amigos e grupos em tempo real</Text>
          </View>

          <FormField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="voce@email.com"
            textContentType="emailAddress"
          />
          <FormField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="Sua senha"
            textContentType="password"
            onSubmitEditing={() => void handleLogin()}
          />

          {error ? <ErrorMessage message={error} /> : null}

          <PrimaryButton title="Entrar" onPress={() => void handleLogin()} loading={loading} />
          <PrimaryButton title="Criar conta" variant="secondary" onPress={() => navigation.navigate('Register')} disabled={loading} />

          <Pressable onPress={() => void handleResetPassword()} accessibilityRole="button" style={styles.forgot}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  header: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  logo: { fontSize: 56 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  forgot: { alignItems: 'center', padding: spacing.sm },
  forgotText: { color: colors.primary, fontWeight: '600' },
});
