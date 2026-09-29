import { Ionicons } from '@expo/vector-icons';
import { useCallback, useLayoutEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { ConnectivityBanner } from '../components/ConnectivityBanner';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { NotificationStatusBanner } from '../components/NotificationStatusBanner';
import { useNotificationStatus } from '../contexts/NotificationContext';
import { useAuth, useCurrentUser } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { colors, spacing } from '../theme/colors';
import type { ConversationSummary } from '../types/chat';
import type { ScreenProps } from '../types/navigation';

export function ConversationsScreen({ navigation }: ScreenProps<'Conversations'>) {
  const currentUser = useCurrentUser();
  const { logout } = useAuth();
  const notifications = useNotificationStatus();
  const { conversations, loading, error } = useConversations(currentUser.uid);
  const insets = useSafeAreaInsets();

  const confirmLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);
  }, [logout]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Avatar
          uri={currentUser.photoUrl}
          name={currentUser.name}
          size={32}
          onPress={() => navigation.navigate('Profile', { uid: currentUser.uid })}
          accessibilityLabel="Meu perfil"
        />
      ),
      headerRight: () => (
        <Pressable onPress={confirmLogout} accessibilityRole="button" accessibilityLabel="Sair" hitSlop={10}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
        </Pressable>
      ),
    });
  }, [confirmLogout, currentUser, navigation]);

  const openConversation = useCallback(
    (conversation: ConversationSummary) =>
      navigation.navigate('Chat', { conversationId: conversation.id, conversationType: conversation.type }),
    [navigation],
  );

  const renderContent = () => {
    if (loading) return <Loading message="Carregando conversas..." />;
    if (error && conversations.length === 0) return <ErrorMessage message={error} variant="screen" />;
    return (
      <FlatList
        data={conversations}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => (
          <ConversationItem conversation={item} currentUid={currentUser.uid} onPress={openConversation} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : { paddingBottom: 96 + insets.bottom }}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="Nenhuma conversa ainda"
            description="Inicie uma conversa individual ou crie um grupo usando os botões abaixo."
          />
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <ConnectivityBanner />
      <NotificationStatusBanner
        status={notifications.status}
        errorMessage={notifications.errorMessage}
        onRetry={notifications.retry}
        onOpenSettings={notifications.openSettings}
      />
      {renderContent()}
      <View style={[styles.actions, { bottom: spacing.lg + insets.bottom }]}>
        <Pressable
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => navigation.navigate('GroupForm')}
          accessibilityRole="button"
        >
          <Ionicons name="people" size={20} color={colors.group} />
          <Text style={[styles.fabText, { color: colors.group }]}>Novo grupo</Text>
        </Pressable>
        <Pressable
          style={styles.fab}
          onPress={() => navigation.navigate('Users', { mode: 'direct' })}
          accessibilityRole="button"
        >
          <Ionicons name="chatbubble" size={20} color={colors.textOnPrimary} />
          <Text style={styles.fabText}>Nova conversa</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 80 },
  emptyContainer: { flexGrow: 1 },
  actions: { position: 'absolute', right: spacing.lg, left: spacing.lg, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabSecondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.group },
  fabText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
});
