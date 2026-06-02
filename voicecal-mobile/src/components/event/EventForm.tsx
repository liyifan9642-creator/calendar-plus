import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { CalendarEvent } from '../../models/CalendarEvent';
import { EventStatus } from '../../models/enums';
import { parseIsoDateTime } from '../../utils/dateUtils';

const PRIMARY = '#2196F3';

interface EventFormProps {
  initialEvent?: Partial<CalendarEvent>;
  onSave: (event: Partial<CalendarEvent>) => void;
  onCancel: () => void;
}

export default function EventForm({ initialEvent, onSave, onCancel }: EventFormProps) {
  const parsedStart = initialEvent?.startTime
    ? parseIsoDateTime(initialEvent.startTime)
    : undefined;
  const parsedEnd = initialEvent?.endTime
    ? parseIsoDateTime(initialEvent.endTime)
    : undefined;

  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');
  const [date, setDate] = useState(parsedStart?.date ?? '');
  const [startTime, setStartTime] = useState(parsedStart?.time ?? '');
  const [endTime, setEndTime] = useState(parsedEnd?.time ?? '');
  const [location, setLocation] = useState(initialEvent?.location ?? '');

  const isValid =
    title.trim().length > 0 &&
    date.trim().length > 0 &&
    startTime.trim().length > 0 &&
    endTime.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;

    onSave({
      ...initialEvent,
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      status: initialEvent?.status ?? EventStatus.ACTIVE,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>
        标题 <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="事件标题"
        placeholderTextColor="#9E9E9E"
      />

      <Text style={styles.label}>描述</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="事件描述（可选）"
        placeholderTextColor="#9E9E9E"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <Text style={styles.label}>
        日期 <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9E9E9E"
        keyboardType="numbers-and-punctuation"
      />

      <View style={styles.timeRow}>
        <View style={styles.timeColumn}>
          <Text style={styles.label}>
            开始时间 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:mm"
            placeholderTextColor="#9E9E9E"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={styles.timeColumn}>
          <Text style={styles.label}>
            结束时间 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="HH:mm"
            placeholderTextColor="#9E9E9E"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <Text style={styles.label}>地点</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="地点（可选）"
        placeholderTextColor="#9E9E9E"
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isValid}
          activeOpacity={0.7}
        >
          <Text style={[styles.saveButtonText, !isValid && styles.saveButtonTextDisabled]}>
            保存
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 6,
    marginTop: 12,
  },
  required: {
    color: '#F44336',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#212121',
    backgroundColor: '#FAFAFA',
  },
  multiline: {
    minHeight: 80,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDBDBD',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: '#9E9E9E',
  },
});
