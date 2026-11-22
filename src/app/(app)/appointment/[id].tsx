import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { domainApi } from '@/api/domain';
import type { Appointment, Chamber, Doctor } from '@/types/domain';
import { StatusBadge } from '@/components/status-badge';
import { errorMessage, formatFee, formatLocalDate, formatLocalTime } from '@/utils/domain';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = async (isRefresh = false) => {
    if (!id) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try { setAppointment(await domainApi.appointment(id)); }
    catch (reasonValue) { setError(errorMessage(reasonValue, 'Unable to load appointment.')); }
    finally { setLoading(false); setRefreshing(false); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [id]);

  const cancel = () => {
    if (!appointment || !id) return;
    if (!reason.trim()) {
      Alert.alert('Cancellation reason required', 'Please explain why you need to cancel.');
      return;
    }
    Alert.alert('Cancel appointment?', 'This action cannot be undone.', [
      { text: 'Keep appointment', style: 'cancel' },
      { text: 'Cancel appointment', style: 'destructive', onPress: async () => {
        setCancelling(true);
        try {
          setAppointment(await domainApi.cancelAppointment(id, reason.trim()));
        } catch (reasonValue) {
          Alert.alert('Cancellation failed', errorMessage(reasonValue, 'The appointment could not be cancelled.'));
        } finally { setCancelling(false); }
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><Text>Loading appointment...</Text></View>;
  if (!appointment) return <View style={styles.center}><Text style={styles.error}>{error || 'Appointment not found.'}</Text></View>;
  const doctor = typeof appointment.doctor === 'object' ? appointment.doctor as Doctor : null;
  const chamber = typeof appointment.chamber === 'object' ? appointment.chamber as Chamber : null;
  const status = String(appointment.status).toUpperCase();
  const canCancel = appointment.can_cancel !== false && (status === 'PENDING' || status === 'CONFIRMED');
  return (
    <>
      <Stack.Screen options={{ title: 'Appointment details' }} />
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
        <View style={styles.header}><Text style={styles.title}>{doctor?.professional_name || 'Doctor'}</Text><StatusBadge status={status} /></View>
        <Text style={styles.label}>Chamber</Text><Text style={styles.value}>{chamber?.chamber_name || chamber?.address || 'Chamber'}</Text>
        <Text style={styles.label}>Date</Text><Text style={styles.value}>{formatLocalDate(appointment.start_at)}</Text>
        <Text style={styles.label}>Time</Text><Text style={styles.value}>{formatLocalTime(appointment.start_at)} (device local timezone)</Text>
        <Text style={styles.label}>Duration</Text><Text style={styles.value}>{appointment.duration_minutes ? `${appointment.duration_minutes} minutes` : 'Not listed'}</Text>
        <Text style={styles.label}>Fee snapshot</Text><Text style={styles.value}>{formatFee(appointment.fee_snapshot ?? appointment.consultation_fee)}</Text>
        <Text style={styles.label}>Notes</Text><Text style={styles.value}>{appointment.patient_notes || 'No notes'}</Text>
        {canCancel && (
          <View style={styles.cancelSection}>
            <Text style={styles.label}>Cancellation reason</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="Required reason" style={styles.reason} />
            <Pressable disabled={cancelling} accessibilityRole="button" style={[styles.cancelButton, cancelling && styles.disabled]} onPress={cancel}>
              <Text style={styles.cancelText}>{cancelling ? 'Cancelling...' : 'Cancel appointment'}</Text>
            </Pressable>
          </View>
        )}
        {appointment.cancellation_reason && <><Text style={styles.label}>Cancellation reason</Text><Text style={styles.value}>{appointment.cancellation_reason}</Text></>}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  label: { color: '#60646C', fontSize: 12, marginTop: 8 },
  value: { fontSize: 16, fontWeight: '600' },
  cancelSection: { marginTop: 16, gap: 8 },
  reason: { minHeight: 48, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 10, paddingHorizontal: 12 },
  cancelButton: { minHeight: 52, borderRadius: 12, backgroundColor: '#b00020', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  cancelText: { color: '#fff', fontWeight: '800' },
  error: { color: '#b00020' },
});
