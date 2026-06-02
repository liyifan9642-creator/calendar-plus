import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../stores';
import { CalendarEvent } from '../models';
import dayjs from 'dayjs';

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

    // Mark dates with event dots
    events.forEach((event) => {
      const date = dayjs(event.startTime).format('YYYY-MM-DD');
      if (!marks[date]) {
        marks[date] = { dots: [] };
      }
      marks[date].dots.push({ key: event.id, color: '#2196F3' });
    });

    // Mark the selected date
    if (marks[selectedDate]) {
      marks[selectedDate].selected = true;
      marks[selectedDate].selectedColor = '#2196F3';
    } else {
      marks[selectedDate] = {
        selected: true,
        selectedColor: '#2196F3',
        dots: [],
      };
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

  // Render a single event item
  const renderEventItem = useCallback(
    ({ item }: { item: CalendarEvent }) => {
      const startTime = dayjs(item.startTime).format('HH:mm');
      const endTime = dayjs(item.endTime).format('HH:mm');

      return (
        <TouchableOpacity style={styles.eventItem} onPress={() => handleEventPress(item)}>
          <View style={styles.eventTimeContainer}>
            <Text style={styles.eventTime}>{startTime}</Text>
            <Text style={styles.eventTimeSeparator}>-</Text>
            <Text style={styles.eventTime}>{endTime}</Text>
          </View>
          <View style={styles.eventContent}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.location ? (
              <View style={styles.eventLocationRow}>
                <Ionicons name="location-outline" size={14} color="#888" />
                <Text style={styles.eventLocation} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteEvent(item)}>
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handleEventPress, handleDeleteEvent]
  );

  // Empty state for event list
  const renderEmptyList = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>
          {dayjs(selectedDate).format('M月D日')}没有事件
        </Text>
        <Text style={styles.emptySubtext}>点击右下角按钮添加新事件</Text>
      </View>
    ),
    [selectedDate]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: CalendarEvent) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Calendar */}
      <Calendar
        current={selectedDate}
        onDayPress={onDayPress}
        onMonthChange={onMonthChange}
        markingType="multi-dot"
        markedDates={markedDates}
        theme={{
          todayTextColor: '#2196F3',
          arrowColor: '#2196F3',
          monthTextColor: '#333',
          textMonthFontWeight: 'bold',
          textDayFontSize: 15,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 14,
        }}
        enableSwipeMonths
      />

      {/* Selected date header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateHeaderText}>
          {dayjs(selectedDate).format('YYYY年M月D日')} 的事件
        </Text>
        <Text style={styles.eventCount}>{selectedDateEvents.length} 项</Text>
      </View>

      {/* Event list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={selectedDateEvents}
          renderItem={renderEventItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={
            selectedDateEvents.length === 0 ? styles.emptyListContainer : styles.eventList
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddEvent} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  eventCount: {
    fontSize: 14,
    color: '#888',
  },
  eventList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTimeContainer: {
    alignItems: 'center',
    marginRight: 14,
    minWidth: 50,
  },
  eventTime: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
  },
  eventTimeSeparator: {
    fontSize: 11,
    color: '#aaa',
    marginVertical: 1,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontSize: 13,
    color: '#888',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 6,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});
