import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '../../models/CalendarEvent';
import EventListItem from './EventListItem';
import { formatDate } from '../../utils/dateUtils';

const PRIMARY = '#2196F3';

interface DayEventsListProps {
  events: CalendarEvent[];
  date: string;
  onEventPress: (event: CalendarEvent) => void;
  onAddEvent: () => void;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = weekdays[d.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

export default function DayEventsList({
  events,
  date,
  onEventPress,
  onAddEvent,
}: DayEventsListProps) {
  const displayDate = formatDisplayDate(date);

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.dateText}>{displayDate}</Text>
        <Text style={styles.countText}>
          {events.length > 0 ? `${events.length} 个事件` : '没有事件'}
        </Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={onAddEvent}>
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={48} color="#BDBDBD" />
      <Text style={styles.emptyText}>没有事件</Text>
      <TouchableOpacity style={styles.emptyAddButton} onPress={onAddEvent}>
        <Text style={styles.emptyAddButtonText}>添加事件</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventListItem event={item} onPress={onEventPress} />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          events.length === 0 ? styles.emptyList : styles.list
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  countText: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9E9E9E',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyAddButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: PRIMARY,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
