import { Stack } from 'expo-router';

import { useAuth } from '@/context/auth';

export default function AppLayout() {
  const { loading } = useAuth();
  if (loading) return null;
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="edit-profile" options={{ headerShown: true, title: 'Edit profile' }} />
    <Stack.Screen name="change-password" options={{ headerShown: true, title: 'Change password' }} />
    <Stack.Screen name="doctor-profile" options={{ headerShown: true, title: 'Doctor profile' }} />
    <Stack.Screen name="assistants" options={{ headerShown: true, title: 'Assistants' }} />
    <Stack.Screen name="chambers" options={{ headerShown: true, title: 'Chambers' }} />
    <Stack.Screen name="hospitals" options={{ headerShown: true, title: 'Hospitals' }} />
    <Stack.Screen name="associated-doctors" options={{ headerShown: true, title: 'Associated doctors' }} />
    <Stack.Screen name="doctor/[id]" options={{ headerShown: true, title: 'Doctor' }} />
    <Stack.Screen name="book/availability" options={{ headerShown: true, title: 'Choose a time' }} />
    <Stack.Screen name="book/confirm" options={{ headerShown: true, title: 'Confirm booking' }} />
    <Stack.Screen name="appointment/index" options={{ headerShown: true, title: 'My appointments' }} />
    <Stack.Screen name="appointment/[id]" options={{ headerShown: true, title: 'Appointment details' }} />
    <Stack.Screen name="schedules" options={{ headerShown: true, title: 'Schedule management' }} />
    <Stack.Screen name="schedule-exceptions" options={{ headerShown: true, title: 'Schedule exceptions' }} />
    <Stack.Screen name="doctor-appointments" options={{ headerShown: true, title: 'Appointments' }} />
  </Stack>;
}
