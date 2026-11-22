import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { domainApi } from '@/api/domain';
import type { Chamber, ScheduleException } from '@/types/domain';
import { errorMessage, formatLocalDate } from '@/utils/domain';

const types = [
  ['LEAVE', 'Leave'],
  ['HOLIDAY', 'Holiday'],
  ['TEMPORARY_UNAVAILABLE', 'Temporary unavailable'],
  ['MODIFIED_WORKING_HOURS', 'Modified working hours'],
  ['ONE_TIME_CHANGE', 'One-time schedule change'],
] as const;

export default function ScheduleExceptionsScreen() {
  const [items, setItems] = useState<ScheduleException[]>([]);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [editing, setEditing] = useState<ScheduleException | null>(null);
  const [chamber, setChamber] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<string>('LEAVE');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [active, setActive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : null;
    setError('');
    try {
      const [exceptions, chamberResponse] = await Promise.all([
        domainApi.scheduleExceptions(),
        domainApi.chambers({ active: true, page_size: 100 }),
      ]);
      setItems(Array.isArray(exceptions) ? exceptions : exceptions.results);
      const available = Array.isArray(chamberResponse) ? chamberResponse : chamberResponse.results;
      setChambers(available);
      if (!chamber && available[0]?.id) setChamber(available[0].id);
    } catch (reasonValue) { setError(errorMessage(reasonValue, 'Unable to load exceptions.')); }
    finally { setRefreshing(false); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const beginEdit = (item?: ScheduleException) => {
    setEditing(item ?? null);
    if (item) {
      setChamber(typeof item.chamber === 'string' ? item.chamber : item.chamber.id);
      setDate(item.date); setType(item.exception_type);
      setStart(item.start_time ?? ''); setEnd(item.end_time ?? '');
      setDuration(item.appointment_duration ? String(item.appointment_duration) : '');
      setReason(item.reason ?? ''); setActive(item.active);
    } else {
      setDate(''); setType('LEAVE'); setStart(''); setEnd(''); setDuration(''); setReason(''); setActive(true);
    }
  };

  const save = async () => {
    if (!chamber || !date) { Alert.alert('Required fields', 'Choose a chamber and date.'); return; }
    const body = {
      chamber, date, exception_type: type,
      start_time: start || null, end_time: end || null,
      appointment_duration: duration ? Number(duration) : null,
      reason: reason || null, active,
    };
    try {
      if (editing) await domainApi.updateScheduleException(editing.id, body);
      else await domainApi.createScheduleException(body);
      beginEdit();
      await load(true);
    } catch (reasonValue) { Alert.alert('Unable to save exception', errorMessage(reasonValue)); }
  };

  const remove = (item: ScheduleException) => {
    Alert.alert('Delete exception?', 'This exception will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await domainApi.deleteScheduleException(item.id); await load(true); }
        catch (reasonValue) { Alert.alert('Unable to delete', errorMessage(reasonValue)); }
      } },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Schedule exceptions' }} />
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.title}>{types.find(([value]) => value === item.exception_type)?.[1] ?? item.exception_type}</Text>
            <Text>{formatLocalDate(`${item.date}T12:00:00`)}</Text>
            {item.start_time && item.end_time ? <Text>{item.start_time}–{item.end_time}</Text> : null}
            {item.reason ? <Text>{item.reason}</Text> : null}
            <Text>{item.active ? 'Active' : 'Inactive'}</Text>
            <View style={styles.row}>
              <Pressable style={styles.secondary} onPress={() => beginEdit(item)}><Text style={styles.secondaryText}>Edit</Text></Pressable>
              <Pressable style={styles.secondary} onPress={async () => {
                try { await domainApi.updateScheduleException(item.id, { active: !item.active }); await load(true); }
                catch (reasonValue) { Alert.alert('Unable to update', errorMessage(reasonValue)); }
              }}><Text style={styles.secondaryText}>{item.active ? 'Deactivate' : 'Activate'}</Text></Pressable>
              <Pressable style={styles.danger} onPress={() => remove(item)}><Text style={styles.dangerText}>Delete</Text></Pressable>
            </View>
          </View>
        ))}
        <View style={styles.form}>
          <Text style={styles.title}>{editing ? 'Edit exception' : 'Create exception'}</Text>
          <Text style={styles.label}>Chamber</Text>
          <View style={styles.chips}>{chambers.map((item) => (
            <Pressable key={item.id} onPress={() => setChamber(item.id)} style={[styles.chip, chamber === item.id && styles.selected]}>
              <Text style={chamber === item.id ? styles.selectedText : undefined}>{item.chamber_name || item.address || 'Chamber'}</Text>
            </Pressable>
          ))}</View>
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text><TextInput value={date} onChangeText={setDate} placeholder="2026-12-01" style={styles.input} />
          <Text style={styles.label}>Exception type</Text>
          <View style={styles.chips}>{types.map(([value, label]) => (
            <Pressable key={value} onPress={() => setType(value)} style={[styles.chip, type === value && styles.selected]}>
              <Text style={type === value ? styles.selectedText : undefined}>{label}</Text>
            </Pressable>
          ))}</View>
          <Text style={styles.label}>Start time (if applicable)</Text><TextInput value={start} onChangeText={setStart} placeholder="09:00" style={styles.input} />
          <Text style={styles.label}>End time (if applicable)</Text><TextInput value={end} onChangeText={setEnd} placeholder="17:00" style={styles.input} />
          <Text style={styles.label}>Duration (minutes)</Text><TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" style={styles.input} />
          <Text style={styles.label}>Reason</Text><TextInput value={reason} onChangeText={setReason} style={styles.input} />
          <View style={styles.switchRow}><Text>Active</Text><Switch value={active} onValueChange={setActive} /></View>
          <View style={styles.row}>
            <Pressable style={styles.primary} onPress={() => void save()}><Text style={styles.primaryText}>Save exception</Text></Pressable>
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
  title: { fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 8, paddingHorizontal: 10, justifyContent: 'center' },
  selected: { backgroundColor: '#1769aa', borderColor: '#1769aa' },
  selectedText: { color: '#fff', fontWeight: '700' },
  form: { borderTopWidth: 1, borderTopColor: '#D8DAE0', paddingTop: 16, gap: 6 },
  label: { color: '#60646C', marginTop: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#D8DAE0', borderRadius: 8, paddingHorizontal: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  secondary: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: '#1769aa', paddingHorizontal: 12, justifyContent: 'center' },
  secondaryText: { color: '#1769aa', fontWeight: '700' },
  danger: { minHeight: 44, borderRadius: 8, backgroundColor: '#b00020', paddingHorizontal: 12, justifyContent: 'center' },
  dangerText: { color: '#fff', fontWeight: '700' },
  primary: { minHeight: 48, borderRadius: 8, backgroundColor: '#1769aa', paddingHorizontal: 16, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  error: { color: '#b00020' },
});
