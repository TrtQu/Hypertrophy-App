import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';

const { width } = Dimensions.get('window');

const CAL_H_PAD = 16; // calendar card horizontal padding
const CELL_SIZE = Math.floor((width - 32 - CAL_H_PAD * 2) / 7); // 32 = scrollview padding

const QUOTES = [
  "Show up. That's the hard part.",
  "Consistency beats intensity.",
  "Do the work.",
  "Make it count.",
  "Stay the course.",
  "One session at a time.",
  "Earn it.",
  "Progress is built, not given.",
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [workoutData, setWorkoutData] = useState({
    todaysSplit: '—',
    currentStreak: 0,
    weeklyCompletion: 0,
    completedDays: {},
    missedDays: {},
    restDays: {},
  });

  // Pick a quote that changes daily
  const todayQuote = useMemo(() => {
    return QUOTES[new Date().getDate() % QUOTES.length];
  }, []);

  const today = new Date();
  const todayLabel = `${DAY_NAMES[today.getDay()]}, ${MONTH_NAMES[today.getMonth()]} ${today.getDate()}`;

  useEffect(() => {
    api(`/stats`)
      .then(res => res.json())
      .then(data => {
        setWorkoutData(prev => ({
          ...prev,
          todaysSplit:      data.todays_split ? data.todays_split.day_name : 'Rest Day',
          currentStreak:    data.streak,
          weeklyCompletion: data.workouts_this_week,
        }));
      })
      .catch(() => {});
  }, []);

  const goToPreviousMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const handleDayPress = (day) => {
    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDay({ day, dateKey });
    setModalVisible(true);
  };

  const markDay = (status) => {
    if (!selectedDay) return;
    const { dateKey } = selectedDay;
    setWorkoutData(prev => {
      const d = { ...prev };
      delete d.completedDays[dateKey];
      delete d.missedDays[dateKey];
      delete d.restDays[dateKey];
      if (status === 'completed') d.completedDays[dateKey] = true;
      else if (status === 'missed') d.missedDays[dateKey] = true;
      else if (status === 'rest')   d.restDays[dateKey]   = true;
      return d;
    });
    setModalVisible(false);
    setSelectedDay(null);
  };

  const clearDay = () => {
    if (!selectedDay) return;
    const { dateKey } = selectedDay;
    setWorkoutData(prev => {
      const d = { ...prev };
      delete d.completedDays[dateKey];
      delete d.missedDays[dateKey];
      delete d.restDays[dateKey];
      return d;
    });
    setModalVisible(false);
    setSelectedDay(null);
  };

  const selectedDateLabel = selectedDay
    ? `${MONTH_NAMES[currentMonth.getMonth()]} ${selectedDay.day}`
    : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today</Text>
        <Text style={styles.headerDate}>{todayLabel}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Split Card */}
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.splitCard}>
          <Text style={styles.splitEyebrow}>Today's Workout</Text>
          <Text style={styles.splitName}>{workoutData.todaysSplit}</Text>
          <Text style={styles.splitQuote}>{todayQuote}</Text>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>🔥 {workoutData.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{workoutData.weeklyCompletion}%</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Consistency Calendar</Text>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.navBtn}>
                <Text style={styles.navBtnText}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToToday}>
                <Text style={styles.monthText}>
                  {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
                <Text style={styles.navBtnText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <CalendarGrid
              currentMonth={currentMonth}
              completedDays={workoutData.completedDays}
              missedDays={workoutData.missedDays}
              restDays={workoutData.restDays}
              onDayPress={handleDayPress}
            />
            <View style={styles.legend}>
              <LegendItem color="#10b981" label="Completed" />
              <LegendItem color="#ef4444" label="Missed" />
              <LegendItem color="#f59e0b" label="Rest Day" />
              <LegendItem color="#4b5563" label="Upcoming" />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start Today's Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Switch to Different Day</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Day Status Modal — bottom sheet */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{selectedDateLabel}</Text>
            <Text style={styles.modalSubtitle}>Mark this day as:</Text>

            <TouchableOpacity
              style={[styles.modalOption, { backgroundColor: '#10b981' }]}
              onPress={() => markDay('completed')}
            >
              <Text style={styles.modalOptionText}>✓  Completed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, { backgroundColor: '#ef4444' }]}
              onPress={() => markDay('missed')}
            >
              <Text style={styles.modalOptionText}>✗  Missed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, { backgroundColor: '#f59e0b' }]}
              onPress={() => markDay('rest')}
            >
              <Text style={styles.modalOptionText}>☾  Rest Day</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, { backgroundColor: '#374151' }]}
              onPress={clearDay}
            >
              <Text style={styles.modalOptionText}>Clear Status</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CalendarGrid({ currentMonth, completedDays, missedDays, restDays, onDayPress }) {
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const today = new Date();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const getDayStatus = (day) => {
    const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    if (completedDays[key]) return 'completed';
    if (missedDays[key])    return 'missed';
    if (restDays[key])      return 'rest';
    if (new Date(year, month, day) > today) return 'upcoming';
    return 'default';
  };

  const STATUS_COLOR = {
    completed: '#10b981',
    missed:    '#ef4444',
    rest:      '#f59e0b',
    upcoming:  '#4b5563',
    default:   '#374151',
  };

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(<View key={`e${i}`} style={styles.dayCell} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const status  = getDayStatus(day);
    const isToday = isCurrentMonth && day === today.getDate();
    cells.push(
      <TouchableOpacity
        key={day}
        style={[styles.dayCell, { backgroundColor: STATUS_COLOR[status] }, isToday && styles.todayRing]}
        onPress={() => onDayPress(day)}
      >
        <Text style={styles.dayText}>{day}</Text>
      </TouchableOpacity>
    );
  }
  const remaining = 35 - (firstDayOfMonth + daysInMonth);
  for (let i = 0; i < remaining; i++) {
    cells.push(<View key={`ee${i}`} style={styles.dayCell} />);
  }

  return (
    <View style={styles.calendarGrid}>
      <View style={styles.dayHeaderRow}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <View key={i} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={styles.daysContainer}>{cells}</View>
    </View>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

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
  headerDate:  { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  // Split card
  splitCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  splitEyebrow: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 6 },
  splitName:    { fontSize: 34, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  splitQuote:   { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#f9fafb', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#818cf8',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn:   { padding: 4 },
  navBtnText: { fontSize: 18, color: '#818cf8', fontWeight: 'bold' },
  monthText:  { fontSize: 13, color: '#818cf8', fontWeight: '600' },

  card: {
    backgroundColor: '#1f2937',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: CAL_H_PAD,
    paddingVertical: 12,
  },

  // Calendar grid
  calendarGrid: { marginBottom: 8 },
  dayHeaderRow:  { flexDirection: 'row', marginBottom: 4 },
  dayHeaderCell: { width: CELL_SIZE, alignItems: 'center', paddingVertical: 2 },
  dayHeaderText: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE * 0.82,
    marginBottom: 3,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  todayRing: { borderWidth: 2, borderColor: '#818cf8' },
  dayText:   { fontSize: 12, fontWeight: '500', color: '#ffffff' },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot:  { width: 9, height: 9, borderRadius: 4.5, marginRight: 5 },
  legendText: { fontSize: 11, color: '#9ca3af' },

  // Actions
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText:  { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#1f2937',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: { color: '#e5e7eb', fontSize: 16, fontWeight: '600' },

  // Modal — bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle:    { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  modalOption: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalOptionText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
});
