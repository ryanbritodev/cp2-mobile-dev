import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Banner } from '../components/Banner';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { ConnectivityBanner } from '../components/ConnectivityBanner';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useCurrentUser } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { usePreferences } from '../hooks/usePreferences';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { colors, spacing } from '../theme/colors';
import type { ChatListItem } from '../types/chat';
import type { ScreenProps } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { getOtherParticipantId } from '../utils/conversationId';

export function ChatScreen({ navigation, route }: ScreenProps<'Chat'>) {
  const { conversationId, conversationType } = route.params;
  const isGroup = conversationType === 'group';
  const currentUser = useCurrentUser();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const groupState = useGroup(isGroup ? conversationId : undefined);
  const group = groupState.data;
  const otherUserId = isGroup ? null : getOtherParticipantId(conversationId, currentUser.uid);

  const chat = useChat({ conversationId, conversationType, currentUid: currentUser.uid });
  const { preferences, toggleMute } = usePreferences(currentUser.uid);
  const isMuted = preferences.mutedConversationIds.includes(conversationId);

  // Perfis de integrantes atuais, do outro participante e de autores antigos das mensagens.
  const profileIds = useMemo(() => {
    const senders = chat.items.map((item) => item.message.senderId);
    const members = group?.memberIds ?? [];
    return [...new Set([...members, ...senders, ...(otherUserId ? [otherUserId] : [])])];
  }, [chat.items, group?.memberIds, otherUserId]);
  const profiles = usePublicProfiles(profileIds);

  const otherProfile = otherUserId ? profiles[otherUserId] : undefined;
  const title = isGroup ? (group?.name ?? 'Grupo') : (otherProfile?.name ?? 'Conversa');
  const photoUrl = isGroup ? (group?.photoUrl ?? '') : (otherProfile?.photoUrl ?? '');
  const isMember = isGroup ? Boolean(group?.memberIds.includes(currentUser.uid)) : otherUserId !== null;

  const mentionableMembers = useMemo<PublicProfile[]>(
    () =>
      (group?.memberIds ?? [])
        .filter((uid) => uid !== currentUser.uid)
        .map((uid) => profiles[uid])
        .filter((profile): profile is PublicProfile => profile !== undefined),
    [currentUser.uid, group?.memberIds, profiles],
  );

  const openAvatarTarget = useCallback(() => {
    if (isGroup) navigation.navigate('GroupMembers', { groupId: conversationId });
    else if (otherUserId) navigation.navigate('Profile', { uid: otherUserId });
  }, [conversationId, isGroup, navigation, otherUserId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={openAvatarTarget} style={styles.headerTitle} accessibilityRole="button">
          <Avatar uri={photoUrl} name={title} size={34} variant={isGroup ? 'group' : 'user'} onPress={openAvatarTarget} />
          <View style={styles.headerTexts}>
            <Text style={styles.headerName} numberOfLines={1}>
              {title}
            </Text>
            {isGroup && group ? (
              <Text style={styles.headerSubtitle}>{group.memberIds.length} integrantes · toque para ver</Text>
            ) : null}
          </View>
        </Pressable>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => void toggleMute(conversationId, !isMuted)}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Reativar notificações desta conversa' : 'Silenciar esta conversa'}
            hitSlop={8}
          >
            <Ionicons name={isMuted ? 'notifications-off' : 'notifications-outline'} size={22} color={colors.primary} />
          </Pressable>
          {isGroup && isMember ? (
            <Pressable
              onPress={() => navigation.navigate('GroupForm', { groupId: conversationId })}
              accessibilityRole="button"
              accessibilityLabel="Configurações do grupo"
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ),
    });
  }, [conversationId, group, isGroup, isMember, isMuted, navigation, openAvatarTarget, photoUrl, title, toggleMute]);

  // FlatList invertida: a mensagem mais recente fica embaixo e a rolagem acompanha novas mensagens.
  const invertedItems = useMemo(() => [...chat.items].reverse(), [chat.items]);

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      const { message } = item;
      const isOwn = message.senderId === currentUser.uid;
      const targetName =
        message.target.type === 'member'
          ? message.target.memberId === currentUser.uid
            ? 'você'
            : (profiles[message.target.memberId]?.name ?? 'integrante')
          : null;
      const mentionsCurrentUser =
        message.mentionedUserIds.includes(currentUser.uid) ||
        (message.target.type === 'member' && message.target.memberId === currentUser.uid);
      return (
        <ChatMessage
          item={item}
          isOwn={isOwn}
          authorName={isGroup && !isOwn ? (profiles[message.senderId]?.name ?? 'Integrante') : null}
          targetName={targetName}
          mentionsCurrentUser={mentionsCurrentUser}
          onRetry={chat.retry}
          onDiscard={chat.discard}
        />
      );
    },
    [chat.discard, chat.retry, currentUser.uid, isGroup, profiles],
  );

  const groupUnavailable = isGroup && !groupState.loading && (!group || !isMember);
  const inputDisabled = groupUnavailable || chat.error !== null;

  const renderMessages = () => {
    if (groupUnavailable) {
      return <ErrorMessage message="Você não participa mais deste grupo." variant="screen" />;
    }
    if (chat.loading) return <Loading message="Carregando mensagens..." />;
    if (chat.error) return <ErrorMessage message={chat.error} variant="screen" />;
    return (
      <FlatList
        data={invertedItems}
        inverted
        keyExtractor={(item) => item.message.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <EmptyState icon="chatbubble-ellipses-outline" title="Nenhuma mensagem ainda" description="Envie a primeira mensagem!" />
          </View>
        }
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <ConnectivityBanner />
      {chat.pushWarning ? <Banner tone="warning" message={chat.pushWarning} onDismiss={chat.dismissPushWarning} /> : null}
      <View style={styles.messages}>{renderMessages()}</View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.surface }}>
        <ChatInput
          onSend={chat.send}
          currentUid={currentUser.uid}
          members={isGroup ? mentionableMembers : []}
          disabled={inputDisabled}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  messages: { flex: 1 },
  list: { paddingVertical: spacing.md, flexGrow: 1 },
  // Na lista invertida o estado vazio também é invertido; desfazemos para exibir corretamente.
  emptyWrapper: { flex: 1, transform: [{ scaleY: -1 }] },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 230 },
  headerTexts: { flexShrink: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textMuted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
