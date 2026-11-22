import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/auth';
import { mediaUrl } from '@/config/api';
import { domainApi } from '@/api/domain';
import type { PatientProfile } from '@/types/domain';
import { errorMessage, formatDate, roleName } from '@/utils/domain';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = async (refresh = false) => {
    if (!user) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      if (roleName(user.role) === 'patient') setPatient(await domainApi.patientMe());
    } catch (reason) {
      setError(errorMessage(reason, 'Unable to load your profile.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [user?.id]);
  if (!user) return null;
  const role = roleName(user.role);
  if (loading) return <View style={styles.center}><ActivityIndicator /><Text>Loading profile...</Text></View>;
  const profileImageUrl = mediaUrl(role === 'patient' ? patient?.profile_picture ?? null : user.profile_image);
  return <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
    {profileImageUrl && <Image source={{ uri: profileImageUrl }} style={styles.image} />}
    <Text style={styles.title}>{user.first_name} {user.last_name}</Text>
    <Text>{user.email}</Text>
    {!!error && <Text style={styles.error}>{error}</Text>}
    {role === 'patient' && patient && <>
      <Text>Date of birth: {formatDate(patient.date_of_birth)}</Text>
      <Text>Gender: {patient.gender || 'Not provided'}</Text>
      <Text>Address: {patient.address || 'Not provided'}</Text>
      <Text>Emergency contact: {patient.emergency_contact_name || 'Not provided'}</Text>
      <Text>Emergency phone: {patient.emergency_contact_phone || 'Not provided'}</Text>
      <Link href="/edit-profile" style={styles.link}>Edit patient profile</Link>
    </>}
    {role === 'doctor' && <Link href={'/(app)/doctor-profile' as never} style={styles.link}>Manage doctor profile</Link>}
    {role === 'doctor' && <Link href={'/(app)/assistants' as never} style={styles.link}>Manage assistants</Link>}
    {(role === 'doctor' || role === 'assistant') && <Link href={'/(app)/chambers' as never} style={styles.link}>Manage chambers</Link>}
    {role === 'assistant' && <Link href={'/(app)/associated-doctors' as never} style={styles.link}>Associated doctors</Link>}
    <Link href={'/(app)/hospitals' as never} style={styles.link}>Browse hospitals</Link>
    {role === 'patient' && <Link href="/change-password" style={styles.link}>Change password</Link>}
    {role === 'patient' && <Link href={'/(app)/appointment' as never} style={styles.link}>My appointments</Link>}
    {role === 'doctor' && <Link href={'/(app)/schedules' as never} style={styles.link}>Manage schedules</Link>}
    {role === 'doctor' && <Link href={'/(app)/schedule-exceptions' as never} style={styles.link}>Schedule exceptions</Link>}
    {(role === 'doctor' || role === 'assistant') && <Link href={'/(app)/doctor-appointments' as never} style={styles.link}>Manage appointments</Link>}
    <Button title="Sign out" onPress={() => void signOut()} />
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  image: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  link: { color: '#1769aa', paddingVertical: 10 },
  error: { color: '#b00020' },
});
