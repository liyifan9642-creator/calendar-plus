import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '../../models/CalendarEvent';
import { EventStatus } from '../../models/enums';
import { parseIsoDateTime } from '../../utils/dateUtils';

const PRIMARY = '#2196F3';

interface EventListItemProps {
  event: CalendarEvent;
  onPress: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

function getStatusColor(status: EventStatus): string {
  switch (status) {
    case EventStatus.ACTIVE:
      return PRIMARY;
    case EventStatus.COMPLETED:
      return '#4CAF50';
    case EventStatus.CANCELLED:
      return '#9E9E9E';
    default:
      return PRIMARY;
  }
}

export default function EventListItem({ event, onPress, onDelete }: EventListItemProps) {
  const { time: startTime } = parseIsoDateTime(event.startTime);
  const { time: endTime } = parseIsoDateTime(event.endTime);
  const statusColor = getStatusColor(event.status);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(event)}
      onLongPress={() => onDelete?.(event)}
      activeOpacity={0.7}
    >
      <View style={[styles.colorBar, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.timeRange}>
          {startTime} - {endTime}
        </Text>
        {event.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#757575" />
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
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(event)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color="#F44336" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  timeRange: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  location: {
    fontSize: 13,
    color: '#757575',
    marginLeft: 4,
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 2,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
