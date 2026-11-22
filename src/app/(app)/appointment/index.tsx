import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { domainApi } from '@/api/domain';
import { AppointmentCard } from '@/components/appointment-card';
import type { Appointment } from '@/types/domain';
import { errorMessage } from '@/utils/domain';

type Filter = 'upcoming' | 'completed' | 'cancelled' | 'all';

export default function MyAppointmentsScreen() {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await domainApi.appointments();
      setAppointments(Array.isArray(response) ? response : response.results);
    } catch (reason) {
      setError(errorMessage(reason, 'Unable to load appointments.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const filtered = appointments.filter((appointment) => {
    const status = String(appointment.status).toUpperCase();
    if (filter === 'all') return true;
    if (filter === 'completed') return status === 'COMPLETED';
    if (filter === 'cancelled') return status === 'CANCELLED';
    return status === 'PENDING' || status === 'CONFIRMED';
  });

  return (
    <>
      <Stack.Screen options={{ title: 'My appointments' }} />
      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['upcoming', 'completed', 'cancelled', 'all'] as Filter[]).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item }}
              onPress={() => setFilter(item)}
              style={[styles.filter, filter === item && styles.filterSelected]}>
              <Text style={[styles.filterText, filter === item && styles.filterTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {loading ? (
          <View style={styles.center}><ActivityIndicator /><Text>Loading appointments...</Text></View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Unable to load appointments</Text>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => void load()}><Text style={styles.retryText}>Retry</Text></Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
            {filtered.length === 0 ? (
              <View style={styles.center}><Text style={styles.errorTitle}>No appointments</Text><Text>There are no appointments in this filter.</Text></View>
            ) : filtered.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onPress={() => router.push({ pathname: '/(app)/appointment/[id]', params: { id: appointment.id } } as never)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filter: { minHeight: 40, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center' },
  filterSelected: { backgroundColor: '#1769aa', borderColor: '#1769aa' },
  filterText: { textTransform: 'capitalize', fontWeight: '700' },
  filterTextSelected: { color: '#fff' },
  list: { flexGrow: 1, padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  error: { color: '#b00020', textAlign: 'center' },
  retry: { minHeight: 48, borderRadius: 10, backgroundColor: '#1769aa', paddingHorizontal: 24, justifyContent: 'center' },
  retryText: { color: '#fff', fontWeight: '700' },
});
