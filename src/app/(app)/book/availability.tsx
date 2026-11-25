import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { domainApi } from '@/api/domain';
import type { AvailabilitySlot, Chamber, Doctor } from '@/types/domain';
import { errorMessage, formatLocalTime, localDateInput } from '@/utils/domain';

export default function AvailabilityScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [chamberId, setChamberId] = useState('');
  const [date, setDate] = useState(localDateInput());
  const [datePicker, setDatePicker] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const chambers = useMemo(
    () => (doctor?.chambers ?? []).filter((chamber) => chamber.active !== false),
    [doctor],
  );

  const load = async (isRefresh = false) => {
    if (!doctorId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      if (!doctor) {
        const loaded = await domainApi.doctor(doctorId);
        setDoctor(loaded);
        const active = (loaded.chambers ?? []).filter((chamber) => chamber.active !== false);
        if (active[0]?.id) setChamberId(active[0].id);
        if (!chamberId && active[0]?.id) {
          const response = await domainApi.availability(doctorId, { date, chamber: active[0].id });
          setSlots(response.slots.filter((slot) => new Date(slot.start_at).getTime() > Date.now()));
          return;
        }
      }
      if (chamberId) {
        const response = await domainApi.availability(doctorId, { date, chamber: chamberId });
        setSlots(response.slots.filter((slot) => new Date(slot.start_at).getTime() > Date.now()));
      }
    } catch (reason) {
      setError(errorMessage(reason, 'Unable to load availability.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [doctorId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (chamberId) void load(true);
  }, [chamberId, date]);

  const selectSlot = (slot: AvailabilitySlot) => {
    if (!doctorId || !chamberId) return;
    router.push({
      pathname: '/(app)/book/confirm',
      params: { doctorId, chamberId, startAt: slot.start_at, duration: String(slot.duration_minutes) },
    } as never);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Choose a time' }} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
        <Text style={styles.title}>{doctor?.professional_name || 'Availability'}</Text>
        <Text style={styles.label}>Chamber</Text>
        <View style={styles.chips}>
          {chambers.map((chamber: Chamber) => (
            <Pressable
              key={chamber.id}
              accessibilityRole="button"
              accessibilityState={{ selected: chamberId === chamber.id }}
              onPress={() => setChamberId(chamber.id)}
              style={[styles.chip, chamberId === chamber.id && styles.selectedChip]}>
              <Text style={[styles.chipText, chamberId === chamber.id && styles.selectedChipText]}>
                {chamber.chamber_name || chamber.address || 'Chamber'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Date</Text>
        <Pressable accessibilityRole="button" style={styles.dateButton} onPress={() => setDatePicker(true)}>
          <Text style={styles.dateText}>{date}</Text>
        </Pressable>
        {datePicker && (
          <DateTimePicker
            value={new Date(`${date}T12:00:00`)}
            mode="date"
            minimumDate={new Date()}
            onValueChange={(_, selected) => {
              setDatePicker(false);
              if (selected) setDate(localDateInput(selected));
            }}
            onDismiss={() => setDatePicker(false)}
          />
        )}
        <Text style={styles.timezone}>Times shown in your local timezone</Text>
        {loading && slots.length === 0 ? (
          <View style={styles.center}><ActivityIndicator /><Text>Loading availability...</Text></View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Availability unavailable</Text>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => void load()}><Text style={styles.retryText}>Retry</Text></Pressable>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.center}><Text style={styles.errorTitle}>No available slots</Text><Text>No openings are available for this chamber and date.</Text></View>
        ) : (
          <View style={styles.slots}>
            {slots.map((slot) => (
              <Pressable
                key={slot.start_at}
                accessibilityRole="button"
                accessibilityLabel={`Select ${formatLocalTime(slot.start_at)}, ${slot.duration_minutes} minutes`}
                onPress={() => selectSlot(slot)}
                style={styles.slot}>
                <Text style={styles.slotTime}>{formatLocalTime(slot.start_at)}</Text>
                <Text style={styles.slotDuration}>{slot.duration_minutes} min</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  label: { fontWeight: '700', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  selectedChip: { backgroundColor: '#1769aa', borderColor: '#1769aa' },
  chipText: { color: '#202124' },
  selectedChipText: { color: '#fff', fontWeight: '700' },
  dateButton: { minHeight: 48, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12 },
  dateText: { fontWeight: '600' },
  timezone: { color: '#60646C', fontSize: 12 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 32 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '47%', minHeight: 72, borderWidth: 1, borderColor: '#1769aa', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  slotTime: { color: '#1769aa', fontWeight: '800', fontSize: 16 },
  slotDuration: { color: '#60646C', marginTop: 3 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  error: { color: '#b00020', textAlign: 'center' },
  retry: { minHeight: 48, borderRadius: 10, backgroundColor: '#1769aa', paddingHorizontal: 24, justifyContent: 'center' },
  retryText: { color: '#fff', fontWeight: '700' },
});
