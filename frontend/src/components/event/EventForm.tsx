import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Select,
  InputNumber,
  Tag,
  Divider,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, BellOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  CalendarEvent,
  CreateEventRequest,
  RecurrenceFrequency,
  ReminderMethod,
  Reminder,
  RecurrenceRule,
} from '@/types';
import { useUIStore } from '@/stores';
import { useCalendar } from '@/hooks';

const { TextArea } = Input;
const { Text } = Typography;

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'DAILY', label: '每天' },
  { value: 'WEEKLY', label: '每周' },
  { value: 'MONTHLY', label: '每月' },
  { value: 'YEARLY', label: '每年' },
];

const REMINDER_OPTIONS = [
  { value: 0, label: '事件开始时' },
  { value: 5, label: '5 分钟前' },
  { value: 10, label: '10 分钟前' },
  { value: 15, label: '15 分钟前' },
  { value: 30, label: '30 分钟前' },
  { value: 60, label: '1 小时前' },
  { value: 120, label: '2 小时前' },
  { value: 1440, label: '1 天前' },
];

const EventForm: React.FC = () => {
  const { showEventForm, editingEvent, closeForm } = useUIStore();
  const { createEvent, updateEvent, selectedDate } = useCalendar();
  const [form] = Form.useForm();

  // Attendees state
  const [attendees, setAttendees] = useState<string[]>([]);
  const [attendeeInput, setAttendeeInput] = useState('');

  // Recurrence state
  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceCount, setRecurrenceCount] = useState<number | undefined>();

  // Reminders state
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const isEditing = !!editingEvent;

  // Set form values when editing
  useEffect(() => {
    if (editingEvent) {
      form.setFieldsValue({
        title: editingEvent.title,
        description: editingEvent.description,
        startTime: dayjs(editingEvent.startTime),
        endTime: dayjs(editingEvent.endTime),
        location: editingEvent.location,
      });
      setAttendees(editingEvent.attendees || []);

      // Set recurrence
      if (editingEvent.recurrence) {
        setEnableRecurrence(true);
        setRecurrenceFrequency(editingEvent.recurrence.frequency);
        setRecurrenceInterval(editingEvent.recurrence.interval);
        setRecurrenceCount(editingEvent.recurrence.count);
      } else {
        setEnableRecurrence(false);
        setRecurrenceFrequency('WEEKLY');
        setRecurrenceInterval(1);
        setRecurrenceCount(undefined);
      }

      // Set reminders
      setReminders(editingEvent.reminders || []);
    } else {
      // Set default values for new event
      form.setFieldsValue({
        startTime: selectedDate.hour(9).minute(0),
        endTime: selectedDate.hour(10).minute(0),
      });
      setAttendees([]);
      setEnableRecurrence(false);
      setRecurrenceFrequency('WEEKLY');
      setRecurrenceInterval(1);
      setRecurrenceCount(undefined);
      setReminders([]);
    }
  }, [editingEvent, selectedDate, form]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Build recurrence rule
      let recurrence: RecurrenceRule | undefined;
      if (enableRecurrence) {
        recurrence = {
          frequency: recurrenceFrequency,
          interval: recurrenceInterval,
          count: recurrenceCount,
        };
      }

      const eventData: CreateEventRequest = {
        title: values.title,
        description: values.description,
        startTime: values.startTime.toISOString(),
        endTime: values.endTime.toISOString(),
        location: values.location,
        attendees: attendees.length > 0 ? attendees : undefined,
        recurrence,
        reminders: reminders.length > 0 ? reminders : undefined,
      };

      if (isEditing && editingEvent) {
        await updateEvent(editingEvent.id, eventData);
        message.success('事件更新成功');
      } else {
        await createEvent(eventData);
        message.success('事件创建成功');
      }

      handleClose();
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // Handle close
  const handleClose = () => {
    form.resetFields();
    setAttendees([]);
    setAttendeeInput('');
    setEnableRecurrence(false);
    setReminders([]);
    closeForm();
  };

  // Validate end time is after start time
  const validateEndTime = (_: any, value: any) => {
    const startTime = form.getFieldValue('startTime');
    if (value && startTime && value.isBefore(startTime)) {
      return Promise.reject(new Error('结束时间必须晚于开始时间'));
    }
    return Promise.resolve();
  };

  // Attendee management
  const handleAddAttendee = () => {
    const trimmed = attendeeInput.trim();
    if (!trimmed) {
      message.warning('请输入参与者名称');
      return;
    }
    if (attendees.includes(trimmed)) {
      message.warning('该参与者已存在');
      return;
    }
    setAttendees([...attendees, trimmed]);
    setAttendeeInput('');
  };

  const handleRemoveAttendee = (attendee: string) => {
    setAttendees(attendees.filter((a) => a !== attendee));
  };

  // Reminder management
  const handleAddReminder = () => {
    // Add a default 15-minute reminder
    const defaultReminder: Reminder = { minutesBefore: 15, method: 'NOTIFICATION' };
    // Check for duplicate
    if (reminders.some((r) => r.minutesBefore === defaultReminder.minutesBefore && r.method === defaultReminder.method)) {
      message.warning('该提醒已存在');
      return;
    }
    setReminders([...reminders, defaultReminder]);
  };

  const handleUpdateReminderMinutes = (index: number, minutes: number) => {
    const updated = [...reminders];
    updated[index] = { ...updated[index], minutesBefore: minutes };
    setReminders(updated);
  };

  const handleUpdateReminderMethod = (index: number, method: ReminderMethod) => {
    const updated = [...reminders];
    updated[index] = { ...updated[index], method };
    setReminders(updated);
  };

  const handleRemoveReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  return (
    <Modal
      title={isEditing ? '编辑事件' : '创建新事件'}
      open={showEventForm}
      onOk={handleSubmit}
      onCancel={handleClose}
      okText={isEditing ? '保存' : '创建'}
      cancelText="取消"
      width={560}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
      >
        <Form.Item
          name="title"
          label="事件标题"
          rules={[
            { required: true, message: '请输入事件标题' },
            { max: 200, message: '标题不能超过200个字符' },
          ]}
        >
          <Input placeholder="请输入事件标题" maxLength={200} />
        </Form.Item>

        <Form.Item
          name="startTime"
          label="开始时间"
          rules={[{ required: true, message: '请选择开始时间' }]}
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: '100%' }}
            placeholder="请选择开始时间"
          />
        </Form.Item>

        <Form.Item
          name="endTime"
          label="结束时间"
          rules={[
            { required: true, message: '请选择结束时间' },
            { validator: validateEndTime },
          ]}
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: '100%' }}
            placeholder="请选择结束时间"
          />
        </Form.Item>

        <Form.Item
          name="location"
          label="地点"
        >
          <Input placeholder="请输入地点（选填）" maxLength={500} />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
        >
          <TextArea
            placeholder="请输入事件描述（选填）"
            rows={3}
            maxLength={2000}
            showCount
          />
        </Form.Item>

        {/* Attendees section */}
        <Divider titlePlacement="start">
          <Space>
            <TeamOutlined />
            <span>参与者</span>
          </Space>
        </Divider>

        <div style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入参与者名称"
              value={attendeeInput}
              onChange={(e) => setAttendeeInput(e.target.value)}
              onPressEnter={handleAddAttendee}
              maxLength={100}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddAttendee}
            >
              添加
            </Button>
          </Space.Compact>
        </div>

        {attendees.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              {attendees.map((attendee) => (
                <Tag
                  key={attendee}
                  closable
                  onClose={() => handleRemoveAttendee(attendee)}
                  color="blue"
                >
                  {attendee}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {/* Recurrence section */}
        <Divider titlePlacement="start">
          <Space>
            <span>重复设置</span>
          </Space>
        </Divider>

        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              placeholder="选择重复频率"
              value={enableRecurrence ? recurrenceFrequency : undefined}
              onChange={(value) => {
                setRecurrenceFrequency(value);
                setEnableRecurrence(true);
              }}
              allowClear
              onClear={() => setEnableRecurrence(false)}
              options={RECURRENCE_OPTIONS}
              style={{ width: '100%' }}
            />

            {enableRecurrence && (
              <Space style={{ width: '100%' }} align="start">
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>间隔</Text>
                  <InputNumber
                    min={1}
                    max={99}
                    value={recurrenceInterval}
                    onChange={(v) => setRecurrenceInterval(v || 1)}
                    addonAfter={
                      RECURRENCE_OPTIONS.find((o) => o.value === recurrenceFrequency)?.label.replace('每', '')
                    }
                    style={{ width: 160 }}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>次数（选填）</Text>
                  <InputNumber
                    min={1}
                    max={999}
                    value={recurrenceCount}
                    onChange={(v) => setRecurrenceCount(v ?? undefined)}
                    placeholder="不限"
                    addonAfter="次"
                    style={{ width: 160 }}
                  />
                </div>
              </Space>
            )}
          </Space>
        </div>

        {/* Reminders section */}
        <Divider titlePlacement="start">
          <Space>
            <BellOutlined />
            <span>提醒设置</span>
          </Space>
        </Divider>

        <div style={{ marginBottom: 16 }}>
          {reminders.map((reminder, index) => (
            <Space key={index} style={{ marginBottom: 8, width: '100%' }} align="center">
              <Select
                value={reminder.minutesBefore}
                onChange={(v) => handleUpdateReminderMinutes(index, v)}
                options={REMINDER_OPTIONS}
                style={{ width: 160 }}
              />
              <Select
                value={reminder.method}
                onChange={(v) => handleUpdateReminderMethod(index, v)}
                options={[
                  { value: 'NOTIFICATION', label: '通知' },
                  { value: 'EMAIL', label: '邮件' },
                ]}
                style={{ width: 100 }}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveReminder(index)}
              />
            </Space>
          ))}
          <Button
            type="dashed"
            onClick={handleAddReminder}
            icon={<PlusOutlined />}
            style={{ width: '100%' }}
          >
            添加提醒
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EventForm;
