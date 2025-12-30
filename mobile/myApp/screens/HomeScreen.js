import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Calculate responsive sizes based on screen height
const isSmallDevice = height < 700;
const isMediumDevice = height >= 700 && height < 850;

// Dynamic spacing
const HERO_PADDING = isSmallDevice ? 16 : 24;
const CALENDAR_MARGIN = isSmallDevice ? 12 : 16;
const CALENDAR_PADDING = isSmallDevice ? 10 : 12;
const DAY_CELL_HEIGHT_RATIO = isSmallDevice ? 0.75 : 0.85;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // In a real app, this would be stored in a database or AsyncStorage
  const [workoutData, setWorkoutData] = useState({
    todaysSplit: 'Push Day',
    currentStreak: 9,
    weeklyCompletion: 67,
    // Store dates as ISO strings for easier comparison
    completedDays: {},  // { '2024-12-01': true, '2024-12-03': true }
    missedDays: {},
    restDays: {},
  });

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Go to current month
  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Handle day press
  const handleDayPress = (day) => {
    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDay({ day, dateKey });
    setModalVisible(true);
  };

  // Mark day with status
  const markDay = (status) => {
    if (!selectedDay) return;

    const { dateKey } = selectedDay;
    
    setWorkoutData(prev => {
      const newData = { ...prev };
      
      // Remove from all categories first
      delete newData.completedDays[dateKey];
      delete newData.missedDays[dateKey];
      delete newData.restDays[dateKey];
      
      // Add to selected category
      if (status === 'completed') {
        newData.completedDays[dateKey] = true;
      } else if (status === 'missed') {
        newData.missedDays[dateKey] = true;
      } else if (status === 'rest') {
        newData.restDays[dateKey] = true;
      }
      
      return newData;
    });
    
    setModalVisible(false);
    setSelectedDay(null);
  };

  // Clear day status
  const clearDay = () => {
    if (!selectedDay) return;

    const { dateKey } = selectedDay;
    
    setWorkoutData(prev => {
      const newData = { ...prev };
      delete newData.completedDays[dateKey];
      delete newData.missedDays[dateKey];
      delete newData.restDays[dateKey];
      return newData;
    });
    
    setModalVisible(false);
    setSelectedDay(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* extends past notch */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={[styles.heroSection, { paddingTop: insets.top + (isSmallDevice ? 12 : 20) }]}
      >
        <Text style={styles.greeting}>Today's Workout</Text>
        <Text style={styles.splitName}>{workoutData.todaysSplit}</Text>
        <Text style={styles.subtitle}>GRIP THE MOTHAFUCKA! - King</Text>
        
        {/* Quick Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>🔥 {workoutData.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{workoutData.weeklyCompletion}%</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.sectionTitle}>Consistency Calendar</Text>
            <View style={styles.monthNavigation}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                <Text style={styles.navButtonText}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToToday}>
                <Text style={styles.monthText}>
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                <Text style={styles.navButtonText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>

          <CalendarGrid
            currentMonth={currentMonth}
            completedDays={workoutData.completedDays}
            missedDays={workoutData.missedDays}
            restDays={workoutData.restDays}
            onDayPress={handleDayPress}
          />

          {/* Calendar Legend */}
          <View style={styles.legend}>
            <LegendItem color="#10b981" label="Completed" />
            <LegendItem color="#ef4444" label="Missed" />
            <LegendItem color="#f59e0b" label="Rest Day" />
            <LegendItem color="#4b5563" label="Upcoming" />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start Today's Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Switch to Different Day</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Day Status Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedDay && `${currentMonth.toLocaleString('default', { month: 'long' })} ${selectedDay.day}`}
            </Text>
            <Text style={styles.modalSubtitle}>Mark this day as:</Text>
            
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#10b981' }]}
              onPress={() => markDay('completed')}
            >
              <Text style={styles.modalButtonText}>✓ Completed</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#ef4444' }]}
              onPress={() => markDay('missed')}
            >
              <Text style={styles.modalButtonText}>✗ Missed</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#f59e0b' }]}
              onPress={() => markDay('rest')}
            >
              <Text style={styles.modalButtonText}>☾ Rest Day</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#6b7280' }]}
              onPress={clearDay}
            >
              <Text style={styles.modalButtonText}>Clear Status</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CalendarGrid({ currentMonth, completedDays, missedDays, restDays, onDayPress }) {
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const today = new Date();
  const isCurrentMonth =
    currentMonth.getMonth() === today.getMonth() &&
    currentMonth.getFullYear() === today.getFullYear();

  const getDayStatus = (day) => {
    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (completedDays[dateKey]) return 'completed';
    if (missedDays[dateKey]) return 'missed';
    if (restDays[dateKey]) return 'rest';
    
    // Check if day is in the future
    const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (dayDate > today) return 'upcoming';
    
    return 'default';
  };

  const getDayColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'missed': return '#ef4444';
      case 'rest': return '#f59e0b';
      case 'upcoming': return '#4b5563';
      default: return '#374151';
    }
  };

  const renderDays = () => {
    const days = [];
    const totalSlots = 35; // 5 weeks of 7 days

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDayStatus(day);
      const isToday = isCurrentMonth && day === today.getDate();

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            { backgroundColor: getDayColor(status) },
            isToday && styles.todayBorder,
          ]}
          onPress={() => onDayPress(day)}
        >
          <Text style={styles.dayText}>{day}</Text>
        </TouchableOpacity>
      );
    }

    // Fill remaining cells to keep grid aligned
    const totalFilled = firstDayOfMonth + daysInMonth;
    const remaining = totalSlots - totalFilled;
    for (let i = 0; i < remaining; i++) {
      days.push(<View key={`empty-end-${i}`} style={styles.dayCell} />);
    }

    return days;
  };

  return (
    <View style={styles.calendarGrid}>
      {/* Day headers */}
      <View style={styles.dayHeaderRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <View key={index} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar days */}
      <View style={styles.daysContainer}>{renderDays()}</View>
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
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  heroSection: {
    padding: HERO_PADDING,
    paddingBottom: isSmallDevice ? 16 : 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greeting: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#e0e7ff',
    fontWeight: '500',
  },
  splitName: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  subtitle: {
    fontSize: isSmallDevice ? 16 : 18,
    color: '#e0e7ff',
    marginTop: 4,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: isSmallDevice ? 12 : 16,
    marginTop: isSmallDevice ? 16 : 20,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#e0e7ff',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: isSmallDevice ? 32 : 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  calendarSection: {
    padding: CALENDAR_PADDING,
    backgroundColor: '#1f2937',
    margin: CALENDAR_MARGIN,
    marginTop: isSmallDevice ? 8 : 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarHeader: {
    marginBottom: isSmallDevice ? 6 : 8,
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 20,
    color: '#818cf8',
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#818cf8',
    fontWeight: '500',
  },
  calendarGrid: {
    marginTop: isSmallDevice ? 2 : 4,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: isSmallDevice ? 2 : 4,
  },
  dayHeaderCell: {
    width: (width - (CALENDAR_MARGIN * 2) - (CALENDAR_PADDING * 2)) / 7,
    alignItems: 'center',
    paddingVertical: isSmallDevice ? 1 : 2,
  },
  dayHeaderText: {
    fontSize: isSmallDevice ? 10 : 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: (width - (CALENDAR_MARGIN * 2) - (CALENDAR_PADDING * 2)) / 7,
    height: ((width - (CALENDAR_MARGIN * 2) - (CALENDAR_PADDING * 2)) / 7) * DAY_CELL_HEIGHT_RATIO,
    marginBottom: isSmallDevice ? 2 : 3,
    borderRadius: isSmallDevice ? 6 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: '#818cf8',
  },
  dayText: {
    fontSize: isSmallDevice ? 11 : 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: isSmallDevice ? 6 : 8,
    gap: isSmallDevice ? 8 : 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: isSmallDevice ? 9 : 10,
    height: isSmallDevice ? 9 : 10,
    borderRadius: isSmallDevice ? 4.5 : 5,
    marginRight: isSmallDevice ? 3 : 4,
  },
  legendText: {
    fontSize: isSmallDevice ? 10 : 11,
    color: '#9ca3af',
  },
  actionsSection: {
    padding: CALENDAR_MARGIN,
    marginTop: isSmallDevice ? 4 : 8,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    padding: isSmallDevice ? 14 : 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#374151',
    padding: isSmallDevice ? 14 : 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  modalCancelText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
});