import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API } from '../config';

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRoutines = useCallback(async () => {
    try {
      const res = await fetch(`${API}/plans`);
      const data = await res.json();
      setRoutines(data);
    } catch {
      // server unreachable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoutines();
  };

  const openModal = () => {
    setNewName('');
    setNewDescription('');
    setModalVisible(true);
  };

  const saveRoutine = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: newDescription.trim() || null, days: [] }),
      });
      if (res.ok) {
        setModalVisible(false);
        fetchRoutines();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Could not save routine.');
      }
    } catch {
      Alert.alert('Error', 'Could not reach server.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRoutine = (id, name) => {
    Alert.alert('Delete Routine', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API}/plans/${id}`, { method: 'DELETE' });
            fetchRoutines();
          } catch {
            Alert.alert('Error', 'Could not reach server.');
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.cardRight}>
          {item.day_count > 0 && (
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>
                {item.day_count} {item.day_count === 1 ? 'day' : 'days'}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => deleteRoutine(item.id, item.name)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      {item.description ? (
        <Text style={styles.cardDescription}>{item.description}</Text>
      ) : null}
      <Text style={styles.cardDate}>Created {formatDate(item.created_at)}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Routines</Text>
        <TouchableOpacity style={styles.addButton} onPress={openModal}>
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#6366f1" style={styles.loader} />
      ) : (
        <FlatList
          data={routines}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            routines.length === 0 && styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No routines yet.</Text>
              <Text style={styles.emptySubtext}>Tap "+ New" to create your first routine.</Text>
            </View>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Routine</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Push Pull Legs"
              placeholderTextColor="#6b7280"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={styles.inputLabel}>
              Description{' '}
              <Text style={styles.inputLabelOptional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="e.g. 3-day split, upper/lower focus"
              placeholderTextColor="#6b7280"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!newName.trim() || saving) && styles.saveBtnDisabled]}
                onPress={saveRoutine}
                disabled={!newName.trim() || saving}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f9fafb',
    flex: 1,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayBadge: {
    backgroundColor: '#312e81',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayBadgeText: {
    fontSize: 12,
    color: '#818cf8',
    fontWeight: '600',
  },
  deleteBtn: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 6,
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputLabelOptional: {
    fontSize: 11,
    fontWeight: '400',
    color: '#4b5563',
    textTransform: 'none',
    letterSpacing: 0,
  },
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
  inputMultiline: {
    height: 88,
    paddingTop: 14,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
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
