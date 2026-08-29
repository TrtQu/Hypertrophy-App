import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { useSettings } from '../context/SettingsContext';

const { width } = Dimensions.get('window');

const TIME_PERIODS = ['1W', '1M', '3M', '6M', '1Y', 'All'];

const FIELD_LABELS = {
  height: 'Height', weight: 'Weight', bodyFat: 'Body Fat',
  fatMass: 'Fat Mass', leanMass: 'Lean Body Mass',
  neck: 'Neck', shoulders: 'Shoulders', chest: 'Chest',
  leftBicep: 'Left Bicep', rightBicep: 'Right Bicep',
  leftForearm: 'Left Forearm', rightForearm: 'Right Forearm',
  waist: 'Waist', hips: 'Hips',
  leftThigh: 'Left Thigh', rightThigh: 'Right Thigh',
  leftCalf: 'Left Calf', rightCalf: 'Right Calf',
};

// Fields stored in kg vs cm internally (always metric storage)
const WEIGHT_FIELDS = new Set(['weight']);
const LENGTH_FIELDS = new Set([
  'height', 'neck', 'shoulders', 'chest',
  'leftBicep', 'rightBicep', 'leftForearm', 'rightForearm',
  'waist', 'hips', 'leftThigh', 'rightThigh', 'leftCalf', 'rightCalf',
]);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { unitSystem } = useSettings();
  const isImperial = unitSystem === 'imperial';

  // Unit conversion helpers — values are always stored in metric internally
  const kgToDisplay  = (kg) => isImperial ? kg * 2.20462 : kg;
  const cmToDisplay  = (cm) => isImperial ? cm / 2.54    : cm;
  const displayToKg  = (v)  => isImperial ? v / 2.20462  : v;
  const displayToCm  = (v)  => isImperial ? v * 2.54     : v;
  const weightUnit   = isImperial ? 'lbs' : 'kg';
  const lengthUnit   = isImperial ? 'in'  : 'cm';

  const fmtWeight = (kg)  => (!kg) ? '--' : kgToDisplay(kg).toFixed(1);
  const fmtLength = (cm)  => (!cm) ? '--' : cmToDisplay(cm).toFixed(1);
  const fmtPct    = (val) => (!val) ? '--' : Number(val).toFixed(1);

  // ── Backend state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Username edit ──────────────────────────────────────────────────────────
  const [editUsernameVisible, setEditUsernameVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Body stats (local, stored in metric) ───────────────────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [bodyStats, setBodyStats] = useState({
    height: 0, weight: 0, bodyFat: 0, fatMass: 0, leanMass: 0,
  });
  const [measurements, setMeasurements] = useState({
    neck: 0, shoulders: 0, chest: 0,
    leftBicep: 0, rightBicep: 0,
    leftForearm: 0, rightForearm: 0,
    waist: 0, hips: 0,
    leftThigh: 0, rightThigh: 0,
    leftCalf: 0, rightCalf: 0,
  });
  const [weightHistory, setWeightHistory] = useState([]);
  const [bodyFatHistory, setBodyFatHistory] = useState([]);

  // ── Custom PRs (local) ─────────────────────────────────────────────────────
  const [customPRs, setCustomPRs] = useState([]);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [editStatVisible, setEditStatVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logData, setLogData] = useState({ weight: '', bodyFat: '' });
  const [prModalVisible, setPrModalVisible] = useState(false);
  const [newPR, setNewPR] = useState({ exercise: '', weight: '', reps: '1' });

  // ── Fetching ───────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, workoutsRes] = await Promise.all([
        api(`/profile`),
        api(`/workouts`),
      ]);
      setProfile(await profileRes.json());
      setWorkouts(await workoutsRes.json());
    } catch {
      // server unreachable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  // ── Username ───────────────────────────────────────────────────────────────
  const saveUsername = async () => {
    const username = newUsername.trim();
    if (!username) return;
    setSaving(true);
    try {
      const res = await api(`/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setProfile(prev => ({ ...prev, username }));
        setEditUsernameVisible(false);
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Could not update username.');
      }
    } catch {
      Alert.alert('Error', 'Could not reach server.');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateHistory = (history, date, value) => {
    const arr = [...history];
    const idx = arr.findIndex(e => e.date === date);
    if (idx >= 0) arr[idx].value = value;
    else arr.push({ date, value });
    return arr.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getFilteredHistory = (history) => {
    if (!history.length) return [];
    const now = new Date();
    const cutoff = new Date();
    switch (selectedPeriod) {
      case '1W': cutoff.setDate(now.getDate() - 7); break;
      case '1M': cutoff.setMonth(now.getMonth() - 1); break;
      case '3M': cutoff.setMonth(now.getMonth() - 3); break;
      case '6M': cutoff.setMonth(now.getMonth() - 6); break;
      case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
      default: return history;
    }
    return history.filter(e => new Date(e.date) >= cutoff);
  };

  const getProgressChange = (history) => {
    const filtered = getFilteredHistory(history);
    if (filtered.length < 2) return { value: 0, isLoss: false, hasData: filtered.length > 0 };
    const change = filtered[filtered.length - 1].value - filtered[0].value;
    return { rawValue: Math.abs(change), isLoss: change < 0, hasData: true };
  };

  const weightChange  = getProgressChange(weightHistory);
  const bodyFatChange = getProgressChange(bodyFatHistory);

  const formatDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const formatWorkoutDate = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  // ── Body stat edit ─────────────────────────────────────────────────────────
  const openEditStat = (field, storedValue, _unused) => {
    let displayValue = storedValue;
    let unit = 'cm';
    if (WEIGHT_FIELDS.has(field)) {
      displayValue = storedValue > 0 ? kgToDisplay(storedValue) : 0;
      unit = weightUnit;
    } else if (LENGTH_FIELDS.has(field)) {
      displayValue = storedValue > 0 ? cmToDisplay(storedValue) : 0;
      unit = lengthUnit;
    } else {
      unit = '%';
    }
    setEditingField({ field, unit });
    setTempValue(displayValue > 0 ? displayValue.toFixed(1) : '');
    setEditStatVisible(true);
  };

  const saveStat = () => {
    const num = parseFloat(tempValue);
    if (isNaN(num) || num < 0) { Alert.alert('Invalid Value', 'Please enter a valid number.'); return; }
    const today = new Date().toISOString().split('T')[0];

    // Convert display value back to metric for storage
    let storeValue = num;
    if (WEIGHT_FIELDS.has(editingField.field)) storeValue = displayToKg(num);
    else if (LENGTH_FIELDS.has(editingField.field)) storeValue = displayToCm(num);

    if (editingField.field in bodyStats) {
      const updated = { ...bodyStats, [editingField.field]: storeValue };
      if (editingField.field === 'weight') setWeightHistory(prev => updateHistory(prev, today, storeValue));
      if (editingField.field === 'bodyFat') setBodyFatHistory(prev => updateHistory(prev, today, storeValue));
      if (editingField.field === 'weight' || editingField.field === 'bodyFat') {
        const w  = editingField.field === 'weight'  ? storeValue : updated.weight;
        const bf = editingField.field === 'bodyFat' ? storeValue : updated.bodyFat;
        if (w > 0 && bf > 0) {
          updated.fatMass  = parseFloat(((w * bf) / 100).toFixed(2));
          updated.leanMass = parseFloat((w - updated.fatMass).toFixed(2));
        }
      }
      setBodyStats(updated);
    } else {
      setMeasurements(prev => ({ ...prev, [editingField.field]: storeValue }));
    }
    setEditStatVisible(false);
  };

  // ── Log new entry ──────────────────────────────────────────────────────────
  const openLogModal = () => {
    setLogData({
      weight: bodyStats.weight > 0 ? kgToDisplay(bodyStats.weight).toFixed(1) : '',
      bodyFat: bodyStats.bodyFat > 0 ? bodyStats.bodyFat.toFixed(1) : '',
    });
    setLogModalVisible(true);
  };

  const saveLogEntry = () => {
    const weightDisplay = parseFloat(logData.weight);
    const bodyFat = parseFloat(logData.bodyFat);
    if (isNaN(weightDisplay) && isNaN(bodyFat)) { Alert.alert('Invalid Input', 'Please enter at least one value.'); return; }
    const today = new Date().toISOString().split('T')[0];
    const updated = { ...bodyStats };
    if (!isNaN(weightDisplay) && weightDisplay > 0) {
      const weightKg = displayToKg(weightDisplay);
      updated.weight = weightKg;
      setWeightHistory(prev => updateHistory(prev, today, weightKg));
    }
    if (!isNaN(bodyFat) && bodyFat > 0) {
      updated.bodyFat = bodyFat;
      setBodyFatHistory(prev => updateHistory(prev, today, bodyFat));
    }
    if (updated.weight > 0 && updated.bodyFat > 0) {
      updated.fatMass  = parseFloat(((updated.weight * updated.bodyFat) / 100).toFixed(2));
      updated.leanMass = parseFloat((updated.weight - updated.fatMass).toFixed(2));
    }
    setBodyStats(updated);
    setLogModalVisible(false);
    Alert.alert('Logged!', "Today's stats have been saved.");
  };

  // ── Custom PRs ─────────────────────────────────────────────────────────────
  const savePR = () => {
    if (!newPR.exercise.trim()) { Alert.alert('Missing Exercise', 'Please enter an exercise name.'); return; }
    const weight = parseFloat(newPR.weight);
    const reps = parseInt(newPR.reps) || 1;
    if (isNaN(weight) || weight <= 0) { Alert.alert('Invalid Weight', 'Please enter a valid weight.'); return; }
    const today = new Date().toISOString().split('T')[0];
    const record = { id: Date.now().toString(), exercise: newPR.exercise.trim(), weight, reps, date: today };
    const idx = customPRs.findIndex(p => p.exercise.toLowerCase() === record.exercise.toLowerCase());
    if (idx >= 0) {
      if (weight > customPRs[idx].weight) {
        const updated = [...customPRs];
        updated[idx] = record;
        setCustomPRs(updated);
        Alert.alert('New PR!', `You beat your ${record.exercise} record!`);
      } else {
        Alert.alert('Not a PR', `Current best: ${customPRs[idx].weight} lbs`);
      }
    } else {
      setCustomPRs(prev => [...prev, record]);
      Alert.alert('PR Logged!', `${record.exercise}: ${weight} lbs x ${reps}`);
    }
    setPrModalVisible(false);
  };

  const deletePR = (id) => Alert.alert('Delete PR', 'Remove this record?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => setCustomPRs(prev => prev.filter(p => p.id !== id)) },
  ]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.logButton} onPress={openLogModal}>
          <Text style={styles.logButtonText}>+ Log Stats</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#6366f1" style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar + Identity */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.username?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{profile?.username ?? '—'}</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => { setNewUsername(profile?.username || ''); setEditUsernameVisible(true); }}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            {profile?.email ? <Text style={styles.email}>{profile.email}</Text> : null}
            <Text style={styles.memberSince}>Member since {formatDate(profile?.member_since)}</Text>
          </View>

          {/* Backend Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile?.stats?.total_workouts ?? '—'}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile?.stats?.total_sets ?? '—'}</Text>
              <Text style={styles.statLabel}>Total Sets</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile?.stats?.favorite_muscle ?? '—'}</Text>
              <Text style={styles.statLabel}>Top Muscle</Text>
            </View>
          </View>

          {/* Time Period Selector */}
          <View style={styles.periodSelector}>
            {TIME_PERIODS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]}
                onPress={() => setSelectedPeriod(p)}
              >
                <Text style={[styles.periodBtnText, selectedPeriod === p && styles.periodBtnTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Body Stat Cards */}
          <View style={styles.bodyStatsRow}>
            <TouchableOpacity
              style={styles.bodyStatCard}
              onPress={() => openEditStat('weight', bodyStats.weight)}
            >
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.bodyStatGradient}>
                <Text style={styles.bodyStatLabel}>Weight</Text>
                <Text style={styles.bodyStatValue}>{fmtWeight(bodyStats.weight)}</Text>
                <Text style={styles.bodyStatUnit}>{weightUnit}</Text>
                {weightChange.hasData && weightChange.rawValue > 0 && (
                  <View style={[styles.changeChip, weightChange.isLoss ? styles.chipGreen : styles.chipRed]}>
                    <Text style={styles.changeChipText}>
                      {weightChange.isLoss ? '↓' : '↑'} {kgToDisplay(weightChange.rawValue).toFixed(1)} {weightUnit}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bodyStatCard}
              onPress={() => openEditStat('bodyFat', bodyStats.bodyFat)}
            >
              <LinearGradient colors={['#059669', '#10b981']} style={styles.bodyStatGradient}>
                <Text style={styles.bodyStatLabel}>Body Fat</Text>
                <Text style={styles.bodyStatValue}>{fmtPct(bodyStats.bodyFat)}</Text>
                <Text style={styles.bodyStatUnit}>%</Text>
                {bodyFatChange.hasData && bodyFatChange.rawValue > 0 && (
                  <View style={[styles.changeChip, bodyFatChange.isLoss ? styles.chipGreen : styles.chipRed]}>
                    <Text style={styles.changeChipText}>
                      {bodyFatChange.isLoss ? '↓' : '↑'} {bodyFatChange.rawValue.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Body Composition */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body Composition</Text>
            <View style={styles.card}>
              <StatRow
                label="Height"
                value={`${fmtLength(bodyStats.height)} ${lengthUnit}`}
                onPress={() => openEditStat('height', bodyStats.height)}
              />
              <StatRow label={`Fat Mass`} value={`${fmtWeight(bodyStats.fatMass)} ${weightUnit}`} calculated />
              <StatRow label="Lean Body Mass" value={`${fmtWeight(bodyStats.leanMass)} ${weightUnit}`} calculated isLast />
            </View>
          </View>

          {/* Body Measurements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body Measurements</Text>
            <View style={styles.card}>
              <Text style={styles.measureGroupLabel}>Upper Body</Text>
              <View style={styles.tileGrid}>
                {[['Neck','neck'],['Shoulders','shoulders'],['Chest','chest'],['Waist','waist']].map(([label, key]) => (
                  <MeasurementTile
                    key={key}
                    label={label}
                    value={measurements[key]}
                    unit={lengthUnit}
                    displayVal={measurements[key] > 0 ? cmToDisplay(measurements[key]).toFixed(1) : null}
                    onPress={() => openEditStat(key, measurements[key])}
                  />
                ))}
              </View>
              <Text style={styles.measureGroupLabel}>Arms</Text>
              <View style={styles.tileGrid}>
                {[['L Bicep','leftBicep'],['R Bicep','rightBicep'],['L Forearm','leftForearm'],['R Forearm','rightForearm']].map(([label, key]) => (
                  <MeasurementTile
                    key={key}
                    label={label}
                    value={measurements[key]}
                    unit={lengthUnit}
                    displayVal={measurements[key] > 0 ? cmToDisplay(measurements[key]).toFixed(1) : null}
                    onPress={() => openEditStat(key, measurements[key])}
                  />
                ))}
              </View>
              <Text style={styles.measureGroupLabel}>Lower Body</Text>
              <View style={styles.tileGrid}>
                {[['Hips','hips'],['L Thigh','leftThigh'],['R Thigh','rightThigh'],['L Calf','leftCalf'],['R Calf','rightCalf']].map(([label, key]) => (
                  <MeasurementTile
                    key={key}
                    label={label}
                    value={measurements[key]}
                    unit={lengthUnit}
                    displayVal={measurements[key] > 0 ? cmToDisplay(measurements[key]).toFixed(1) : null}
                    onPress={() => openEditStat(key, measurements[key])}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Backend PRs */}
          {profile?.prs?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Records</Text>
              <View style={styles.card}>
                {profile.prs.map((pr, i) => (
                  <View key={i} style={[styles.prRow, i < profile.prs.length - 1 && styles.rowBorder]}>
                    <View style={styles.prLeft}>
                      <Text style={styles.prName}>{pr.exercise_name}</Text>
                      {pr.muscle_group ? <Text style={styles.prSub}>{pr.muscle_group}</Text> : null}
                    </View>
                    <Text style={styles.prWeight}>{pr.max_weight} lbs</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Custom PRs */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Custom PRs</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => { setNewPR({ exercise: '', weight: '', reps: '1' }); setPrModalVisible(true); }}
              >
                <Text style={styles.addBtnText}>+ Add PR</Text>
              </TouchableOpacity>
            </View>
            {customPRs.length > 0 ? (
              <View style={styles.card}>
                {customPRs.map((pr, i) => (
                  <TouchableOpacity
                    key={pr.id}
                    style={[styles.prRow, i < customPRs.length - 1 && styles.rowBorder]}
                    onLongPress={() => deletePR(pr.id)}
                  >
                    <View style={styles.prLeft}>
                      <Text style={styles.prName}>{pr.exercise}</Text>
                      <Text style={styles.prSub}>
                        {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.prRightCol}>
                      <Text style={styles.prWeight}>{pr.weight} lbs</Text>
                      <Text style={styles.prSub}>x{pr.reps}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.card, styles.emptyCard]}>
                <Text style={styles.emptyText}>No custom PRs yet</Text>
                <Text style={styles.emptySub}>Tap "+ Add PR" to log a personal record</Text>
              </View>
            )}
          </View>

          {/* Workout History */}
          {workouts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Workout History</Text>
              <View style={styles.card}>
                {workouts.map((w, i) => (
                  <View key={w.id} style={[styles.prRow, i < workouts.length - 1 && styles.rowBorder]}>
                    <View style={styles.prLeft}>
                      <Text style={styles.prName}>{w.name || 'Workout'}</Text>
                      {w.notes ? <Text style={styles.prSub}>{w.notes}</Text> : null}
                    </View>
                    <Text style={styles.historyDate}>{formatWorkoutDate(w.workout_date)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Edit Username Modal ── */}
      <Modal animationType="slide" transparent visible={editUsernameVisible} onRequestClose={() => setEditUsernameVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#6b7280"
              value={newUsername}
              onChangeText={setNewUsername}
              autoFocus
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditUsernameVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!newUsername.trim() || saving) && styles.saveBtnDisabled]}
                onPress={saveUsername}
                disabled={!newUsername.trim() || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Single Stat Modal ── */}
      <Modal animationType="slide" transparent visible={editStatVisible} onRequestClose={() => setEditStatVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{editingField ? (FIELD_LABELS[editingField.field] ?? editingField.field) : ''}</Text>
            <View style={styles.numInputRow}>
              <TextInput
                style={styles.numInput}
                value={tempValue}
                onChangeText={setTempValue}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                placeholder="0"
                placeholderTextColor="#6b7280"
              />
              <Text style={styles.numInputUnit}>{editingField?.unit}</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditStatVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveStat}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Log New Entry Modal ── */}
      <Modal animationType="slide" transparent visible={logModalVisible} onRequestClose={() => setLogModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log Today's Stats</Text>
            <Text style={styles.modalSubtitle}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={styles.inputLabel}>Weight ({weightUnit})</Text>
            <View style={styles.numInputRow}>
              <TextInput
                style={styles.numInput}
                value={logData.weight}
                onChangeText={t => setLogData(p => ({ ...p, weight: t }))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#6b7280"
              />
              <Text style={styles.numInputUnit}>{weightUnit}</Text>
            </View>
            <Text style={styles.inputLabel}>Body Fat (%)</Text>
            <View style={styles.numInputRow}>
              <TextInput
                style={styles.numInput}
                value={logData.bodyFat}
                onChangeText={t => setLogData(p => ({ ...p, bodyFat: t }))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#6b7280"
              />
              <Text style={styles.numInputUnit}>%</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveLogEntry}>
                <Text style={styles.saveBtnText}>Log Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Custom PR Modal ── */}
      <Modal animationType="slide" transparent visible={prModalVisible} onRequestClose={() => setPrModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log PR</Text>
            <Text style={styles.inputLabel}>Exercise</Text>
            <TextInput
              style={styles.input}
              value={newPR.exercise}
              onChangeText={t => setNewPR(p => ({ ...p, exercise: t }))}
              placeholder="e.g. Bench Press"
              placeholderTextColor="#6b7280"
              autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Weight (lbs)</Text>
            <View style={styles.numInputRow}>
              <TextInput
                style={styles.numInput}
                value={newPR.weight}
                onChangeText={t => setNewPR(p => ({ ...p, weight: t }))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#6b7280"
              />
              <Text style={styles.numInputUnit}>lbs</Text>
            </View>
            <Text style={styles.inputLabel}>Reps</Text>
            <View style={styles.numInputRow}>
              <TextInput
                style={styles.numInput}
                value={newPR.reps}
                onChangeText={t => setNewPR(p => ({ ...p, reps: t }))}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="#6b7280"
              />
              <Text style={styles.numInputUnit}>reps</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPrModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={savePR}>
                <Text style={styles.saveBtnText}>Save PR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatRow({ label, value, onPress, calculated, isLast }) {
  return (
    <TouchableOpacity
      style={[styles.statRowItem, !isLast && styles.rowBorder]}
      onPress={onPress}
      disabled={calculated}
    >
      <Text style={styles.statRowLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.statRowValue}>{value}</Text>
        {!calculated && <Text style={styles.chevron}>›</Text>}
      </View>
    </TouchableOpacity>
  );
}

function MeasurementTile({ label, displayVal, unit, onPress }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{displayVal ? `${displayVal} ${unit}` : '--'}</Text>
    </TouchableOpacity>
  );
}

const TILE_WIDTH = Math.floor((width - 32 - 2 - 24 - 10) / 2);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  logButton: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  logButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  loader: { marginTop: 40 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText: { fontSize: 34, fontWeight: 'bold', color: '#ffffff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  username: { fontSize: 22, fontWeight: 'bold', color: '#f9fafb' },
  editBtn: { backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  editBtnText: { fontSize: 13, color: '#818cf8', fontWeight: '600' },
  email: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  memberSince: { fontSize: 13, color: '#4b5563' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#1f2937', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#f9fafb', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  periodSelector: { flexDirection: 'row', backgroundColor: '#1f2937', borderRadius: 12, padding: 4, marginBottom: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  periodBtnActive: { backgroundColor: '#6366f1' },
  periodBtnText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  periodBtnTextActive: { color: '#ffffff' },

  bodyStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  bodyStatCard: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  bodyStatGradient: { padding: 16, alignItems: 'center', minHeight: 130 },
  bodyStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 },
  bodyStatValue: { color: '#ffffff', fontSize: 30, fontWeight: 'bold' },
  bodyStatUnit: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginBottom: 6 },
  changeChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  chipGreen: { backgroundColor: 'rgba(16,185,129,0.3)' },
  chipRed: { backgroundColor: 'rgba(239,68,68,0.3)' },
  changeChipText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addBtn: { backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#374151' },
  addBtnText: { color: '#818cf8', fontSize: 12, fontWeight: '600' },

  card: { backgroundColor: '#1f2937', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#374151' },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#f9fafb', fontSize: 15, fontWeight: '500', marginBottom: 4 },
  emptySub: { color: '#6b7280', fontSize: 13, textAlign: 'center' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#374151' },

  statRowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  statRowLabel: { color: '#f9fafb', fontSize: 15 },
  statRowValue: { color: '#818cf8', fontSize: 15, fontWeight: '600' },
  chevron: { color: '#4b5563', fontSize: 20, marginLeft: 6 },

  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  prLeft: { flex: 1 },
  prName: { fontSize: 15, color: '#f9fafb', fontWeight: '500' },
  prSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  prWeight: { fontSize: 16, fontWeight: '700', color: '#818cf8', marginLeft: 12 },
  prRightCol: { alignItems: 'flex-end' },
  historyDate: { fontSize: 13, color: '#818cf8', fontWeight: '500' },

  measureGroupLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 4,
    gap: 8,
  },
  tile: {
    width: TILE_WIDTH,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  tileLabel: { color: '#818cf8', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  tileValue: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },

  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inputLabel: { color: '#9ca3af', fontSize: 13, fontWeight: '500', marginBottom: 8 },
  numInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  numInput: { flex: 1, color: '#ffffff', fontSize: 22, fontWeight: '600', paddingVertical: 14 },
  numInputUnit: { color: '#6b7280', fontSize: 16 },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
