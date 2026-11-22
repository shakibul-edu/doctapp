import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { domainApi } from '@/api/domain';
import { useAuth } from '@/context/auth';
import type { Doctor } from '@/types/domain';
import { errorMessage, formatFee, roleName } from '@/utils/domain';

export default function AssociatedDoctorsScreen() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user || roleName(user.role) !== 'assistant') return;
    domainApi.assistantDoctors().then((page) => {
      const associated = Array.isArray(page) ? page : page.results;
      setDoctors(associated.filter((doctor) => doctor.verification_status === 'APPROVED'));
    })
      .catch((reason) => setError(errorMessage(reason, 'Unable to load associated doctors.')))
      .finally(() => setLoading(false));
  }, [user?.id]);
  if (!user) return null;
  if (roleName(user.role) !== 'assistant') return <Redirect href="/(app)/(tabs)/profile" />;
  if (loading) return <View style={styles.center}><ActivityIndicator /><Text>Loading associated doctors...</Text></View>;
  return <View style={styles.container}>
    <Text style={styles.title}>Associated doctors</Text>
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.appointments}
      onPress={() => router.push('/(app)/doctor-appointments' as never)}>
      <Text style={styles.appointmentsText}>Manage associated appointments</Text>
    </TouchableOpacity>
    {!!error && <Text style={styles.error}>{error}</Text>}
    <FlatList
      data={doctors}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text>No active doctor relationships.</Text>}
      renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/(app)/doctor/[id]' as never, params: { id: item.id } })}>
        <Text style={styles.name}>{item.professional_name}</Text>
        <Text>{item.specialty}</Text>
        <Text>Fee: {formatFee(item.consultation_fee)}</Text>
      </TouchableOpacity>}
    />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 10, gap: 4 },
  name: { fontSize: 17, fontWeight: '700' },
  error: { color: '#b00020' },
  appointments: { minHeight: 48, borderRadius: 10, backgroundColor: '#1769aa', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  appointmentsText: { color: '#fff', fontWeight: '700' },
});
