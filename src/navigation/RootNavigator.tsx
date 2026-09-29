import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { colors, spacing } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import type { PushPayloadData } from '../types/notification';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator<RootStackParamList>();

function ProfilePendingScreen() {
  const { profileError, logout } = useAuth();
  return (
    <View style={styles.pending}>
      {profileError ? (
        <ErrorMessage message={profileError} variant="screen" />
      ) : (
        <Loading message="Carregando seu perfil..." />
      )}
      <View style={styles.pendingAction}>
        <PrimaryButton title="Sair" variant="danger" onPress={() => void logout()} />
      </View>
    </View>
  );
}

export function RootNavigator() {
  const { status, profile, registering } = useAuth();
  // Incrementado a cada montagem pronta do NavigationContainer.
  const [navigationReadyCount, setNavigationReadyCount] = useState(0);
  const [pendingConversation, setPendingConversation] = useState<PushPayloadData | null>(null);
  const isAuthenticated = status === 'authenticated' && profile !== null;

  const handleOpenConversation = useCallback((payload: PushPayloadData) => setPendingConversation(payload), []);

  // Navega para a conversa da notificação assim que a navegação e a sessão estiverem prontas.
  useEffect(() => {
    if (!pendingConversation || navigationReadyCount === 0 || !isAuthenticated || !navigationRef.isReady()) return;
    navigationRef.navigate('Chat', pendingConversation);
    setPendingConversation(null);
  }, [pendingConversation, navigationReadyCount, isAuthenticated]);

  if (status === 'loading') return <Loading message="Recuperando sessão..." />;
  // Durante o cadastro a tela de registro continua montada para exibir loading e erros.
  if (status === 'authenticated' && !profile && !registering) return <ProfilePendingScreen />;

  return (
    <NotificationProvider uid={isAuthenticated ? profile.uid : null} onOpenConversation={handleOpenConversation}>
      <NavigationContainer ref={navigationRef} onReady={() => setNavigationReadyCount((count) => count + 1)}>
        <Stack.Navigator
          screenOptions={{
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
              <Stack.Screen
                name="Users"
                component={UsersScreen}
                options={({ route }) => ({
                  title: route.params.mode === 'select' ? 'Selecionar integrantes' : 'Nova conversa',
                })}
              />
              <Stack.Screen
                name="GroupForm"
                component={GroupFormScreen}
                options={({ route }) => ({ title: route.params?.groupId ? 'Configurações do grupo' : 'Novo grupo' })}
              />
              <Stack.Screen name="Chat" component={ChatScreen} options={{ title: '' }} />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
              <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  pending: { flex: 1, backgroundColor: colors.background },
  pendingAction: { padding: spacing.xl },
});
