import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Appointment } from '@/types/domain';
import { formatFee, formatLocalDate, formatLocalTime } from '@/utils/domain';
import { StatusBadge } from '@/components/status-badge';

function nameOfDoctor(value: Appointment['doctor']): string {
  if (typeof value === 'string') return 'Doctor';
  return value.professional_name || 'Doctor';
}

function nameOfChamber(value: Appointment['chamber']): string {
  if (typeof value === 'string') return 'Chamber';
  return value.chamber_name || (typeof value.hospital === 'object' ? value.hospital?.name : value.address) || 'Chamber';
}

export function AppointmentCard({ appointment, onPress }: { appointment: Appointment; onPress: () => void }) {
  const patient = typeof appointment.patient === 'object' ? appointment.patient : null;
  const fee = appointment.fee_snapshot ?? appointment.consultation_fee;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{nameOfDoctor(appointment.doctor)}</Text>
          {patient && <Text style={styles.sub}>{[patient.first_name, patient.last_name].filter(Boolean).join(' ') || patient.email || 'Patient'}</Text>}
        </View>
        <StatusBadge status={appointment.status} />
      </View>
      <Text style={styles.sub}>{nameOfChamber(appointment.chamber)}</Text>
      <Text style={styles.time}>{formatLocalDate(appointment.start_at)} at {formatLocalTime(appointment.start_at)}</Text>
      <Text style={styles.sub}>{appointment.duration_minutes ? `${appointment.duration_minutes} minutes` : 'Duration not listed'} · Fee: {formatFee(fee)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 12, padding: 16, gap: 6, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  sub: { color: '#60646C' },
  time: { fontWeight: '600' },
});
