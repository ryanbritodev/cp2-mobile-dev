import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { ErrorMessage } from '../components/ErrorMessage';
import { FormField } from '../components/FormField';
import { PhotoPicker } from '../components/PhotoPicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing } from '../theme/colors';
import type { ScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { isValidEmail, isValidPhone, maskBirthDate, maskPhone, parseBirthDate } from '../utils/formatters';

type RegisterForm = {
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
};

type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const EMPTY_FORM: RegisterForm = { name: '', email: '', phoneNumber: '', birthDate: '', password: '', confirmPassword: '' };

function validate(form: RegisterForm): RegisterErrors {
  const errors: RegisterErrors = {};
  if (form.name.trim().length < 2) errors.name = 'Informe seu nome.';
  if (!isValidEmail(form.email)) errors.email = 'Informe um e-mail válido.';
  if (!isValidPhone(form.phoneNumber)) errors.phoneNumber = 'Informe um celular com DDD.';
  if (!parseBirthDate(form.birthDate)) errors.birthDate = 'Informe uma data válida (DD/MM/AAAA).';
  if (form.password.length < 6) errors.password = 'A senha deve ter pelo menos 6 caracteres.';
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'As senhas não conferem.';
  return errors;
}

export function RegisterScreen(_props: ScreenProps<'Register'>) {
  const { register } = useAuth();
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = useMemo(() => validate(form), [form]);
  const visibleErrors = submitted ? errors : {};

  const updateField = useCallback(
    (field: keyof RegisterForm) => (value: string) => setForm((previous) => ({ ...previous, [field]: value })),
    [],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitted(true);
    const birthDate = parseBirthDate(form.birthDate);
    if (Object.keys(errors).length > 0 || !birthDate) return;
    setLoading(true);
    setError(null);
    try {
      // Ao concluir, o AuthContext detecta a sessão e leva o usuário às conversas.
      const result = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber,
        birthDate,
        photoUri,
      });
      if (result.warning) Alert.alert('Conta criada', result.warning);
    } catch (registerError) {
      setError(getErrorMessage(registerError, 'Não foi possível criar a conta.'));
      setLoading(false);
    }
  }, [errors, form, photoUri, register]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <PhotoPicker uri={photoUri} name={form.name} onChange={setPhotoUri} disabled={loading} />

        <FormField label="Nome" value={form.name} onChangeText={updateField('name')} error={visibleErrors.name} autoComplete="name" placeholder="Seu nome completo" />
        <FormField
          label="E-mail"
          value={form.email}
          onChangeText={updateField('email')}
          error={visibleErrors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="voce@email.com"
        />
        <FormField
          label="Celular"
          value={form.phoneNumber}
          onChangeText={(value) => updateField('phoneNumber')(maskPhone(value))}
          error={visibleErrors.phoneNumber}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
        />
        <FormField
          label="Data de nascimento"
          value={form.birthDate}
          onChangeText={(value) => updateField('birthDate')(maskBirthDate(value))}
          error={visibleErrors.birthDate}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
        />
        <FormField
          label="Senha"
          value={form.password}
          onChangeText={updateField('password')}
          error={visibleErrors.password}
          secureTextEntry
          autoComplete="new-password"
          placeholder="Mínimo de 6 caracteres"
        />
        <FormField
          label="Confirmar senha"
          value={form.confirmPassword}
          onChangeText={updateField('confirmPassword')}
          error={visibleErrors.confirmPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="Repita a senha"
        />

        {error ? <ErrorMessage message={error} /> : null}
        <PrimaryButton title="Criar conta" onPress={() => void handleSubmit()} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 },
});
