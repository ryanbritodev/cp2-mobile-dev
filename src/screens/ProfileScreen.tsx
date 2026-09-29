import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useNotificationStatus } from '../contexts/NotificationContext';
import { useAuth, useCurrentUser } from '../hooks/useAuth';
import { usePreferences } from '../hooks/usePreferences';
import { useProfile } from '../hooks/useProfile';
import { getOrCreateDirectConversation } from '../services/chatService';
import { colors, spacing } from '../theme/colors';
import type { NotificationRegistrationStatus } from '../types/notification';
import type { ScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { formatIsoDate } from '../utils/formatters';

const NOT_AVAILABLE = 'Não informado';

const REGISTRATION_LABELS: Record<NotificationRegistrationStatus, string> = {
  idle: 'Aguardando',
  registering: 'Registrando dispositivo...',
  registered: 'Dispositivo registrado para receber push',
  'permission-denied': 'Permissão de notificações negada',
  'no-token': 'Dispositivo sem token de push disponível',
  error: 'Falha ao registrar o dispositivo',
};

type InfoRowProps = { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string | null };

function InfoRow({ icon, label, value }: InfoRowProps) {
  const available = Boolean(value && value.trim());
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.rowTexts}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, !available && styles.rowValueMissing]}>{available ? value : NOT_AVAILABLE}</Text>
      </View>
    </View>
  );
}

function NotificationSettingsSection({ uid }: { uid: string }) {
  const notifications = useNotificationStatus();
  const { preferences, error, togglePush } = usePreferences(uid);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Notificações</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Receber notificações push</Text>
        <Switch value={preferences.pushEnabled} onValueChange={(value) => void togglePush(value)} />
      </View>
      <Text style={styles.status}>{REGISTRATION_LABELS[notifications.status]}</Text>
      {notifications.errorMessage ? <Text style={styles.statusError}>{notifications.errorMessage}</Text> : null}
      {error ? <ErrorMessage message={error} /> : null}
      {notifications.status === 'permission-denied' ? (
        <PrimaryButton title="Abrir configurações" variant="secondary" onPress={notifications.openSettings} />
      ) : null}
      {notifications.status === 'error' ? (
        <PrimaryButton title="Tentar registrar novamente" variant="secondary" onPress={notifications.retry} />
      ) : null}
    </View>
  );
}

export function ProfileScreen({ navigation, route }: ScreenProps<'Profile'>) {
  const { uid } = route.params;
  const currentUser = useCurrentUser();
  const { logout } = useAuth();
  const isSelf = uid === currentUser.uid;
  const { profile, loading, error, reload } = useProfile(uid, currentUser);
  const [openingChat, setOpeningChat] = useState(false);

  const openChat = useCallback(async () => {
    setOpeningChat(true);
    try {
      const conversation = await getOrCreateDirectConversation(currentUser.uid, uid);
      navigation.navigate('Chat', { conversationId: conversation.id, conversationType: 'direct' });
    } catch (openError) {
      Alert.alert('Erro', getErrorMessage(openError));
    } finally {
      setOpeningChat(false);
    }
  }, [currentUser.uid, navigation, uid]);

  if (loading) return <Loading message="Carregando perfil..." />;
  if (error || !profile) return <ErrorMessage message={error ?? 'Perfil indisponível.'} variant="screen" onRetry={reload} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar uri={profile.photoUrl} name={profile.name} size={112} />
        <Text style={styles.name}>{profile.name || NOT_AVAILABLE}</Text>
      </View>

      <View style={styles.card}>
        <InfoRow icon="mail-outline" label="E-mail" value={profile.email} />
        <InfoRow icon="call-outline" label="Celular" value={profile.phoneNumber} />
        <InfoRow icon="calendar-outline" label="Data de nascimento" value={formatIsoDate(profile.birthDate)} />
      </View>

      {isSelf ? (
        <>
          <NotificationSettingsSection uid={currentUser.uid} />
          <PrimaryButton title="Sair da conta" variant="danger" onPress={() => void logout()} />
        </>
      ) : (
        <PrimaryButton title="Enviar mensagem" onPress={() => void openChat()} loading={openingChat} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background },
  header: { alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, gap: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowTexts: { flex: 1 },
  rowLabel: { fontSize: 12, color: colors.textMuted },
  rowValue: { fontSize: 16, color: colors.text },
  rowValueMissing: { color: colors.textMuted, fontStyle: 'italic' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 15, color: colors.text, flex: 1 },
  status: { fontSize: 13, color: colors.textMuted },
  statusError: { fontSize: 13, color: colors.danger },
});
