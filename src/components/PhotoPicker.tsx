import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import { Avatar } from './Avatar';

type PhotoPickerProps = {
  uri: string | null;
  name: string;
  onChange: (uri: string) => void;
  variant?: 'user' | 'group';
  disabled?: boolean;
};

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

function showPermissionDenied(source: string) {
  Alert.alert(
    'Permissão necessária',
    `Permita o acesso à ${source} nas configurações do aparelho para escolher uma foto.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
    ],
  );
}

/** Seleção de foto pela câmera ou galeria, com solicitação e tratamento de permissões. */
export function PhotoPicker({ uri, name, onChange, variant = 'user', disabled = false }: PhotoPickerProps) {
  const pickFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showPermissionDenied('galeria');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) onChange(asset.uri);
  }, [onChange]);

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showPermissionDenied('câmera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) onChange(asset.uri);
  }, [onChange]);

  const handlePress = useCallback(() => {
    const run = (action: () => Promise<void>) => () => {
      action().catch(() => Alert.alert('Erro', 'Não foi possível abrir a imagem. Tente novamente.'));
    };
    Alert.alert('Foto', 'Escolha a origem da imagem', [
      { text: 'Câmera', onPress: run(pickFromCamera) },
      { text: 'Galeria', onPress: run(pickFromLibrary) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [pickFromCamera, pickFromLibrary]);

  return (
    <View style={styles.container}>
      <Avatar uri={uri} name={name || '?'} size={96} variant={variant} />
      <Pressable onPress={handlePress} disabled={disabled} accessibilityRole="button" hitSlop={8}>
        <Text style={[styles.action, disabled && styles.disabled]}>{uri ? 'Alterar foto' : 'Escolher foto'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm },
  action: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
