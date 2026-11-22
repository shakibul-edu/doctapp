import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { domainApi } from '@/api/domain';
import type { Chamber, DoctorSchedule } from '@/types/domain';
import { errorMessage, schedulesOverlap, timeToMinutes } from '@/utils/domain';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekdayShort = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
type TimeField = 'start' | 'end' | 'breakStart' | 'breakEnd';

function timeDate(value: string): Date {
  const minutes = timeToMinutes(value);
  const date = new Date(2000, 0, 1, 9, 0);
  if (minutes !== null) date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function SchedulesScreen() {
  const [items, setItems] = useState<DoctorSchedule[]>([]);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<DoctorSchedule | null>(null);
  const [chamber, setChamber] = useState('');
  const [weekday, setWeekday] = useState('1');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [duration, setDuration] = useState('30');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timePicker, setTimePicker] = useState<TimeField | null>(null);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [scheduleResponse, chamberResponse] = await Promise.all([
        domainApi.schedules(),
        domainApi.chambers({ active: true, page_size: 100 }),
      ]);
      setItems(Array.isArray(scheduleResponse) ? scheduleResponse : scheduleResponse.results);
      setChambers(Array.isArray(chamberResponse) ? chamberResponse : chamberResponse.results);
      if (!chamber && chamberResponse) {
        const available = Array.isArray(chamberResponse) ? chamberResponse : chamberResponse.results;
        if (available[0]?.id) setChamber(available[0].id);
      }
    } catch (reason) { setError(errorMessage(reason, 'Unable to load schedules.')); }
    finally { setLoading(false); setRefreshing(false); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const beginEdit = (item?: DoctorSchedule) => {
    setEditing(item ?? null);
    if (item) {
      setChamber(typeof item.chamber === 'string' ? item.chamber : item.chamber.id);
      setWeekday(String(item.weekday));
      setStart(item.start_time);
      setEnd(item.end_time);
      setDuration(String(item.appointment_duration));
      setBreakStart(item.break_start ?? '');
      setBreakEnd(item.break_end ?? '');
      setActive(item.active);
    } else {
      setWeekday('1'); setStart('09:00'); setEnd('17:00'); setDuration('30');
      setBreakStart(''); setBreakEnd(''); setActive(true);
    }
  };

  const onTimeChange = (_event: DateTimePickerChangeEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setTimePicker(null);
    if (!selectedDate || !timePicker) return;
    const value = formatTime(selectedDate);
    if (timePicker === 'start') setStart(value);
    if (timePicker === 'end') setEnd(value);
    if (timePicker === 'breakStart') setBreakStart(value);
    if (timePicker === 'breakEnd') setBreakEnd(value);
  };

  const save = async () => {
    if (!chamber) { Alert.alert('Chamber required', 'Select a chamber.'); return; }
    const weekdayNumber = Number(weekday);
    if (!Number.isInteger(weekdayNumber) || weekdayNumber < 0 || weekdayNumber > 6) {
      Alert.alert('Invalid weekday', 'Choose a weekday from 0 to 6.');
      return;
    }
    if (start >= end) {
      Alert.alert('Invalid time', 'End time must be later than start time.');
      return;
    }
    const durationMinutes = Number(duration);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      Alert.alert('Invalid duration', 'Enter an appointment duration greater than 0 minutes.');
      return;
    }
    if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) {
      Alert.alert('Incomplete break', 'Select both break start and break end, or clear both.');
      return;
    }
    const duplicate = items.find((item) => {
      if (editing && item.id === editing.id) return false;
      const itemChamber = typeof item.chamber === 'string' ? item.chamber : item.chamber.id;
      return itemChamber === chamber && Number(item.weekday) === weekdayNumber;
    });
    if (duplicate) {
      Alert.alert(
        'Duplicate schedule',
        'A schedule already exists for this chamber and weekday. Edit the existing schedule or choose a different one.',
      );
      return;
    }
    const overlap = items.find((item) => {
      if (editing && item.id === editing.id) return false;
      const itemChamber = typeof item.chamber === 'string' ? item.chamber : item.chamber.id;
      return itemChamber === chamber &&
        Number(item.weekday) === weekdayNumber &&
        schedulesOverlap(start, end, item.start_time, item.end_time);
    });
    if (overlap) {
      Alert.alert(
        'Overlapping schedule',
        `${weekdayShort[weekdayNumber]} already has a schedule at ${overlap.start_time}-${overlap.end_time} in this chamber. Choose a different time.`,
      );
      return;
    }
    if (breakStart && breakEnd && breakStart >= breakEnd) {
      Alert.alert('Invalid break time', 'Break end time must be later than break start time.');
      return;
    }
    setSaving(true);
    const body = {
      chamber,
      weekday: Number(weekday),
      start_time: start,
      end_time: end,
      appointment_duration: durationMinutes,
      break_start: breakStart || null,
      break_end: breakEnd || null,
      active,
    };
    try {
      if (editing) await domainApi.updateSchedule(editing.id, body);
      else await domainApi.createSchedule(body);
      setEditing(null);
      await load(true);
    } catch (reason) { Alert.alert('Unable to save schedule', errorMessage(reason)); }
    finally { setSaving(false); }
  };

  const remove = (item: DoctorSchedule) => {
    Alert.alert('Delete schedule?', 'This recurring schedule will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await domainApi.deleteSchedule(item.id); await load(true); }
        catch (reason) { Alert.alert('Unable to delete', errorMessage(reason)); }
      } },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Schedules' }} />
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{weekdayShort[Number(item.weekday)] ?? weekdays[Number(item.weekday)] ?? `Weekday ${item.weekday}`} · {typeof item.chamber === 'object' ? item.chamber.chamber_name : 'Chamber'}</Text>
            <Text>{item.start_time}–{item.end_time} · {item.appointment_duration} min</Text>
            {item.break_start && item.break_end ? <Text>Break: {item.break_start}–{item.break_end}</Text> : null}
            <Text>{item.active ? 'Active' : 'Inactive'}</Text>
            <View style={styles.row}>
              <Pressable style={styles.secondary} onPress={() => beginEdit(item)}><Text style={styles.secondaryText}>Edit</Text></Pressable>
              <Pressable style={styles.secondary} onPress={async () => {
                try { await domainApi.updateSchedule(item.id, { active: !item.active }); await load(true); }
                catch (reason) { Alert.alert('Unable to update', errorMessage(reason)); }
              }}><Text style={styles.secondaryText}>{item.active ? 'Deactivate' : 'Activate'}</Text></Pressable>
              <Pressable style={styles.danger} onPress={() => remove(item)}><Text style={styles.dangerText}>Delete</Text></Pressable>
            </View>
          </View>
        ))}
        {!loading && items.length === 0 ? <Text>No recurring schedules yet.</Text> : null}
        <View style={styles.form}>
          <Text style={styles.formTitle}>{editing ? 'Edit schedule' : 'Create schedule'}</Text>
          <Text style={styles.label}>Chamber</Text>
          <View style={styles.chips}>{chambers.map((item) => (
            <Pressable key={item.id} onPress={() => setChamber(item.id)} style={[styles.chip, chamber === item.id && styles.selected]}>
              <Text style={chamber === item.id ? styles.selectedText : undefined}>{item.chamber_name || item.address || 'Chamber'}</Text>
            </Pressable>
          ))}</View>
          <Text style={styles.label}>Weekday</Text>
          <View style={styles.chips}>{weekdayShort.map((day, index) => (
            <Pressable key={day} onPress={() => setWeekday(String(index))} style={[styles.chip, weekday === String(index) && styles.selected]}>
              <Text style={weekday === String(index) ? styles.selectedText : undefined}>{day}</Text>
            </Pressable>
          ))}</View>
          <Text style={styles.label}>Start time</Text>
          <Pressable accessibilityRole="button" style={styles.timeButton} onPress={() => setTimePicker('start')}>
            <Text>{start}</Text>
          </Pressable>
          <Text style={styles.label}>End time</Text>
          <Pressable accessibilityRole="button" style={styles.timeButton} onPress={() => setTimePicker('end')}>
            <Text>{end}</Text>
          </Pressable>
          <Text style={styles.label}>Appointment duration (minutes)</Text><TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" style={styles.input} />
          <Text style={styles.label}>Break start (optional)</Text>
          <View style={styles.timeRow}>
            <Pressable accessibilityRole="button" style={[styles.timeButton, styles.timeButtonFlex]} onPress={() => setTimePicker('breakStart')}>
              <Text>{breakStart || 'Select start time'}</Text>
            </Pressable>
            {breakStart ? <Pressable style={styles.clearTime} onPress={() => setBreakStart('')}><Text style={styles.secondaryText}>Clear</Text></Pressable> : null}
          </View>
          <Text style={styles.label}>Break end (optional)</Text>
          <View style={styles.timeRow}>
            <Pressable accessibilityRole="button" style={[styles.timeButton, styles.timeButtonFlex]} onPress={() => setTimePicker('breakEnd')}>
              <Text>{breakEnd || 'Select end time'}</Text>
            </Pressable>
            {breakEnd ? <Pressable style={styles.clearTime} onPress={() => setBreakEnd('')}><Text style={styles.secondaryText}>Clear</Text></Pressable> : null}
          </View>
          {timePicker && (
            <DateTimePicker
              value={timeDate(
                timePicker === 'start' ? start :
                timePicker === 'end' ? end :
                timePicker === 'breakStart' ? (breakStart || '12:00') : (breakEnd || '13:00')
              )}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour
              onChange={onTimeChange}
              onDismiss={() => setTimePicker(null)}
            />
          )}
          <View style={styles.switchRow}><Text>Active</Text><Switch value={active} onValueChange={setActive} /></View>
          <View style={styles.row}>
            <Pressable disabled={saving} style={styles.primary} onPress={() => void save()}><Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save schedule'}</Text></Pressable>
            {editing && <Pressable style={styles.secondary} onPress={() => beginEdit()}><Text style={styles.secondaryText}>Cancel edit</Text></Pressable>}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 12 },
  card: { borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 12, padding: 14, gap: 5 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  secondary: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: '#1769aa', paddingHorizontal: 12, justifyContent: 'center' },
  secondaryText: { color: '#1769aa', fontWeight: '700' },
  danger: { minHeight: 44, borderRadius: 8, backgroundColor: '#b00020', paddingHorizontal: 12, justifyContent: 'center' },
  dangerText: { color: '#fff', fontWeight: '700' },
  form: { borderTopWidth: 1, borderTopColor: '#D8DAE0', paddingTop: 16, gap: 6 },
  formTitle: { fontSize: 20, fontWeight: '700' },
  label: { color: '#60646C', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  selected: { backgroundColor: '#1769aa', borderColor: '#1769aa' },
  selectedText: { color: '#fff', fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 8, paddingHorizontal: 12 },
  timeButton: { minHeight: 48, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeButtonFlex: { flex: 1 },
  clearTime: { minHeight: 44, borderWidth: 1, borderColor: '#1769aa', borderRadius: 8, paddingHorizontal: 10, justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  primary: { minHeight: 48, borderRadius: 8, backgroundColor: '#1769aa', paddingHorizontal: 16, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  error: { color: '#b00020' },
});
