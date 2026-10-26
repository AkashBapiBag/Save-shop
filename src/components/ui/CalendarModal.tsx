import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Shadows } from '@/theme/designSystem';

interface CalendarModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
  minDate?: string; // YYYY-MM-DD (defaults to today)
  title?: string;
  embedded?: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  minDate,
  title = 'Select Expiration Date',
  embedded = false,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const effectiveMinDate = minDate || todayStr;

  // Initialize view year & month from selectedDate or today
  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return parseInt(selectedDate.split('-')[0], 10);
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return parseInt(selectedDate.split('-')[1], 10) - 1;
    }
    return new Date().getMonth();
  });

  // Sync view when selectedDate changes during render
  const [prevDate, setPrevDate] = useState(selectedDate);
  if (selectedDate !== prevDate) {
    setPrevDate(selectedDate);
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const parts = selectedDate.split('-');
      setViewYear(parseInt(parts[0], 10));
      setViewMonth(parseInt(parts[1], 10) - 1);
    }
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleNextYear = () => {
    setViewYear((y) => y + 1);
  };

  // Generate days grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const calendarGrid = useMemo(() => {
    const days: {
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isSelected: boolean;
      isToday: boolean;
    }[] = [];

    // Empty padding slots for days before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dayNum: 0,
        dateStr: '',
        isCurrentMonth: false,
        isDisabled: true,
        isSelected: false,
        isToday: false,
      });
    }

    // Actual days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const monthPadded = String(viewMonth + 1).padStart(2, '0');
      const dayPadded = String(d).padStart(2, '0');
      const dateStr = `${viewYear}-${monthPadded}-${dayPadded}`;
      const isDisabled = Boolean(effectiveMinDate && dateStr < effectiveMinDate);
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === todayStr;

      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        isDisabled,
        isSelected,
        isToday,
      });
    }

    // Trailing padding slots to complete the last week (prevents flexbox justification stretching)
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let i = 0; i < remainingSlots; i++) {
      days.push({
        dayNum: 0,
        dateStr: '',
        isCurrentMonth: false,
        isDisabled: true,
        isSelected: false,
        isToday: false,
      });
    }

    return days;
  }, [viewYear, viewMonth, daysInMonth, firstDayIndex, effectiveMinDate, selectedDate, todayStr]);

  const handleDayPress = (dateStr: string) => {
    onSelectDate(dateStr);
    onClose();
  };

  if (!visible) return null;

  const innerContent = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Tap a date to set FEFO expiration</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={Palette.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Month / Year Navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          style={styles.navArrowBtn}
          onPress={handlePrevMonth}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={Palette.navyPrimary} />
        </TouchableOpacity>

        <View style={styles.monthYearDisplay}>
          <Text style={styles.monthYearText}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={handleNextMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={20} color={Palette.navyPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.yearJumpBtn}
            onPress={handleNextYear}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.yearJumpText}>+1 Yr</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Row */}
      <View style={styles.weekdayRow}>
        {DAY_LABELS.map((label, idx) => (
          <View key={idx} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {calendarGrid.map((item, idx) => {
          if (!item.isCurrentMonth) {
            return <View key={idx} style={styles.dayCell} />;
          }

          return (
            <View key={idx} style={styles.dayCell}>
              <TouchableOpacity
                style={[
                  styles.dayCircle,
                  item.isSelected && styles.dayCellSelected,
                  item.isToday && !item.isSelected && styles.dayCellToday,
                ]}
                disabled={item.isDisabled}
                onPress={() => handleDayPress(item.dateStr)}
              >
                <Text
                  style={[
                    styles.dayText,
                    item.isDisabled && styles.dayTextDisabled,
                    item.isToday && styles.dayTextToday,
                    item.isSelected && styles.dayTextSelected,
                  ]}
                >
                  {item.dayNum}
                </Text>
                {item.isToday && !item.isSelected && <View style={styles.todayDot} />}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Selected Date Footer */}
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={16} color={Palette.bluePrimary} />
          <Text style={styles.footerSelectedText}>
            Selected: <Text style={{ fontWeight: '800', color: Palette.navyPrimary }}>{selectedDate || 'None'}</Text>
          </Text>
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (embedded) {
    return (
      <View style={styles.embeddedOverlay}>
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.embeddedCard}>
          {innerContent}
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.card}>
          {innerContent}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  embeddedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 24,
    zIndex: 100,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  embeddedCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...Shadows.lg,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  navArrowBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.borderLight,
  },
  monthYearDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.navyPrimary,
  },
  yearJumpBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Palette.blueSoft,
  },
  yearJumpText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bluePrimary,
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  weekdayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textMuted,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: Palette.bluePrimary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: Palette.bluePrimary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  dayTextDisabled: {
    color: '#CBD5E1',
  },
  dayTextToday: {
    color: Palette.bluePrimary,
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.bluePrimary,
    position: 'absolute',
    bottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.surfaceMuted,
  },
  footerSelectedText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginLeft: 6,
  },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Palette.navyPrimary,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
