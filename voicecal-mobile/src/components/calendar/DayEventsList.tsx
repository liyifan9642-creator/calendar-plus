import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '../../models/CalendarEvent';
import EventListItem from './EventListItem';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme';

interface DayEventsListProps {
  events: CalendarEvent[];
  date: string;
  onEventPress: (event: CalendarEvent) => void;
  onDeleteEvent?: (event: CalendarEvent) => void;
  onAddEvent: () => void;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = weekdays[d.getDay()];
  return `${year}年${month}月${day}日 ${weekday}`;
}

export default function DayEventsList({
  events,
  date,
  onEventPress,
  onDeleteEvent,
  onAddEvent,
}: DayEventsListProps) {
  const displayDate = formatDisplayDate(date);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.dateText}>{displayDate}</Text>
        <View style={styles.countRow}>
          <View style={styles.countDot} />
          <Text style={styles.countText}>
            {events.length > 0 ? `${events.length} 项事件` : '暂无事件'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAddEvent}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={20} color={Colors.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="calendar-outline" size={40} color={Colors.primaryLight} />
      </View>
      <Text style={styles.emptyText}>暂无事件</Text>
      <Text style={styles.emptySubtext}>点击下方按钮添加新事件</Text>
      <TouchableOpacity style={styles.emptyAddButton} onPress={onAddEvent} activeOpacity={0.7}>
        <Ionicons name="add-circle-outline" size={18} color={Colors.textOnPrimary} />
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
          <EventListItem event={item} onPress={onEventPress} onDelete={onDeleteEvent} />
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerLeft: {
    flex: 1,
  },
  dateText: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  countDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: Spacing.sm,
  },
  countText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.colored(Colors.primary, 0.3),
  },
  list: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
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
    marginBottom: Spacing.xl,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    ...Shadows.colored(Colors.primary, 0.25),
  },
  emptyAddButtonText: {
    ...Typography.bodyMedium,
    color: Colors.textOnPrimary,
    marginLeft: Spacing.xs,
  },
});
