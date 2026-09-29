import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { getInitials } from '../utils/formatters';

type AvatarProps = {
  uri: string | null | undefined;
  name: string;
  size?: number;
  variant?: 'user' | 'group';
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Foto do usuário/grupo com imagem padrão quando não houver URL ou o carregamento falhar. */
export function Avatar({ uri, name, size = 44, variant = 'user', onPress, accessibilityLabel }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const showImage = Boolean(uri) && !failed;
  const initials = getInitials(name);
  const background = variant === 'group' ? colors.groupSoft : colors.primarySoft;
  const foreground = variant === 'group' ? colors.group : colors.primary;

  const content = showImage ? (
    <Image source={{ uri: uri ?? undefined }} style={[styles.image, dimension]} onError={() => setFailed(true)} />
  ) : (
    <View style={[styles.fallback, dimension, { backgroundColor: background }]}>
      {initials && variant === 'user' ? (
        <Text style={[styles.initials, { color: foreground, fontSize: size * 0.38 }]}>{initials}</Text>
      ) : (
        <Ionicons name={variant === 'group' ? 'people' : 'person'} size={size * 0.5} color={foreground} />
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Abrir ${name}`}
      hitSlop={8}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
