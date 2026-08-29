import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const APP_VERSION = '1.0.0';

const REST_TIMER_OPTIONS = [
  { label: '30s',  value: 30 },
  { label: '60s',  value: 60 },
  { label: '90s',  value: 90 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
];

const WEIGHT_INCREMENT_OPTIONS = {
  metric:   [{ label: '1 kg', value: 1 }, { label: '2.5 kg', value: 2.5 }, { label: '5 kg', value: 5 }],
  imperial: [{ label: '2.5 lbs', value: 2.5 }, { label: '5 lbs', value: 5 }, { label: '10 lbs', value: 10 }],
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { unitSystem, switchUnitSystem, restTimer, setRestTimer, weightIncrement, setWeightIncrement } = useSettings();

  // ── Reminders ──────────────────────────────────────────────────────────────
  const [workoutReminder, setWorkoutReminder]   = useState(false);
  const [reminderTime, setReminderTime]         = useState('08:00');
  const [restDayReminder, setRestDayReminder]   = useState(false);
  const [streakReminder, setStreakReminder]     = useState(true);

  // ── Connection ─────────────────────────────────────────────────────────────
  const [serverUrl, setServerUrl] = useState('http://10.146.90.45:5000');

  // ── Modal state ────────────────────────────────────────────────────────────
  const [restTimerModalVisible,    setRestTimerModalVisible]    = useState(false);
  const [weightIncrModalVisible,   setWeightIncrModalVisible]   = useState(false);
  const [serverUrlModalVisible,    setServerUrlModalVisible]    = useState(false);
  const [reminderTimeModalVisible, setReminderTimeModalVisible] = useState(false);
  const [tempServerUrl,    setTempServerUrl]    = useState('');
  const [tempReminderTime, setTempReminderTime] = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────
  const weightUnit = unitSystem === 'metric' ? 'kg' : 'lbs';

  const restTimerLabel = REST_TIMER_OPTIONS.find(o => o.value === restTimer)?.label ?? `${restTimer}s`;

  const weightIncrLabel = (() => {
    const opts = WEIGHT_INCREMENT_OPTIONS[unitSystem];
    return opts.find(o => o.value === weightIncrement)?.label ?? `${weightIncrement} ${weightUnit}`;
  })();

  const handleClearData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will reset all body stats, measurements, and custom PRs stored on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => Alert.alert('Cleared', 'Local data has been reset.'),
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'You will need your email and password to get back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ],
    );
  };

  const saveServerUrl = () => {
    const url = tempServerUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    setServerUrl(url.replace(/\/$/, ''));
    setServerUrlModalVisible(false);
    Alert.alert('Saved', 'Server URL updated. Restart the app for changes to take effect.');
  };

  const saveReminderTime = () => {
    const t = tempReminderTime.trim();
    const match = t.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) { Alert.alert('Invalid Time', 'Enter a time in HH:MM format (e.g. 07:30)'); return; }
    setReminderTime(t);
    setReminderTimeModalVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Preferences ── */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          {/* Unit System */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Unit System</Text>
              <Text style={styles.rowSub}>Affects weight, height & measurements</Text>
            </View>
          </View>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segBtn, unitSystem === 'metric' && styles.segBtnActive]}
              onPress={() => switchUnitSystem('metric')}
            >
              <Text style={[styles.segBtnText, unitSystem === 'metric' && styles.segBtnTextActive]}>
                Metric
              </Text>
              <Text style={[styles.segBtnSub, unitSystem === 'metric' && styles.segBtnTextActive]}>
                kg · cm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, unitSystem === 'imperial' && styles.segBtnActive]}
              onPress={() => switchUnitSystem('imperial')}
            >
              <Text style={[styles.segBtnText, unitSystem === 'imperial' && styles.segBtnTextActive]}>
                Imperial
              </Text>
              <Text style={[styles.segBtnSub, unitSystem === 'imperial' && styles.segBtnTextActive]}>
                lbs · in
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Rest Timer */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setRestTimerModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Default Rest Timer</Text>
              <Text style={styles.rowSub}>Time between sets</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{restTimerLabel}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Weight Increment */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setWeightIncrModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Weight Increment</Text>
              <Text style={styles.rowSub}>Default plate step when logging</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{weightIncrLabel}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Reminders ── */}
        <Text style={styles.sectionLabel}>Reminders</Text>
        <View style={styles.card}>
          {/* Workout Reminder */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Workout Reminder</Text>
              <Text style={styles.rowSub}>Daily nudge to hit the gym</Text>
            </View>
            <Switch
              value={workoutReminder}
              onValueChange={setWorkoutReminder}
              trackColor={{ false: '#374151', true: '#6366f1' }}
              thumbColor="#ffffff"
            />
          </View>

          {workoutReminder && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => { setTempReminderTime(reminderTime); setReminderTimeModalVisible(true); }}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>Reminder Time</Text>
                  <Text style={styles.rowSub}>24-hour format</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{reminderTime}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider} />

          {/* Rest Day Reminder */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Rest Day Reminder</Text>
              <Text style={styles.rowSub}>Remind you on scheduled rest days</Text>
            </View>
            <Switch
              value={restDayReminder}
              onValueChange={setRestDayReminder}
              trackColor={{ false: '#374151', true: '#6366f1' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.divider} />

          {/* Streak Reminder */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Streak Alert</Text>
              <Text style={styles.rowSub}>Alert when streak is at risk</Text>
            </View>
            <Switch
              value={streakReminder}
              onValueChange={setStreakReminder}
              trackColor={{ false: '#374151', true: '#6366f1' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* ── Connection ── */}
        <Text style={styles.sectionLabel}>Connection</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => { setTempServerUrl(serverUrl); setServerUrlModalVisible(true); }}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Server URL</Text>
              <Text style={styles.rowSub} numberOfLines={1}>{serverUrl}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Account ── */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, styles.danger]}>Sign Out</Text>
              <Text style={styles.rowSub}>Forget the sign-in saved on this device</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Data ── */}
        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleClearData}>
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, styles.danger]}>Clear Local Data</Text>
              <Text style={styles.rowSub}>Resets body stats, measurements & custom PRs</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Version</Text>
            <Text style={styles.rowValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Built by</Text>
            <Text style={styles.rowValue}>Physics Phuckers</Text>
          </View>
        </View>

        <Text style={styles.footer}>Hypertrophy App · v{APP_VERSION}</Text>
      </ScrollView>

      {/* ── Rest Timer Picker ── */}
      <Modal animationType="slide" transparent visible={restTimerModalVisible} onRequestClose={() => setRestTimerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Default Rest Timer</Text>
            <Text style={styles.modalSubtitle}>Choose how long to rest between sets</Text>
            {REST_TIMER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionRow, restTimer === opt.value && styles.optionRowActive]}
                onPress={() => { setRestTimer(opt.value); setRestTimerModalVisible(false); }}
              >
                <Text style={[styles.optionText, restTimer === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
                {restTimer === opt.value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelSheetBtn} onPress={() => setRestTimerModalVisible(false)}>
              <Text style={styles.cancelSheetText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Weight Increment Picker ── */}
      <Modal animationType="slide" transparent visible={weightIncrModalVisible} onRequestClose={() => setWeightIncrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Weight Increment</Text>
            <Text style={styles.modalSubtitle}>Default step when adding weight</Text>
            {WEIGHT_INCREMENT_OPTIONS[unitSystem].map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionRow, weightIncrement === opt.value && styles.optionRowActive]}
                onPress={() => { setWeightIncrement(opt.value); setWeightIncrModalVisible(false); }}
              >
                <Text style={[styles.optionText, weightIncrement === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
                {weightIncrement === opt.value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelSheetBtn} onPress={() => setWeightIncrModalVisible(false)}>
              <Text style={styles.cancelSheetText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Server URL Modal ── */}
      <Modal animationType="slide" transparent visible={serverUrlModalVisible} onRequestClose={() => setServerUrlModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Server URL</Text>
            <Text style={styles.modalSubtitle}>Your Flask backend address</Text>
            <TextInput
              style={styles.input}
              value={tempServerUrl}
              onChangeText={setTempServerUrl}
              placeholder="http://192.168.x.x:5000"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
            />
            <Text style={styles.inputHint}>
              Find your IP with `ifconfig` on Mac — look for the Wi-Fi IPv4 address.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setServerUrlModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveServerUrl}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Reminder Time Modal ── */}
      <Modal animationType="slide" transparent visible={reminderTimeModalVisible} onRequestClose={() => setReminderTimeModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Reminder Time</Text>
            <Text style={styles.modalSubtitle}>24-hour format (e.g. 07:30)</Text>
            <TextInput
              style={styles.input}
              value={tempReminderTime}
              onChangeText={setTempReminderTime}
              placeholder="HH:MM"
              placeholderTextColor="#6b7280"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReminderTimeModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveReminderTime}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },

  card: {
    backgroundColor: '#1f2937',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 24,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 15, color: '#f9fafb', fontWeight: '500' },
  rowSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rowValue: { fontSize: 15, color: '#818cf8', fontWeight: '600' },
  chevron: { color: '#4b5563', fontSize: 20, marginLeft: 6 },
  danger: { color: '#ef4444' },

  divider: { height: 1, backgroundColor: '#374151', marginLeft: 16 },

  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segBtnActive: { backgroundColor: '#6366f1' },
  segBtnText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
  segBtnSub: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  segBtnTextActive: { color: '#ffffff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },

  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#111827',
  },
  optionRowActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: '#6366f1' },
  optionText: { fontSize: 16, color: '#9ca3af', fontWeight: '500' },
  optionTextActive: { color: '#818cf8', fontWeight: '600' },
  checkmark: { color: '#6366f1', fontSize: 18, fontWeight: 'bold' },

  cancelSheetBtn: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  cancelSheetText: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },

  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inputHint: { fontSize: 12, color: '#6b7280', marginBottom: 20, lineHeight: 18 },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#374151', alignItems: 'center',
  },
  cancelBtnText: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  footer: {
    textAlign: 'center',
    color: '#374151',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 16,
  },
});
