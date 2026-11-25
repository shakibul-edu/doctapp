import { Redirect } from 'expo-router';

import { useAuth } from '@/context/auth';

export default function EntryScreen() {
  const { loading } = useAuth();
  if (loading) return null;
  return <Redirect href="/(app)" />;
}
