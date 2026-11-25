import { NativeTabs } from 'expo-router/native-tabs';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { roleName } from '@/utils/domain';
import { domainApi } from '@/api/domain';
import { mediaUrl } from '@/config/api';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const role = user ? roleName(user.role) : '';
  const [patientImage, setPatientImage] = useState<{ userId: string; url: string | null } | null>(null);
  const accountProfileImageUrl = mediaUrl(user?.profile_image ?? null);

  useEffect(() => {
    if (!user || role !== 'patient') return;
    const userId = String(user.id);
    void domainApi.patientMe()
      .then((patient) => setPatientImage({ userId, url: mediaUrl(patient.profile_picture) }))
      .catch(() => setPatientImage({ userId, url: accountProfileImageUrl }));
  }, [user, role, accountProfileImageUrl]);

  const profileImageUrl = role === 'patient'
    ? patientImage?.userId === String(user?.id) ? patientImage.url : accountProfileImageUrl
    : accountProfileImageUrl;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore Doctor</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>
          {!user ? 'Sign in' : role === 'doctor' ? 'Manage' : role === 'assistant' ? 'Doctors' : 'Profile'}
        </NativeTabs.Trigger.Label>
        {user && profileImageUrl ? (
          <NativeTabs.Trigger.Icon src={{ uri: profileImageUrl }} renderingMode="original" />
        ) : (
          <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
        )}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
