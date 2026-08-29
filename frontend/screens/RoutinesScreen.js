import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();

  // ── List state ───────────────────────────────────────────────
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── New routine modal ────────────────────────────────────────
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Edit modal (full-screen) ─────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [editRoutineId, setEditRoutineId] = useState(null);
  const [editRoutineName, setEditRoutineName] = useState('');
  const [editExercises, setEditExercises] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // ── Add exercise modal (2-phase) ─────────────────────────────
  const [addExVisible, setAddExVisible] = useState(false);
  const [addExRoutineId, setAddExRoutineId] = useState(null);
  const [addExPhase, setAddExPhase] = useState('picker');
  const [allExercises, setAllExercises] = useState([]);
  const [exSearch, setExSearch] = useState('');
  const [pickedEx, setPickedEx] = useState(null);
  const [tSets, setTSets] = useState('3');
  const [tReps, setTReps] = useState('10');
  const [tWeight, setTWeight] = useState('');
  const [addingSaving, setAddingSaving] = useState(false);

  // ── Fetch routines ────────────────────────────────────────────
  const fetchRoutines = useCallback(async () => {
    try {
      const res = await api(`/plans`);
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
  const onRefresh = () => { setRefreshing(true); fetchRoutines(); };

  // ── New routine ───────────────────────────────────────────────
  const openNewRoutine = () => { setNewName(''); setNewModalVisible(true); };

  const saveRoutine = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await api(`/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) { setNewModalVisible(false); fetchRoutines(); }
      else { const e = await res.json(); Alert.alert('Error', e.error || 'Could not save.'); }
    } catch { Alert.alert('Error', 'Could not reach server.'); }
    finally { setSaving(false); }
  };

  // ── Delete routine ────────────────────────────────────────────
  const deleteRoutine = (id, name) => {
    Alert.alert('Delete Routine', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api(`/plans/${id}`, { method: 'DELETE' });
            fetchRoutines();
          } catch { Alert.alert('Error', 'Could not reach server.'); }
        },
      },
    ]);
  };

  // ── Edit routine ──────────────────────────────────────────────
  const openEdit = async (routineId, routineName) => {
    setEditRoutineId(routineId);
    setEditRoutineName(routineName);
    setEditExercises([]);
    setEditLoading(true);
    setEditVisible(true);
    try {
      const res = await api(`/plans/${routineId}/detail`);
      const data = await res.json();
      // Convert numeric values to strings for TextInput
      setEditExercises(data.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({
          set_number: s.set_number,
          reps: s.target_reps != null ? String(s.target_reps) : '',
          weight: s.target_weight != null ? String(s.target_weight) : '',
        })),
      })));
    } catch { Alert.alert('Error', 'Could not load routine.'); }
    finally { setEditLoading(false); }
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setEditExercises(prev => {
      const next = [...prev];
      const sets = [...next[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      next[exIdx] = { ...next[exIdx], sets };
      return next;
    });
  };

  const addSet = (exIdx) => {
    setEditExercises(prev => {
      const next = [...prev];
      const sets = next[exIdx].sets;
      const last = sets[sets.length - 1];
      next[exIdx] = {
        ...next[exIdx],
        sets: [...sets, {
          set_number: sets.length + 1,
          reps: last?.reps ?? '',
          weight: last?.weight ?? '',
        }],
      };
      return next;
    });
  };

  const removeSet = (exIdx, setIdx) => {
    setEditExercises(prev => {
      const next = [...prev];
      const sets = next[exIdx].sets
        .filter((_, i) => i !== setIdx)
        .map((s, i) => ({ ...s, set_number: i + 1 }));
      next[exIdx] = { ...next[exIdx], sets };
      return next;
    });
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      const exercises = editExercises.map(ex => ({
        plan_exercise_id: ex.plan_exercise_id,
        sets: ex.sets.map(s => ({
          set_number:    s.set_number,
          target_reps:   parseInt(s.reps)    || null,
          target_weight: parseFloat(s.weight) || null,
        })),
      }));
      const res = await api(`/plans/${editRoutineId}/sets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises }),
      });
      if (res.ok) { setEditVisible(false); fetchRoutines(); }
      else { Alert.alert('Error', 'Could not save changes.'); }
    } catch { Alert.alert('Error', 'Could not reach server.'); }
    finally { setEditSaving(false); }
  };

  // ── Add exercise ──────────────────────────────────────────────
  const openAddExercise = async (routineId) => {
    try {
      const res = await api(`/exercises`);
      setAllExercises(await res.json());
    } catch { setAllExercises([]); }
    setExSearch(''); setPickedEx(null);
    setAddExRoutineId(routineId);
    setAddExPhase('picker');
    setAddExVisible(true);
  };

  const filteredExercises = useMemo(() => {
    const q = exSearch.toLowerCase();
    return q ? allExercises.filter(e => e.name.toLowerCase().includes(q)) : allExercises;
  }, [allExercises, exSearch]);

  const pickExercise = (ex) => {
    setPickedEx(ex); setTSets('3'); setTReps('10'); setTWeight('');
    setAddExPhase('config');
  };

  const saveExerciseToRoutine = async () => {
    setAddingSaving(true);
    try {
      const res = await api(`/plans/${addExRoutineId}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id:   pickedEx.id,
          target_sets:   parseInt(tSets)    || 3,
          target_reps:   parseInt(tReps)    || null,
          target_weight: parseFloat(tWeight) || null,
        }),
      });
      if (res.ok) {
        setAddExVisible(false);
        fetchRoutines();
        // Reload edit exercises if we added from within the edit modal
        if (editVisible && addExRoutineId === editRoutineId) {
          try {
            const detailRes = await api(`/plans/${editRoutineId}/detail`);
            const data = await detailRes.json();
            setEditExercises(data.exercises.map(ex => ({
              ...ex,
              sets: ex.sets.map(s => ({
                set_number: s.set_number,
                reps: s.target_reps != null ? String(s.target_reps) : '',
                weight: s.target_weight != null ? String(s.target_weight) : '',
              })),
            })));
          } catch {}
        }
      }
      else { const e = await res.json(); Alert.alert('Error', e.error || 'Could not add.'); }
    } catch { Alert.alert('Error', 'Could not reach server.'); }
    finally { setAddingSaving(false); }
  };

  // ── Remove exercise from routine (edit modal only) ───────────
  const removeExerciseFromEdit = (planExerciseId) => {
    Alert.alert('Remove Exercise', 'Remove this exercise from the routine?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api(`/plans/${editRoutineId}/exercises/${planExerciseId}`, { method: 'DELETE' });
            setEditExercises(prev => prev.filter(e => e.plan_exercise_id !== planExerciseId));
            fetchRoutines();
          } catch { Alert.alert('Error', 'Could not reach server.'); }
        },
      },
    ]);
  };

  // ── Helpers ───────────────────────────────────────────────────
  const prevLabel = (previous, setNumber) => {
    const p = previous?.find(r => r.set_number === setNumber);
    if (!p) return '';
    return `${p.weight} × ${p.reps}`;
  };

  // ── Render card (compact) ─────────────────────────────────────
  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <TouchableOpacity
          onPress={() => deleteRoutine(item.id, item.name)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      {item.exercises.length > 0 && (
        <View style={styles.exNames}>
          {item.exercises.map(ex => (
            <View key={ex.plan_exercise_id} style={styles.exNameRow}>
              <Text style={styles.exNameBullet}>•</Text>
              <Text style={styles.exNameText}>{ex.name}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.editCardBtn} onPress={() => openEdit(item.id, item.name)}>
        <Text style={styles.editCardBtnText}>Edit Routine</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Main render ───────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Routines</Text>
        <TouchableOpacity style={styles.addButton} onPress={openNewRoutine}>
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#6366f1" style={styles.loader} />
      ) : (
        <FlatList
          data={routines}
          keyExtractor={item => String(item.id)}
          renderItem={renderCard}
          contentContainerStyle={[styles.list, routines.length === 0 && styles.emptyList]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No routines yet.</Text>
              <Text style={styles.emptySubtext}>Tap "+ New" to get started.</Text>
            </View>
          }
        />
      )}

      {/* ── New Routine Modal ──────────────────────────────────── */}
      <Modal
        animationType="slide" transparent
        visible={newModalVisible}
        onRequestClose={() => setNewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetOverlay}
        >
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>New Routine</Text>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Push, Upper Body, Chest Day"
              placeholderTextColor="#6b7280"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!newName.trim() || saving) && styles.saveBtnDisabled]}
                onPress={saveRoutine} disabled={!newName.trim() || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Routine Modal (full screen) ───────────────────── */}
      <Modal
        animationType="slide" transparent={false}
        visible={editVisible}
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={[styles.editScreen, { paddingTop: insets.top }]}>
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setEditVisible(false)} style={styles.editBackBtn}>
              <Text style={styles.editBackText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.editHeaderTitle} numberOfLines={1}>{editRoutineName}</Text>
            <TouchableOpacity
              onPress={saveEdit} disabled={editSaving}
              style={styles.editSaveBtn}
            >
              <Text style={[styles.editSaveText, editSaving && styles.editSaveDisabled]}>
                {editSaving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {editLoading ? (
            <ActivityIndicator color="#6366f1" style={styles.loader} />
          ) : (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView
                contentContainerStyle={styles.editScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {editExercises.map((ex, exIdx) => (
                  <View key={ex.plan_exercise_id} style={styles.editExSection}>
                    {/* Exercise header */}
                    <View style={styles.editExHeader}>
                      <View style={styles.editExHeaderLeft}>
                        <Text style={styles.editExName}>{ex.name}</Text>
                        {ex.muscle_group
                          ? <Text style={styles.editExMuscle}>{ex.muscle_group}</Text>
                          : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => removeExerciseFromEdit(ex.plan_exercise_id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.editExRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Column headers */}
                    <View style={styles.setColHeaders}>
                      <View style={styles.colSetNum} />
                      <Text style={[styles.setColHeader, styles.colReps]}>Reps</Text>
                      <Text style={[styles.setColHeader, styles.colWeight]}>Weight</Text>
                      <Text style={[styles.setColHeader, styles.colPrev]}>Previous</Text>
                      <View style={styles.colDel} />
                    </View>

                    {/* Set rows */}
                    {ex.sets.map((s, setIdx) => (
                      <View key={setIdx} style={[styles.setRow, setIdx % 2 === 1 && styles.setRowAlt]}>
                        <Text style={[styles.setNumLabel, styles.colSetNum]}>
                          Set {s.set_number}
                        </Text>
                        <TextInput
                          style={[styles.setInput, styles.colReps]}
                          value={s.reps}
                          onChangeText={v => updateSet(exIdx, setIdx, 'reps', v)}
                          keyboardType="number-pad"
                          placeholder="—"
                          placeholderTextColor="#4b5563"
                        />
                        <TextInput
                          style={[styles.setInput, styles.colWeight]}
                          value={s.weight}
                          onChangeText={v => updateSet(exIdx, setIdx, 'weight', v)}
                          keyboardType="decimal-pad"
                          placeholder="—"
                          placeholderTextColor="#4b5563"
                        />
                        <Text style={[styles.prevLabel, styles.colPrev]}>
                          {prevLabel(ex.previous, s.set_number)}
                        </Text>
                        <TouchableOpacity
                          style={styles.colDel}
                          onPress={() => removeSet(exIdx, setIdx)}
                          disabled={ex.sets.length === 1}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          {ex.sets.length > 1
                            ? <Text style={styles.setDelBtn}>−</Text>
                            : null}
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Add set */}
                    <TouchableOpacity
                      style={styles.addSetBtn}
                      onPress={() => addSet(exIdx)}
                    >
                      <Text style={styles.addSetBtnText}>+ Set</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {editExercises.length === 0 && (
                  <View style={styles.editEmpty}>
                    <Text style={styles.editEmptyText}>No exercises yet.</Text>
                    <Text style={styles.editEmptySubtext}>
                      Tap "+ Add Exercise" below to get started.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addExBtn}
                  onPress={() => openAddExercise(editRoutineId)}
                >
                  <Text style={styles.addExBtnText}>+ Add Exercise</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </View>
      </Modal>

      {/* ── Add Exercise Modal (2-phase) ───────────────────────── */}
      <Modal
        animationType="slide" transparent
        visible={addExVisible}
        onRequestClose={() => setAddExVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetOverlay}
        >
          <View style={[styles.sheetContent, styles.addExSheet]}>
            {addExPhase === 'picker' ? (
              <>
                <Text style={styles.sheetTitle}>Add Exercise</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder="Search exercises…"
                  placeholderTextColor="#6b7280"
                  value={exSearch}
                  onChangeText={setExSearch}
                  autoFocus
                />
                <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {filteredExercises.map(ex => (
                    <TouchableOpacity key={ex.id} style={styles.pickerRow} onPress={() => pickExercise(ex)}>
                      <Text style={styles.pickerName}>{ex.name}</Text>
                      {ex.muscle_group ? <Text style={styles.pickerMuscle}>{ex.muscle_group}</Text> : null}
                    </TouchableOpacity>
                  ))}
                  {filteredExercises.length === 0 && (
                    <Text style={styles.pickerEmpty}>No exercises found.</Text>
                  )}
                </ScrollView>
                <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={() => setAddExVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>{pickedEx?.name}</Text>
                {pickedEx?.muscle_group
                  ? <Text style={styles.configMuscle}>{pickedEx.muscle_group}</Text>
                  : null}
                <View style={styles.configRow}>
                  <View style={styles.configField}>
                    <Text style={styles.inputLabel}>Sets</Text>
                    <TextInput style={[styles.input, styles.configInput]} value={tSets} onChangeText={setTSets} keyboardType="number-pad" placeholder="3" placeholderTextColor="#6b7280" />
                  </View>
                  <View style={styles.configField}>
                    <Text style={styles.inputLabel}>Reps</Text>
                    <TextInput style={[styles.input, styles.configInput]} value={tReps} onChangeText={setTReps} keyboardType="number-pad" placeholder="10" placeholderTextColor="#6b7280" />
                  </View>
                  <View style={styles.configField}>
                    <Text style={styles.inputLabel}>Wt. <Text style={styles.inputLabelOpt}>(lbs)</Text></Text>
                    <TextInput style={[styles.input, styles.configInput]} value={tWeight} onChangeText={setTWeight} keyboardType="decimal-pad" placeholder="—" placeholderTextColor="#6b7280" />
                  </View>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddExPhase('picker')}>
                    <Text style={styles.cancelBtnText}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, addingSaving && styles.saveBtnDisabled]}
                    onPress={saveExerciseToRoutine} disabled={addingSaving}
                  >
                    <Text style={styles.saveBtnText}>{addingSaving ? 'Adding…' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#1f2937',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  addButton: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 12 },
  emptyList: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6b7280' },
  emptySubtext: { fontSize: 14, color: '#4b5563', marginTop: 6 },

  // ── Card ──────────────────────────────────────────────────────
  card: {
    backgroundColor: '#1f2937', borderRadius: 16,
    borderWidth: 1, borderColor: '#374151', overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#f9fafb', flex: 1 },
  deleteBtn: { fontSize: 15, color: '#6b7280' },

  // Exercise list in card
  exNames: {
    borderTopWidth: 1, borderTopColor: '#374151',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
    gap: 5,
  },
  exNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exNameBullet: { fontSize: 14, color: '#4b5563' },
  exNameText: { fontSize: 16, color: '#d1d5db', flex: 1 },

  // Edit button at card bottom
  editCardBtn: {
    marginHorizontal: 12, marginVertical: 10, paddingVertical: 11,
    borderRadius: 10, borderWidth: 1, borderColor: '#4338ca',
    backgroundColor: '#1e1b4b', alignItems: 'center',
  },
  editCardBtnText: { fontSize: 15, color: '#818cf8', fontWeight: '600' },

  // Add exercise button (inside edit modal)
  addExBtn: {
    marginHorizontal: 0, marginTop: 8, marginBottom: 8, paddingVertical: 13,
    borderRadius: 10, borderWidth: 1, borderColor: '#374151',
    borderStyle: 'dashed', alignItems: 'center',
  },
  addExBtnText: { fontSize: 14, color: '#818cf8', fontWeight: '600' },

  // ── Edit screen ─────────────────────────────────────────���─────
  editScreen: { flex: 1, backgroundColor: '#111827' },
  editHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1f2937',
  },
  editBackBtn: { paddingRight: 12 },
  editBackText: { fontSize: 15, color: '#818cf8', fontWeight: '600' },
  editHeaderTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#f9fafb', textAlign: 'center' },
  editSaveBtn: { paddingLeft: 12 },
  editSaveText: { fontSize: 15, color: '#818cf8', fontWeight: '700' },
  editSaveDisabled: { opacity: 0.4 },
  editScrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },

  editEmpty: { alignItems: 'center', marginTop: 60 },
  editEmptyText: { fontSize: 17, fontWeight: '600', color: '#6b7280' },
  editEmptySubtext: { fontSize: 14, color: '#4b5563', marginTop: 6, textAlign: 'center' },

  // Exercise section
  editExSection: {
    backgroundColor: '#1f2937', borderRadius: 14,
    borderWidth: 1, borderColor: '#374151',
    marginBottom: 12, overflow: 'hidden',
  },
  editExHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
  },
  editExHeaderLeft: { flex: 1 },
  editExName: { fontSize: 16, fontWeight: '700', color: '#f9fafb' },
  editExMuscle: { fontSize: 12, color: '#818cf8', marginTop: 2 },
  editExRemove: { fontSize: 15, color: '#6b7280', paddingLeft: 8 },

  // Column headers row
  setColHeaders: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#111827',
    borderTopWidth: 1, borderTopColor: '#374151',
  },
  setColHeader: { fontSize: 10, color: '#4b5563', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  // Set rows
  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  setRowAlt: { backgroundColor: 'rgba(0,0,0,0.15)' },
  setNumLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  setInput: {
    backgroundColor: '#111827', borderRadius: 8,
    paddingVertical: 7, fontSize: 15, color: '#f9fafb',
    textAlign: 'center', borderWidth: 1, borderColor: '#374151',
  },
  prevLabel: { fontSize: 13, color: '#4b5563', textAlign: 'center' },
  setDelBtn: { fontSize: 18, color: '#6b7280', textAlign: 'center' },

  // Column widths (shared header + row)
  colSetNum:  { width: 50 },
  colReps:    { width: 58, marginHorizontal: 4 },
  colWeight:  { width: 72, marginHorizontal: 4 },
  colPrev:    { flex: 1 },
  colDel:     { width: 24, alignItems: 'center' },

  // Add set button
  addSetBtn: { marginHorizontal: 10, marginVertical: 8, paddingVertical: 8, alignItems: 'center' },
  addSetBtnText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },

  // ── Bottom sheets ───────────────────────────────────────���─────
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheetContent: {
    backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
  },
  addExSheet: { maxHeight: '82%' },
  sheetTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputLabelOpt: { fontSize: 11, fontWeight: '400', color: '#4b5563', textTransform: 'none', letterSpacing: 0 },
  input: {
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#f9fafb', marginBottom: 16, borderWidth: 1, borderColor: '#374151',
  },
  rowActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  // Picker
  pickerList: { maxHeight: 300 },
  pickerRow: { paddingVertical: 13, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: '#374151' },
  pickerName: { fontSize: 15, color: '#f9fafb', fontWeight: '500' },
  pickerMuscle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  pickerEmpty: { fontSize: 14, color: '#4b5563', textAlign: 'center', marginTop: 24 },

  // Config (sets/reps/weight after picking)
  configMuscle: { fontSize: 13, color: '#818cf8', marginBottom: 20, marginTop: -8 },
  configRow: { flexDirection: 'row', gap: 10 },
  configField: { flex: 1 },
  configInput: { marginBottom: 0, paddingHorizontal: 10, textAlign: 'center' },
});
