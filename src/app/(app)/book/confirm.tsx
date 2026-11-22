import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { domainApi } from '@/api/domain';
import type { Chamber, Doctor } from '@/types/domain';
import { ApiError } from '@/types/auth';
import { errorMessage, formatFee, formatLocalDate, formatLocalTime } from '@/utils/domain';

export default function BookingConfirmationScreen() {
  const { doctorId, chamberId, startAt, duration } = useLocalSearchParams<{ doctorId: string; chamberId: string; startAt: string; duration: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [chamber, setChamber] = useState<Chamber | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (!doctorId || !chamberId) return;
    void Promise.all([domainApi.doctor(doctorId), domainApi.chamber(chamberId)])
      .then(([loadedDoctor, loadedChamber]) => { setDoctor(loadedDoctor); setChamber(loadedChamber); })
      .catch(() => undefined);
  }, [doctorId, chamberId]);

  const submit = async () => {
    if (submitted.current || !doctorId || !chamberId || !startAt) return;
    submitted.current = true;
    setSubmitting(true);
    try {
      const appointment = await domainApi.createAppointment({
        doctor: doctorId,
        chamber: chamberId,
        start_at: startAt,
        patient_notes: notes.trim() || undefined,
      });
      router.replace({ pathname: '/(app)/appointment/[id]', params: { id: appointment.id } } as never);
    } catch (reason) {
      submitted.current = false;
      if (reason instanceof ApiError && (reason.status === 409 || reason.status === 400)) {
        Alert.alert(
          reason.status === 409 ? 'Slot no longer available' : 'Booking needs attention',
          errorMessage(reason, 'Please choose another available slot.'),
          [
            { text: 'Choose another slot', onPress: () => router.replace({ pathname: '/(app)/book/availability', params: { doctorId } } as never) },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('Unable to book', errorMessage(reason, 'Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fee = chamber?.consultation_fee_override ?? doctor?.consultation_fee;
  return (
    <>
      <Stack.Screen options={{ title: 'Confirm booking' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Appointment summary</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Doctor</Text><Text style={styles.value}>{doctor?.professional_name || 'Loading...'}</Text>
          <Text style={styles.label}>Chamber</Text><Text style={styles.value}>{chamber?.chamber_name || chamber?.address || 'Loading...'}</Text>
          <Text style={styles.label}>Date</Text><Text style={styles.value}>{startAt ? formatLocalDate(startAt) : ''}</Text>
          <Text style={styles.label}>Local time</Text><Text style={styles.value}>{startAt ? formatLocalTime(startAt) : ''}</Text>
          <Text style={styles.label}>Duration</Text><Text style={styles.value}>{duration ? `${duration} minutes` : 'Not listed'}</Text>
          <Text style={styles.label}>Consultation fee</Text><Text style={styles.value}>{formatFee(fee)}</Text>
          <Text style={styles.timezone}>Device local timezone</Text>
        </View>
        <Text style={styles.label}>Patient notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Add notes for the doctor"
          style={styles.notes}
          accessibilityLabel="Patient notes"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={() => void submit()}
          style={[styles.submit, submitting && styles.disabled]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Confirm booking</Text>}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 12, padding: 16, gap: 5 },
  label: { color: '#60646C', fontSize: 12, marginTop: 4 },
  value: { fontSize: 16, fontWeight: '600' },
  timezone: { color: '#60646C', fontSize: 12, marginTop: 8 },
  notes: { minHeight: 100, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 10, padding: 12, textAlignVertical: 'top' },
  submit: { minHeight: 52, borderRadius: 12, backgroundColor: '#1769aa', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  disabled: { opacity: 0.55 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
