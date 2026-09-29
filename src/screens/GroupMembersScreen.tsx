import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { POLICY_LABELS } from '../components/PolicySelector';
import { useCurrentUser } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { colors, spacing } from '../theme/colors';
import type { ScreenProps } from '../types/navigation';
import { availableSlots } from '../utils/groupValidation';

export function GroupMembersScreen({ navigation, route }: ScreenProps<'GroupMembers'>) {
  const { groupId } = route.params;
  const currentUser = useCurrentUser();
  const { data: group, loading, error } = useGroup(groupId);
  const memberIds = useMemo(() => group?.memberIds ?? [], [group?.memberIds]);
  const profiles = usePublicProfiles(memberIds);

  // Proprietário primeiro, demais integrantes em ordem alfabética.
  const sortedMemberIds = useMemo(
    () =>
      [...memberIds].sort((a, b) => {
        if (a === group?.ownerId) return -1;
        if (b === group?.ownerId) return 1;
        return (profiles[a]?.name ?? '').localeCompare(profiles[b]?.name ?? '');
      }),
    [group?.ownerId, memberIds, profiles],
  );

  const openProfile = useCallback((uid: string) => navigation.navigate('Profile', { uid }), [navigation]);

  if (loading) return <Loading message="Carregando integrantes..." />;
  if (error || !group) return <ErrorMessage message={error ?? 'Grupo indisponível.'} variant="screen" />;

  const slots = availableSlots(group.memberIds.length, group.memberLimit);

  return (
    <FlatList
      style={styles.list}
      data={sortedMemberIds}
      keyExtractor={(uid) => uid}
      ListHeaderComponent={
        <View style={styles.header}>
          <Avatar uri={group.photoUrl} name={group.name} size={104} variant="group" />
          <Text style={styles.name}>{group.name}</Text>
          <Text style={styles.meta}>
            {group.memberIds.length} de {group.memberLimit} integrantes · {slots === 0 ? 'sem vagas' : `${slots} vaga(s)`}
          </Text>
          <Text style={styles.meta}>Push: {POLICY_LABELS[group.notificationPolicy].title}</Text>
          <View style={styles.button}>
            <PrimaryButton
              title={group.ownerId === currentUser.uid ? 'Gerenciar grupo' : 'Detalhes do grupo'}
              variant="secondary"
              onPress={() => navigation.navigate('GroupForm', { groupId })}
            />
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <GroupMemberItem
          uid={item}
          name={profiles[item]?.name ?? 'Carregando...'}
          photoUrl={profiles[item]?.photoUrl ?? ''}
          isOwner={item === group.ownerId}
          isCurrentUser={item === currentUser.uid}
          onPress={openProfile}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  meta: { fontSize: 14, color: colors.textMuted },
  button: { alignSelf: 'stretch', marginTop: spacing.sm },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 68 },
});
