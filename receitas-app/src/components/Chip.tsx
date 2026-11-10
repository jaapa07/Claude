import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../lib/theme';

interface Props {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({ label, active, onPress }: Props) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        styles.chip,
        { backgroundColor: active ? t.primary : t.chip, borderColor: active ? t.primary : t.border },
      ]}
    >
      <Text style={[styles.label, { color: active ? t.primaryText : t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  label: { fontSize: 14, fontWeight: '600' },
});
