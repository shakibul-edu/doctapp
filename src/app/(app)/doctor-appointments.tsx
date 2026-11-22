import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { domainApi } from '@/api/domain';
import { useAuth } from '@/context/auth';
import { roleName, errorMessage } from '@/utils/domain';
import type { Appointment, Doctor } from '@/types/domain';
import { AppointmentCard } from '@/components/appointment-card';

export default function ManagedAppointmentsScreen() {
  const { user } = useAuth();
  const role = roleName(user?.role ?? '');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await domainApi.appointments();
      setAppointments(Array.isArray(response) ? response : response.results);
      if (role === 'assistant') {
        const associated = await domainApi.assistantDoctors();
        const active = (Array.isArray(associated) ? associated : associated.results).filter((doctor) =>
          doctor.verification_status === 'APPROVED',
        );
        setDoctors(active);
        if (!doctorId && active[0]?.id) setDoctorId(active[0].id);
      }
    } catch (reason) { setError(errorMessage(reason, 'Unable to load appointments.')); }
    finally { setLoading(false); setRefreshing(false); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [role]);

  const visible = role === 'assistant'
    ? appointments.filter((appointment) => {
        if (!doctorId) return false;
        return (typeof appointment.doctor === 'string' ? appointment.doctor : appointment.doctor.id) === doctorId;
      })
    : appointments;

  const transition = async (appointment: Appointment, action: 'confirm' | 'complete') => {
    const status = String(appointment.status).toUpperCase();
    if (action === 'confirm' && status !== 'PENDING') return;
    if (action === 'complete' && status !== 'CONFIRMED') return;
    try {
      const updated = action === 'confirm'
        ? await domainApi.confirmAppointment(appointment.id)
        : await domainApi.completeAppointment(appointment.id);
      setAppointments((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) { Alert.alert('Action denied', errorMessage(reason, 'The server did not permit this action.')); }
  };

  return (
    <>
      <Stack.Screen options={{ title: role === 'assistant' ? 'Associated appointments' : 'Doctor appointments' }} />
      <View style={styles.container}>
        {role === 'assistant' && doctors.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectors}>
            {doctors.map((doctor) => (
              <Pressable key={doctor.id} onPress={() => setDoctorId(doctor.id)} style={[styles.selector, doctorId === doctor.id && styles.selected]}>
                <Text style={doctorId === doctor.id ? styles.selectedText : undefined}>{doctor.professional_name || 'Doctor'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {loading ? (
          <View style={styles.center}><ActivityIndicator /><Text>Loading appointments...</Text></View>
        ) : error ? (
          <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable style={styles.retry} onPress={() => void load()}><Text style={styles.retryText}>Retry</Text></Pressable></View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
            {visible.length === 0 ? <View style={styles.center}><Text>No appointments found.</Text></View> : visible.map((appointment) => (
              <View key={appointment.id} style={styles.item}>
                <AppointmentCard appointment={appointment} onPress={() => router.push({ pathname: '/(app)/appointment/[id]', params: { id: appointment.id } } as never)} />
                <View style={styles.actions}>
                  {appointment.can_confirm !== false && String(appointment.status).toUpperCase() === 'PENDING' && (
                    <Pressable style={styles.primary} onPress={() => void transition(appointment, 'confirm')}><Text style={styles.primaryText}>Confirm</Text></Pressable>
                  )}
                  {appointment.can_complete !== false && String(appointment.status).toUpperCase() === 'CONFIRMED' && (
                    <Pressable style={styles.secondary} onPress={() => void transition(appointment, 'complete')}><Text style={styles.secondaryText}>Complete</Text></Pressable>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  selectors: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  selector: { minHeight: 44, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center' },
  selected: { backgroundColor: '#1769aa', borderColor: '#1769aa' },
  selectedText: { color: '#fff', fontWeight: '700' },
  list: { flexGrow: 1, padding: 16, gap: 12 },
  item: { gap: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  primary: { minHeight: 44, borderRadius: 8, backgroundColor: '#1769aa', paddingHorizontal: 16, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: '#287d3c', paddingHorizontal: 16, justifyContent: 'center' },
  secondaryText: { color: '#287d3c', fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  error: { color: '#b00020', textAlign: 'center' },
  retry: { minHeight: 48, borderRadius: 8, backgroundColor: '#1769aa', paddingHorizontal: 16, justifyContent: 'center' },
  retryText: { color: '#fff', fontWeight: '800' },
});
