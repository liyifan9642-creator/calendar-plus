import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../stores';
import { CalendarEvent } from '../models';
import dayjs from 'dayjs';

interface EventDetailScreenProps {
  route: {
    params: {
      eventId?: string;
      date?: string;
    };
  };
  navigation: any;
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({ route, navigation }) => {
  const { eventId, date } = route.params;
  const { events, createEvent, updateEvent, deleteEvent, isLoading } = useCalendarStore();

  // Find existing event if editing
  const existingEvent = useMemo(
    () => (eventId ? events.find((e) => e.id === eventId) : undefined),
    [eventId, events]
  );

  const isEditing = !!existingEvent;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');

  // Initialize form with existing event data or defaults
  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title);
      setDescription(existingEvent.description || '');
      setEventDate(dayjs(existingEvent.startTime).format('YYYY-MM-DD'));
      setStartTime(dayjs(existingEvent.startTime).format('HH:mm'));
      setEndTime(dayjs(existingEvent.endTime).format('HH:mm'));
      setLocation(existingEvent.location || '');
    } else {
      // Defaults for new event
      const targetDate = date || dayjs().format('YYYY-MM-DD');
      setEventDate(targetDate);
      setStartTime(dayjs().hour(9).minute(0).format('HH:mm'));
      setEndTime(dayjs().hour(10).minute(0).format('HH:mm'));
    }
  }, [existingEvent, date]);

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      headerTitle: isEditing ? '编辑事件' : '新建事件',
    });
  }, [navigation, isEditing]);

  // Validate time format (HH:mm)
  const isValidTime = useCallback((t: string) => {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  }, []);

  // Validate date format (YYYY-MM-DD)
  const isValidDate = useCallback((d: string) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && dayjs(d).isValid();
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    // Validate
    if (!title.trim()) {
      Alert.alert('提示', '请输入事件标题');
      return;
    }
    if (!isValidDate(eventDate)) {
      Alert.alert('提示', '日期格式应为 YYYY-MM-DD');
      return;
    }
    if (!isValidTime(startTime)) {
      Alert.alert('提示', '开始时间格式应为 HH:mm');
      return;
    }
    if (!isValidTime(endTime)) {
      Alert.alert('提示', '结束时间格式应为 HH:mm');
      return;
    }

    const startIso = dayjs(`${eventDate} ${startTime}`).toISOString();
    const endIso = dayjs(`${eventDate} ${endTime}`).toISOString();

    if (dayjs(endIso).isBefore(dayjs(startIso))) {
      Alert.alert('提示', '结束时间不能早于开始时间');
      return;
    }

    try {
      if (isEditing && existingEvent) {
        await updateEvent(existingEvent.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startIso,
          endTime: endIso,
          location: location.trim() || undefined,
        });
        Alert.alert('成功', '事件已更新', [
          { text: '确定', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startIso,
          endTime: endIso,
          location: location.trim() || undefined,
          status: 'ACTIVE' as any,
        });
        Alert.alert('成功', '事件已创建', [
          { text: '确定', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('失败', error?.message ?? '操作失败，请重试');
    }
  }, [
    title,
    description,
    eventDate,
    startTime,
    endTime,
    location,
    isEditing,
    existingEvent,
    createEvent,
    updateEvent,
    navigation,
    isValidDate,
    isValidTime,
  ]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!existingEvent) return;

    Alert.alert(
      '删除事件',
      `确定要删除「${existingEvent.title}」吗？此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(existingEvent.id);
              Alert.alert('成功', '事件已删除', [
                { text: '确定', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              Alert.alert('失败', error?.message ?? '删除失败，请重试');
            }
          },
        },
      ]
    );
  }, [existingEvent, deleteEvent, navigation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Title */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>标题 *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="事件标题"
          placeholderTextColor="#bbb"
          maxLength={100}
        />
      </View>

      {/* Date */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>日期 *</Text>
        <TextInput
          style={styles.input}
          value={eventDate}
          onChangeText={setEventDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#bbb"
          autoCapitalize="none"
        />
      </View>

      {/* Time row */}
      <View style={styles.timeRow}>
        <View style={[styles.fieldContainer, styles.timeField]}>
          <Text style={styles.label}>开始时间 *</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:mm"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
          />
        </View>
        <View style={[styles.fieldContainer, styles.timeField]}>
          <Text style={styles.label}>结束时间 *</Text>
          <TextInput
            style={styles.input}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="HH:mm"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Location */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>地点</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="事件地点（可选）"
          placeholderTextColor="#bbb"
          maxLength={200}
        />
      </View>

      {/* Description */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>描述</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="事件描述（可选）"
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={1000}
        />
      </View>

      {/* Save button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>{isEditing ? '保存修改' : '创建事件'}</Text>
      </TouchableOpacity>

      {/* Delete button (only when editing) */}
      {isEditing && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#F44336" />
          <Text style={styles.deleteButtonText}>删除事件</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 10,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
});
