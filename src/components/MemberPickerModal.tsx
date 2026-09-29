import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import type { PublicProfile } from '../types/user';
import { Avatar } from './Avatar';

type MemberPickerModalProps = {
  visible: boolean;
  title: string;
  members: readonly PublicProfile[];
  onSelect: (member: PublicProfile) => void;
  onClose: () => void;
};

export function MemberPickerModal({ visible, title, members, onSelect, onClose }: MemberPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        <FlatList
          data={members}
          keyExtractor={(item) => item.uid}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum outro integrante disponível.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => onSelect(item)}
              accessibilityRole="button"
            >
              <Avatar uri={item.photoUrl} name={item.name} size={36} />
              <Text style={styles.name}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  sheet: {
    maxHeight: '60%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  pressed: { backgroundColor: colors.background },
  name: { fontSize: 16, color: colors.text },
  empty: { color: colors.textMuted, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  cancel: { alignItems: 'center', paddingTop: spacing.md },
  cancelText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});
