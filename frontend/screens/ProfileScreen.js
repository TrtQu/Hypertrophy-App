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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API } from '../config';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, workoutsRes] = await Promise.all([
        fetch(`${API}/profile`),
        fetch(`${API}/workouts`),
      ]);
      const profileData = await profileRes.json();
      const workoutsData = await workoutsRes.json();
      setProfile(profileData);
      setWorkouts(workoutsData);
    } catch {
      // server unreachable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const openEditModal = () => {
    setNewUsername(profile?.username || '');
    setEditModalVisible(true);
  };

  const saveUsername = async () => {
    const username = newUsername.trim();
    if (!username) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setProfile(prev => ({ ...prev, username }));
        setEditModalVisible(false);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatWorkoutDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#6366f1" style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
        >
          {/* Avatar + identity */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.username?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{profile?.username ?? '—'}</Text>
              <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.email}>{profile?.email ?? ''}</Text>
            <Text style={styles.memberSince}>
              Member since {formatDate(profile?.member_since)}
            </Text>
          </View>

          {/* Stats row */}
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

          {/* Personal Records */}
          {profile?.prs?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Records</Text>
              {profile.prs.map((pr, i) => (
                <View key={i} style={styles.prRow}>
                  <View style={styles.prLeft}>
                    <Text style={styles.prName}>{pr.exercise_name}</Text>
                    {pr.muscle_group ? (
                      <Text style={styles.prMuscle}>{pr.muscle_group}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.prWeight}>{pr.max_weight} lbs</Text>
                </View>
              ))}
            </View>
          )}

          {/* Workout History */}
          {workouts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Workout History</Text>
              {workouts.map((w) => (
                <View key={w.id} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyName}>{w.name || 'Workout'}</Text>
                    {w.notes ? <Text style={styles.historyNotes}>{w.notes}</Text> : null}
                  </View>
                  <Text style={styles.historyDate}>{formatWorkoutDate(w.workout_date)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        animationType="slide"
        transparent
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
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
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loader: {
    marginTop: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  editBtn: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  editBtnText: {
    fontSize: 13,
    color: '#818cf8',
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: '#4b5563',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
  },
  prLeft: {
    flex: 1,
  },
  prName: {
    fontSize: 15,
    color: '#f9fafb',
    fontWeight: '500',
  },
  prMuscle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  prWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#818cf8',
    marginLeft: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
  },
  historyLeft: {
    flex: 1,
    marginRight: 12,
  },
  historyName: {
    fontSize: 15,
    color: '#f9fafb',
    fontWeight: '500',
  },
  historyNotes: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 13,
    color: '#818cf8',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});