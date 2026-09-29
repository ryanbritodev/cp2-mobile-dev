import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';
import { warmUpApi } from './services/apiClient';
import { isFirebaseConfigured } from './services/firebase';
import { colors, spacing } from './theme/colors';

function FirebaseNotConfigured() {
  return (
    <View style={styles.config}>
      <Text style={styles.configTitle}>Firebase não configurado</Text>
      <Text style={styles.configText}>
        Preencha o arquivo firebaseConfig.json na raiz do projeto com a configuração do app Web do seu projeto
        Firebase e reinicie o Metro.
      </Text>
    </View>
  );
}

export default function App() {
  // Hospedagens gratuitas "dormem"; acordamos a API cedo para o primeiro push não atrasar.
  useEffect(() => warmUpApi(), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {isFirebaseConfigured ? (
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      ) : (
        <FirebaseNotConfigured />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  config: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  configTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  configText: { fontSize: 16, color: colors.textMuted },
});
