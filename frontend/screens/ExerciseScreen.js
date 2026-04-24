import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API } from '../config';

const MUSCLE_HIERARCHY = {
  Chest: [
    'Upper Chest',
    'Middle Chest',
    'Lower Chest',
  ],
  Back: [
    'Lats',
    'Upper Back',
    'Erectors',
  ],
  Shoulders: [
    'Front Delts',
    'Side Delts',
    'Rear Delts',
  ],
  Arms: [
    'Biceps',
    'Triceps',
    'Brachialis',
    'Forearms (Flexors)',
    'Forearms (Extensors)',
    'Brachioradialis',
  ],
  Legs: [
    'Quads',
    'Hamstrings',
    'Glutes',
    'Adductors',
    'Abductors',
    'Calves',
  ],
  Core: [
    'Abs',
    'Obliques',
    'Serratus Anterior',
  ],
  Other: ['Other'],
};






const CATEGORIES = Object.keys(MUSCLE_HIERARCHY);

// Map each specific muscle (and each broad category itself) → its broad category.
// The broad-name fallback handles exercises saved before the granular update.
const MUSCLE_TO_CATEGORY = {
  ...Object.fromEntries(
    Object.entries(MUSCLE_HIERARCHY).flatMap(([cat, muscles]) =>
      muscles.map(m => [m, cat])
    )
  ),
  ...Object.fromEntries(CATEGORIES.map(cat => [cat, cat])),
};

export default function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [isUnilateral, setIsUnilateral] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchExercises = useCallback(async () => {
    try {
      const res = await fetch(`${API}/exercises`);
      const data = await res.json();
      const groups = {};
      for (const ex of data) {
        const group = ex.muscle_group || 'Other';
        if (!groups[group]) groups[group] = [];
        groups[group].push(ex);
      }
      const sorted = Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([title, exercises]) => ({ title, data: exercises }));
      setSections(sorted);
    } catch {
      // server unreachable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExercises();
  };

  const filteredSections = useMemo(() => {
    const query = searchText.toLowerCase();
    return sections
      .filter(s => activeCategory === 'All' || MUSCLE_TO_CATEGORY[s.title] === activeCategory)
      .map(s => ({
        ...s,
        data: query ? s.data.filter(ex => ex.name.toLowerCase().includes(query)) : s.data,
      }))
      .filter(s => s.data.length > 0);
  }, [sections, searchText, activeCategory]);

  const openModal = () => {
    setNewName('');
    setSelectedCategory('');
    setNewMuscle('');
    setIsUnilateral(false);
    setNewNotes('');
    setModalVisible(true);
  };

  const handleCategorySelect = (cat) => {
    if (selectedCategory === cat) {
      setSelectedCategory('');
      setNewMuscle('');
    } else {
      setSelectedCategory(cat);
      const opts = MUSCLE_HIERARCHY[cat];
      // Auto-select when there's only one option (e.g. "Other")
      setNewMuscle(opts.length === 1 ? opts[0] : '');
    }
  };

  const saveExercise = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          muscle_group: newMuscle || null,
          is_unilateral: isUnilateral,
          notes: newNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setModalVisible(false);
        fetchExercises();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Could not save exercise.');
      }
    } catch {
      Alert.alert('Error', 'Could not reach server.');
    } finally {
      setSaving(false);
    }
  };

  const deleteExercise = (id, name) => {
    Alert.alert('Delete Exercise', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API}/exercises/${id}`, { method: 'DELETE' });
            fetchExercises();
          } catch {
            Alert.alert('Error', 'Could not reach server.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowText}>{item.name}</Text>
          {item.is_unilateral ? (
            <View style={styles.uniBadge}>
              <Text style={styles.uniBadgeText}>Unilateral</Text>
            </View>
          ) : null}
        </View>
        {item.notes ? <Text style={styles.rowNotes}>{item.notes}</Text> : null}
      </View>
      <TouchableOpacity
        onPress={() => deleteExercise(item.id, item.name)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteBtn}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({ section: { title, data } }) => {
    const parentCat = MUSCLE_TO_CATEGORY[title];
    const showParent = parentCat && parentCat !== title;
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {showParent && (
            <Text style={styles.sectionParent}>{parentCat}</Text>
          )}
        </View>
        <Text style={styles.sectionCount}>{data.length}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exercises</Text>
        <TouchableOpacity style={styles.addButton} onPress={openModal}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises…"
          placeholderTextColor="#4b5563"
          value={searchText}
          onChangeText={setSearchText}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterStrip}
      >
        {['All', ...CATEGORIES].map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#6366f1" style={styles.loader} />
      ) : (
        <SectionList
          sections={filteredSections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={[
            styles.list,
            filteredSections.length === 0 && styles.emptyList,
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
              <Text style={styles.emptyText}>
                {searchText || activeCategory !== 'All' ? 'No matches found.' : 'No exercises yet.'}
              </Text>
              {!searchText && activeCategory === 'All' && (
                <Text style={styles.emptySubtext}>Tap "+ Add" to create your first exercise.</Text>
              )}
            </View>
          }
          stickySectionHeadersEnabled={false}
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
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>New Exercise</Text>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Bench Press"
                placeholderTextColor="#6b7280"
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, selectedCategory === cat && styles.chipSelected]}
                    onPress={() => handleCategorySelect(cat)}
                  >
                    <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedCategory !== '' && MUSCLE_HIERARCHY[selectedCategory].length > 1 && (
                <>
                  <Text style={styles.inputLabel}>Muscle</Text>
                  <View style={styles.chipRow}>
                    {MUSCLE_HIERARCHY[selectedCategory].map(muscle => (
                      <TouchableOpacity
                        key={muscle}
                        style={[styles.chip, styles.chipSmall, newMuscle === muscle && styles.chipSelected]}
                        onPress={() => setNewMuscle(newMuscle === muscle ? '' : muscle)}
                      >
                        <Text style={[styles.chipText, styles.chipTextSmall, newMuscle === muscle && styles.chipTextSelected]}>
                          {muscle}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>Laterality</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segment, !isUnilateral && styles.segmentActive]}
                  onPress={() => setIsUnilateral(false)}
                >
                  <Text style={[styles.segmentText, !isUnilateral && styles.segmentTextActive]}>
                    Bilateral
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segment, isUnilateral && styles.segmentActive]}
                  onPress={() => setIsUnilateral(true)}
                >
                  <Text style={[styles.segmentText, isUnilateral && styles.segmentTextActive]}>
                    Unilateral
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Notes <Text style={styles.inputLabelOptional}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="e.g. Keep elbows tucked, go to failure on last set"
                placeholderTextColor="#6b7280"
                value={newNotes}
                onChangeText={setNewNotes}
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
                  onPress={saveExercise}
                  disabled={!newName.trim() || saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: '#f9fafb',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterStrip: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionParent: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: '#1f2937',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionCount: {
    fontSize: 12,
    color: '#4b5563',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
  },
  rowMain: {
    flex: 1,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowText: {
    fontSize: 16,
    color: '#f9fafb',
    flexShrink: 1,
  },
  rowNotes: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
  uniBadge: {
    backgroundColor: '#312e81',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  uniBadgeText: {
    fontSize: 10,
    color: '#818cf8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  deleteBtn: {
    fontSize: 14,
    color: '#6b7280',
    paddingLeft: 12,
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
    maxHeight: '90%',
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 20,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#4f46e5',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  chipSmall: {
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  chipText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  chipTextSmall: {
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
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
