import { StyleSheet, Text, View } from 'react-native';

const colors: Record<string, string> = {
  PENDING: '#9A6700',
  CONFIRMED: '#1769aa',
  CANCELLED: '#b00020',
  COMPLETED: '#287d3c',
  NO_SHOW: '#7a4eab',
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = String(status).toUpperCase();
  return (
    <View style={[styles.badge, { backgroundColor: colors[normalized] ?? '#60646C' }]}>
      <Text style={styles.text}>{normalized}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  text: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
