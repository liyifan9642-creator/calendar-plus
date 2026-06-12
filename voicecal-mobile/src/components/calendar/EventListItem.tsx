import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '../../models/CalendarEvent';
import { EventStatus } from '../../models/enums';
import { parseIsoDateTime } from '../../utils/dateUtils';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme';

interface EventListItemProps {
  event: CalendarEvent;
  onPress: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

function getStatusColor(status: EventStatus): string {
  switch (status) {
    case EventStatus.ACTIVE:
      return Colors.primary;
    case EventStatus.COMPLETED:
      return Colors.success;
    case EventStatus.CANCELLED:
      return Colors.textTertiary;
    default:
      return Colors.primary;
  }
}

function getStatusLabel(status: EventStatus): string {
  switch (status) {
    case EventStatus.COMPLETED:
      return '已完成';
    case EventStatus.CANCELLED:
      return '已取消';
    default:
      return '';
  }
}

export default function EventListItem({ event, onPress, onDelete }: EventListItemProps) {
  const { time: startTime } = parseIsoDateTime(event.startTime);
  const { time: endTime } = parseIsoDateTime(event.endTime);
  const statusColor = getStatusColor(event.status);
  const statusLabel = getStatusLabel(event.status);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(event)}
      onLongPress={() => onDelete?.(event)}
      activeOpacity={0.7}
    >
      {/* Left accent bar */}
      <View style={[styles.colorBar, { backgroundColor: statusColor }]} />

      {/* Time column */}
      <View style={styles.timeColumn}>
        <Text style={styles.startTime}>{startTime}</Text>
        <View style={styles.timeDivider} />
        <Text style={styles.endTime}>{endTime}</Text>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          {statusLabel ? (
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          ) : null}
        </View>

        {event.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.location} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        ) : null}

        {event.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {event.description}
          </Text>
        ) : null}
      </View>

      {/* Delete button */}
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(event)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.6}
        >
          <View style={styles.deleteIconBg}>
            <Ionicons name="trash-outline" size={15} color={Colors.error} />
          </View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs + 2,
    ...Shadows.medium,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  timeColumn: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minWidth: 52,
  },
  startTime: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
  timeDivider: {
    width: 1,
    height: 8,
    backgroundColor: Colors.border,
    marginVertical: 3,
  },
  endTime: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textTertiary,
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginLeft: Spacing.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 4,
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 3,
  },
  deleteButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  deleteIconBg: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    backgroundColor: Colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
