import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner } from '../components/Banner';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { UserListItem } from '../components/UserListItem';
import { useCurrentUser } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import { getOrCreateDirectConversation } from '../services/chatService';
import { colors, spacing } from '../theme/colors';
import type { ScreenProps } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { availableSlots } from '../utils/groupValidation';

export function UsersScreen({ navigation, route }: ScreenProps<'Users'>) {
  const params = route.params;
  const currentUser = useCurrentUser();
  const { users, search, setSearch, loading, error, reload } = useUsers(currentUser.uid);
  const [openingUid, setOpeningUid] = useState<string | null>(null);

  const isSelectMode = params.mode === 'select';
  const lockedIds = useMemo(() => (params.mode === 'select' ? params.lockedIds : []), [params]);
  const memberLimit = params.mode === 'select' ? params.memberLimit : 0;
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    params.mode === 'select' ? [...new Set([currentUser.uid, ...params.selectedIds])] : [],
  );
  const insets = useSafeAreaInsets();

  const slots = availableSlots(selectedIds.length, memberLimit);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const startDirectConversation = useCallback(
    async (user: PublicProfile) => {
      setOpeningUid(user.uid);
      try {
        const conversation = await getOrCreateDirectConversation(currentUser.uid, user.uid);
        navigation.replace('Chat', { conversationId: conversation.id, conversationType: 'direct' });
      } catch (openError) {
        Alert.alert('Não foi possível abrir a conversa', getErrorMessage(openError));
        setOpeningUid(null);
      }
    },
    [currentUser.uid, navigation],
  );

  const toggleSelection = useCallback(
    (user: PublicProfile) => {
      if (lockedIds.includes(user.uid)) return;
      setSelectedIds((previous) => {
        if (previous.includes(user.uid)) return previous.filter((id) => id !== user.uid);
        if (previous.length >= memberLimit) {
          Alert.alert('Grupo sem vagas', `O limite atual é de ${memberLimit} integrantes. Aumente o limite para adicionar mais pessoas.`);
          return previous;
        }
        return [...previous, user.uid];
      });
    },
    [lockedIds, memberLimit],
  );

  const confirmSelection = useCallback(() => {
    if (params.mode !== 'select') return;
    navigation.popTo('GroupForm', { groupId: params.groupId, selectedMemberIds: selectedIds }, { merge: true });
  }, [navigation, params, selectedIds]);

  const handlePress = useCallback(
    (user: PublicProfile) => {
      if (isSelectMode) toggleSelection(user);
      else if (!openingUid) void startDirectConversation(user);
    },
    [isSelectMode, openingUid, startDirectConversation, toggleSelection],
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          accessibilityLabel="Buscar usuários"
        />
      </View>

      {isSelectMode ? (
        slots === 0 ? (
          <Banner tone="warning" message={`Grupo sem vagas: ${selectedIds.length} de ${memberLimit} integrantes.`} />
        ) : (
          <Banner tone="info" message={`${selectedIds.length} de ${memberLimit} integrantes · ${slots} vaga(s) disponível(is).`} />
        )
      ) : null}

      {loading ? (
        <Loading message="Carregando usuários..." />
      ) : error ? (
        <ErrorMessage message={error} variant="screen" onRetry={reload} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <UserListItem
              user={item}
              onPress={handlePress}
              selected={isSelectMode ? selectedSet.has(item.uid) : undefined}
              disabled={lockedIds.includes(item.uid) || (openingUid !== null && openingUid !== item.uid)}
              caption={openingUid === item.uid ? 'Abrindo conversa...' : lockedIds.includes(item.uid) ? 'Integrante fixo' : undefined}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={users.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={search ? 'Nenhum usuário encontrado' : 'Nenhum outro usuário cadastrado'}
              description={search ? 'Tente buscar por outro nome.' : 'Convide seus amigos para criar uma conta.'}
            />
          }
        />
      )}

      {isSelectMode ? (
        <View style={[styles.footer, { paddingBottom: spacing.lg + insets.bottom }]}>
          <Text style={styles.footerText}>{selectedIds.length} selecionado(s)</Text>
          <View style={styles.footerButton}>
            <PrimaryButton title="Confirmar" onPress={confirmSelection} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, height: 44, fontSize: 16, color: colors.text },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 72 },
  emptyContainer: { flexGrow: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: { flex: 1, color: colors.text, fontSize: 15 },
  footerButton: { flex: 1 },
});
