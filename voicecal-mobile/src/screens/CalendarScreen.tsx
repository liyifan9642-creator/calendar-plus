import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../stores';
import { CalendarEvent } from '../models';
import EventListItem from '../components/calendar/EventListItem';
import dayjs from 'dayjs';
import {
  Colors,
  Gradients,
  Spacing,
  Radius,
  Typography,
  Shadows,
} from '../theme';

/**
 * Format a date string into Chinese display format.
 * e.g. "2026-06-03" => "2026年6月3日"
 */
function formatDateCN(dateStr: string): string {
  const d = dayjs(dateStr);
  return `${d.year()}年${d.month() + 1}月${d.date()}日`;
}

export const CalendarScreen = ({ navigation }: any) => {
  const {
    events,
    selectedDate,
    isLoading,
    error,
    loadEvents,
    setSelectedDate,
    deleteEvent,
    clearError,
  } = useCalendarStore();

  // Load events for the current month on mount
  useEffect(() => {
    const now = dayjs();
    const start = now.startOf('month').format('YYYY-MM-DD');
    const end = now.endOf('month').add(1, 'day').format('YYYY-MM-DD');
    loadEvents(start, end);
  }, [loadEvents]);

  // Load events when month changes
  const onMonthChange = useCallback(
    (month: DateData) => {
      const start = dayjs(month.dateString).startOf('month').format('YYYY-MM-DD');
      const end = dayjs(month.dateString).endOf('month').add(1, 'day').format('YYYY-MM-DD');
      loadEvents(start, end);
    },
    [loadEvents]
  );

  // Handle date selection
  const onDayPress = useCallback(
    (day: DateData) => {
      setSelectedDate(day.dateString);
    },
    [setSelectedDate]
  );

  // Build markedDates with dots for days that have events
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    const today = dayjs().format('YYYY-MM-DD');

    // Mark dates with event dots
    events.forEach((event) => {
      const date = dayjs(event.startTime).format('YYYY-MM-DD');
      if (!marks[date]) {
        marks[date] = { dots: [] };
      }
      marks[date].dots.push({ key: event.id, color: Colors.primary });
    });

    // Mark the selected date with custom styling
    if (marks[selectedDate]) {
      marks[selectedDate].selected = true;
      marks[selectedDate].selectedColor = Colors.primary;
      marks[selectedDate].selectedTextColor = Colors.textOnPrimary;
    } else {
      marks[selectedDate] = {
        selected: true,
        selectedColor: Colors.primary,
        selectedTextColor: Colors.textOnPrimary,
        dots: [],
      };
    }

    // Ensure today is also styled if it's not the selected date
    if (today !== selectedDate && !marks[today]?.selected) {
      if (marks[today]) {
        marks[today].customStyles = {
          container: {
            borderWidth: 1.5,
            borderColor: Colors.primaryLight,
            borderRadius: Radius.full,
          },
        };
      }
    }

    return marks;
  }, [events, selectedDate]);

  // Filter events for the selected date
  const selectedDateEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventDate = dayjs(event.startTime).format('YYYY-MM-DD');
        return eventDate === selectedDate;
      })
      .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());
  }, [events, selectedDate]);

  // Handle event deletion
  const handleDeleteEvent = useCallback(
    (event: CalendarEvent) => {
      Alert.alert(
        '删除事件',
        `确定要删除「${event.title}」吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => {
              deleteEvent(event.id).catch((err) => {
                Alert.alert('删除失败', err?.message ?? '未知错误');
              });
            },
          },
        ]
      );
    },
    [deleteEvent]
  );

  // Navigate to event detail
  const handleEventPress = useCallback(
    (event: CalendarEvent) => {
      navigation.navigate('EventDetail', { eventId: event.id });
    },
    [navigation]
  );

  // Navigate to create event
  const handleAddEvent = useCallback(() => {
    navigation.navigate('EventDetail', { date: selectedDate });
  }, [navigation, selectedDate]);

  // Show error alert when error changes
  useEffect(() => {
    if (error) {
      Alert.alert('错误', error, [{ text: '确定', onPress: clearError }]);
    }
  }, [error, clearError]);

  // Custom arrow renderer for month navigation
  const renderArrow = useCallback(
    (direction: 'left' | 'right') => (
      <View style={styles.arrowButton}>
        <Ionicons
          name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
          size={20}
          color={Colors.primary}
        />
      </View>
    ),
    []
  );

  // Render a single event item using the EventListItem component
  const renderEventItem = useCallback(
    ({ item }: { item: CalendarEvent }) => (
      <EventListItem
        event={item}
        onPress={handleEventPress}
        onDelete={handleDeleteEvent}
      />
    ),
    [handleEventPress, handleDeleteEvent]
  );

  // Empty state for event list
  const renderEmptyList = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="calendar-outline" size={36} color={Colors.primaryLight} />
        </View>
        <Text style={styles.emptyText}>
          {dayjs(selectedDate).format('M月D日')}暂无事件
        </Text>
        <Text style={styles.emptySubtext}>点击下方按钮添加新事件</Text>
      </View>
    ),
    [selectedDate]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: CalendarEvent) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={Gradients.header as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>VoiceCal 日历</Text>
        <TouchableOpacity style={styles.settingsButton} activeOpacity={0.6}>
          <View style={styles.settingsIconBg}>
            <Ionicons name="settings-outline" size={20} color={Colors.primaryDark} />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Calendar */}
      <View style={styles.calendarWrapper}>
        <Calendar
          current={selectedDate}
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          markingType="multi-dot"
          markedDates={markedDates}
          renderArrow={renderArrow}
          enableSwipeMonths
          theme={{
            // Day styling
            textDayFontSize: 15,
            textDayFontWeight: '400',
            textDayStyle: {
              includeFontPadding: false,
            },
            // Today
            todayTextColor: Colors.primary,
            todayBackgroundColor: 'transparent',
            // Selected day
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: Colors.textOnPrimary,
            // Month header
            textMonthFontSize: 17,
            textMonthFontWeight: '700',
            monthTextColor: Colors.textPrimary,
            // Day header (Mon, Tue, ...)
            textDayHeaderFontSize: 12,
            textDayHeaderFontWeight: '600',
            textSectionTitleColor: Colors.textSecondary,
            // Arrows
            arrowColor: Colors.primary,
            arrowStyle: {
              padding: 8,
            },
            // General
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            // Disabled dates (outside current month)
            textDisabledColor: Colors.textTertiary + '60',
            // Dots
            dotStyle: {
              width: 5,
              height: 5,
              borderRadius: 2.5,
            },
          }}
        />
      </View>

      {/* Selected date header */}
      <View style={styles.dateHeader}>
        <View style={styles.dateHeaderLeft}>
          <Text style={styles.dateHeaderText}>
            {formatDateCN(selectedDate)}的事件
          </Text>
          <View style={styles.eventCountBadge}>
            <Text style={styles.eventCountText}>
              {selectedDateEvents.length}项
            </Text>
          </View>
        </View>
      </View>

      {/* Event list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={selectedDateEvents}
          renderItem={renderEventItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={
            selectedDateEvents.length === 0
              ? styles.emptyListContainer
              : styles.eventList
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button - Material 3 style */}
      <TouchableOpacity
        style={styles.fabContainer}
        onPress={handleAddEvent}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={Gradients.fab as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="add" size={26} color={Colors.textOnPrimary} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  settingsIconBg: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },

  // Calendar
  calendarWrapper: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    ...Shadows.medium,
  },

  // Arrow buttons
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Date header
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateHeaderText: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  eventCountBadge: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: Spacing.sm,
  },
  eventCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Event list
  eventList: {
    paddingBottom: 100,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // FAB - Material 3 rounded-square style
  fabContainer: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl + 8,
    ...Shadows.colored(Colors.primary, 0.4),
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
