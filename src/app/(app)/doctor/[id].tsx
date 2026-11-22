import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { domainApi } from '@/api/domain';
import { mediaUrl } from '@/config/api';
import type { Doctor } from '@/types/domain';
import { errorMessage, formatDate, formatFee, formatLanguages, normalizeSpecializationName } from '@/utils/domain';

export default function DoctorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      domainApi.doctor(id)
        .then(setDoctor)
        .catch((reason) => setError(errorMessage(reason, 'Unable to load doctor.')))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);
  if (loading) return <View style={styles.center}><ActivityIndicator /><Text>Loading doctor...</Text></View>;
  const specialty = doctor?.specialty || normalizeSpecializationName(doctor?.specialization);
  const profilePicture = typeof doctor?.profile_picture === 'string'
    ? mediaUrl(doctor.profile_picture)
    : null;
  const validProfilePicture = profilePicture && /^https?:\/\//i.test(profilePicture)
    ? profilePicture
    : null;
  return <><Stack.Screen options={{ title: doctor?.professional_name ?? 'Doctor' }} /><ScrollView contentContainerStyle={styles.container}>
    {!!error && <View style={styles.errorState}>
      <Text style={styles.error}>{error}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.retry}
        onPress={() => {
          if (id) {
            setLoading(true);
            setError('');
            domainApi.doctor(id)
              .then(setDoctor)
              .catch((reason) => setError(errorMessage(reason, 'Unable to load doctor.')))
              .finally(() => setLoading(false));
          }
        }}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>}
    {doctor && <>
      <Image
        source={validProfilePicture ? { uri: validProfilePicture } : require('@/assets/images/icon.png')}
        style={styles.image}
        contentFit="cover"
      />
      <Text style={styles.title}>{doctor.professional_name || 'Doctor name unavailable'}</Text>
      <Text style={styles.specialty}>{specialty || 'Specialty not listed'}</Text>
      <Text>{doctor.bio || 'No biography provided.'}</Text>
      <Text>Qualifications: {doctor.qualifications || 'Not listed'}</Text>
      <Text>Experience: {typeof doctor.experience_years === 'number' ? `${doctor.experience_years} years` : 'Not listed'}</Text>
      <Text>Consultation fee: {formatFee(doctor.consultation_fee)}</Text>
      <Text>Languages: {formatLanguages(doctor.languages)}</Text>
      {doctor.hospitals?.length ? <Text>Hospitals: {doctor.hospitals.map((hospital) => hospital.name).join(', ')}</Text> : null}
      {doctor.chambers?.length ? <Text>Chambers: {doctor.chambers.map((chamber) => chamber.chamber_name || chamber.address).filter(Boolean).join(', ')}</Text> : null}
      {doctor.verification_status ? <Text>Verification: {doctor.verification_status}</Text> : null}
      <Text>Updated: {formatDate(doctor.updated_at)}</Text>
      {doctor.verification_status === 'APPROVED' && doctor.chambers?.some((chamber) => chamber.active !== false) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Book appointment"
          style={styles.bookButton}
          onPress={() => router.push({
            pathname: '/(app)/book/availability',
            params: { doctorId: String(doctor.id) },
          } as never)}>
          <Text style={styles.bookText}>Book Appointment</Text>
        </Pressable>
      )}
    </>}
  </ScrollView></>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  image: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  specialty: { textAlign: 'center', color: '#1769aa', fontWeight: '700' },
  error: { color: '#b00020' },
  errorState: { alignItems: 'center', gap: 8 },
  retry: { minHeight: 48, borderRadius: 10, backgroundColor: '#1769aa', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  retryText: { color: '#fff', fontWeight: '700' },
  bookButton: { minHeight: 52, marginTop: 8, borderRadius: 12, backgroundColor: '#1769aa', alignItems: 'center', justifyContent: 'center' },
  bookText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
