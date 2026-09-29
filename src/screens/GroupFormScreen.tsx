import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner } from '../components/Banner';
import { ErrorMessage } from '../components/ErrorMessage';
import { FormField } from '../components/FormField';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PhotoPicker } from '../components/PhotoPicker';
import { PolicySelector, POLICY_LABELS } from '../components/PolicySelector';
import { PrimaryButton } from '../components/PrimaryButton';
import { useCurrentUser } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { createGroup, leaveGroup, updateGroup } from '../services/groupService';
import { colors, spacing } from '../theme/colors';
import type { ScreenProps } from '../types/navigation';
import type { NotificationPolicy } from '../types/notification';
import { getErrorMessage } from '../utils/errors';
import { availableSlots, MAX_GROUP_MEMBER_LIMIT, parseMemberLimit, validateGroupForm } from '../utils/groupValidation';

const DEFAULT_MEMBER_LIMIT = '10';

export function GroupFormScreen({ navigation, route }: ScreenProps<'GroupForm'>) {
  const groupId = route.params?.groupId;
  const selectedMemberIds = route.params?.selectedMemberIds;
  const isEdit = Boolean(groupId);
  const currentUser = useCurrentUser();
  const { data: group, loading: groupLoading, error: groupError } = useGroup(groupId);

  const [initialized, setInitialized] = useState(!isEdit);
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([currentUser.uid]);
  const [memberLimitText, setMemberLimitText] = useState(DEFAULT_MEMBER_LIMIT);
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerId = group?.ownerId ?? currentUser.uid;
  const isOwner = ownerId === currentUser.uid;

  // Preenche o formulário com os dados do grupo na primeira carga (modo edição).
  useEffect(() => {
    if (!group || initialized) return;
    setName(group.name);
    setMemberIds(group.memberIds);
    setMemberLimitText(String(group.memberLimit));
    setPolicy(group.notificationPolicy);
    setInitialized(true);
  }, [group, initialized]);

  // Integrantes escolhidos na tela de usuários (retornados via parâmetros de navegação).
  useEffect(() => {
    if (!selectedMemberIds) return;
    setMemberIds([ownerId, ...selectedMemberIds.filter((id) => id !== ownerId)]);
  }, [ownerId, selectedMemberIds]);

  const profiles = usePublicProfiles(memberIds);
  const validation = useMemo(() => validateGroupForm({ name, memberLimitText, memberIds }), [name, memberLimitText, memberIds]);
  const parsedLimit = parseMemberLimit(memberLimitText);
  const slots = parsedLimit === null ? null : availableSlots(memberIds.length, parsedLimit);
  const visibleErrors = submitted ? validation.errors : {};

  const openMemberSelection = useCallback(() => {
    navigation.navigate('Users', {
      mode: 'select',
      groupId,
      selectedIds: memberIds,
      lockedIds: [ownerId],
      memberLimit: Math.min(parsedLimit ?? memberIds.length, MAX_GROUP_MEMBER_LIMIT),
    });
  }, [groupId, memberIds, navigation, ownerId, parsedLimit]);

  const removeLocalMember = useCallback((uid: string) => {
    setMemberIds((previous) => previous.filter((id) => id !== uid));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitted(true);
    if (!validation.isValid || validation.memberLimit === null) return;
    setSaving(true);
    setError(null);
    try {
      if (!groupId || !group) {
        const result = await createGroup(currentUser.uid, {
          name,
          photoUri,
          memberIds,
          memberLimit: validation.memberLimit,
          notificationPolicy: policy,
        });
        if (result.warning) Alert.alert('Grupo criado', result.warning);
        navigation.replace('Chat', { conversationId: result.groupId, conversationType: 'group' });
        return;
      }
      const original = new Set(group.memberIds);
      const current = new Set(memberIds);
      const result = await updateGroup(groupId, currentUser.uid, {
        name,
        photoUri,
        memberLimit: validation.memberLimit,
        notificationPolicy: policy,
        addMemberIds: memberIds.filter((id) => !original.has(id)),
        removeMemberIds: group.memberIds.filter((id) => !current.has(id)),
      });
      Alert.alert('Grupo atualizado', result.warning ?? 'As alterações foram salvas.');
      navigation.goBack();
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Não foi possível salvar o grupo.'));
      setSaving(false);
    }
  }, [currentUser.uid, group, groupId, memberIds, name, navigation, photoUri, policy, validation]);

  const handleLeave = useCallback(() => {
    if (!groupId) return;
    Alert.alert('Sair do grupo', 'Você deixará de receber as mensagens deste grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          leaveGroup(groupId, currentUser.uid)
            .then(() => navigation.popToTop())
            .catch((leaveError: unknown) => Alert.alert('Erro', getErrorMessage(leaveError)));
        },
      },
    ]);
  }, [currentUser.uid, groupId, navigation]);

  if (isEdit && (groupLoading || (!initialized && !groupError))) return <Loading message="Carregando grupo..." />;
  if (isEdit && groupError) return <ErrorMessage message={groupError} variant="screen" />;

  const readOnly = !isOwner;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {readOnly ? <Banner tone="info" message="Somente o proprietário pode alterar as configurações do grupo." /> : null}

        <PhotoPicker uri={photoUri ?? group?.photoUrl ?? null} name={name} onChange={setPhotoUri} variant="group" disabled={readOnly || saving} />

        <FormField
          label="Nome do grupo"
          value={name}
          onChangeText={setName}
          error={visibleErrors.name}
          editable={!readOnly && !saving}
          placeholder="Ex.: Turma de Mobile"
          maxLength={60}
        />

        <FormField
          label="Limite máximo de integrantes"
          value={memberLimitText}
          onChangeText={(value) => setMemberLimitText(value.replace(/\D/g, ''))}
          error={visibleErrors.memberLimit ?? (parsedLimit !== null && parsedLimit < memberIds.length ? validation.errors.memberLimit : undefined)}
          keyboardType="number-pad"
          editable={!readOnly && !saving}
          hint={`Inclui o proprietário. Entre 2 e ${MAX_GROUP_MEMBER_LIMIT}.`}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Integrantes</Text>
            <Text style={styles.capacity}>
              {memberIds.length}
              {parsedLimit !== null ? ` de ${parsedLimit}` : ''}
              {slots !== null ? ` · ${slots === 0 ? 'sem vagas' : `${slots} vaga(s)`}` : ''}
            </Text>
          </View>
          {slots === 0 && !readOnly ? <Banner tone="warning" message="Grupo sem vagas. Aumente o limite para adicionar integrantes." /> : null}
          {visibleErrors.members ? <Text style={styles.errorText}>{visibleErrors.members}</Text> : null}
          <View style={styles.members}>
            {memberIds.map((uid) => (
              <GroupMemberItem
                key={uid}
                uid={uid}
                name={profiles[uid]?.name ?? 'Carregando...'}
                photoUrl={profiles[uid]?.photoUrl ?? ''}
                isOwner={uid === ownerId}
                isCurrentUser={uid === currentUser.uid}
                onPress={(memberUid) => navigation.navigate('Profile', { uid: memberUid })}
                onRemove={readOnly || saving ? undefined : removeLocalMember}
              />
            ))}
          </View>
          {!readOnly ? (
            <PrimaryButton title="Selecionar integrantes" variant="secondary" onPress={openMemberSelection} disabled={saving} />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificações push</Text>
          {readOnly ? (
            <Text style={styles.policyReadOnly}>{POLICY_LABELS[policy].title} — {POLICY_LABELS[policy].description}</Text>
          ) : (
            <PolicySelector value={policy} onChange={setPolicy} disabled={saving} />
          )}
        </View>

        {error ? <ErrorMessage message={error} /> : null}

        {readOnly ? (
          <PrimaryButton title="Sair do grupo" variant="danger" onPress={handleLeave} />
        ) : (
          <PrimaryButton title={isEdit ? 'Salvar alterações' : 'Criar grupo'} onPress={() => void handleSave()} loading={saving} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  capacity: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  members: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  errorText: { color: colors.danger, fontSize: 13 },
  policyReadOnly: { fontSize: 14, color: colors.textMuted },
});
