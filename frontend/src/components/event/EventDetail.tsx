import React, { useState } from 'react';
import {
  Modal,
  Typography,
  Space,
  Tag,
  Button,
  Divider,
  Popconfirm,
  Dropdown,
  message,
} from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  TeamOutlined,
  SyncOutlined,
  BellOutlined,
  CopyOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useUIStore } from '@/stores';
import { useCalendar } from '@/hooks';
import { formatDateTime, getRelativeTime, eventToICS, downloadFile } from '@/utils';
import { EventStatus, RecurrenceFrequency } from '@/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  DAILY: '每天',
  WEEKLY: '每周',
  MONTHLY: '每月',
  YEARLY: '每年',
};

const EventDetail: React.FC = () => {
  const { showEventDetail, selectedEvent, closeEventDetail, openEditForm } = useUIStore();
  const { deleteEvent, changeEventStatus } = useCalendar();
  const [statusLoading, setStatusLoading] = useState(false);

  if (!selectedEvent) {
    return null;
  }

  const handleEdit = () => {
    closeEventDetail();
    openEditForm(selectedEvent);
  };

  const handleDelete = async () => {
    try {
      await deleteEvent(selectedEvent.id);
      message.success('事件删除成功');
      closeEventDetail();
    } catch (error) {
      console.error('Failed to delete event:', error);
      message.error('删除失败');
    }
  };

  const handleStatusChange = async (status: EventStatus) => {
    setStatusLoading(true);
    try {
      await changeEventStatus(selectedEvent.id, status);
      const statusLabels: Record<EventStatus, string> = {
        ACTIVE: '已恢复为进行中',
        COMPLETED: '已标记为完成',
        CANCELLED: '已取消',
      };
      message.success(statusLabels[status]);
    } catch (error) {
      console.error('Failed to update status:', error);
      message.error('状态更新失败');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleShare = async () => {
    const shareText = [
      `事件: ${selectedEvent.title}`,
      `时间: ${formatDateTime(selectedEvent.startTime)} - ${formatDateTime(selectedEvent.endTime)}`,
      selectedEvent.location ? `地点: ${selectedEvent.location}` : '',
      selectedEvent.description ? `描述: ${selectedEvent.description}` : '',
      selectedEvent.attendees?.length ? `参与者: ${selectedEvent.attendees.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(shareText);
      message.success('事件信息已复制到剪贴板');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('事件信息已复制到剪贴板');
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`邀请: ${selectedEvent.title}`);
    const body = encodeURIComponent(
      [
        `事件: ${selectedEvent.title}`,
        `时间: ${formatDateTime(selectedEvent.startTime)} - ${formatDateTime(selectedEvent.endTime)}`,
        selectedEvent.location ? `地点: ${selectedEvent.location}` : '',
        selectedEvent.description ? `描述: ${selectedEvent.description}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleExportICS = () => {
    const icsContent = eventToICS(selectedEvent);
    const filename = `${selectedEvent.title.replace(/[^a-zA-Z0-9一-龥]/g, '_')}.ics`;
    downloadFile(icsContent, filename, 'text/calendar;charset=utf-8');
    message.success('ICS文件已导出');
  };

  const getEventStatus = () => {
    const now = dayjs();
    const start = dayjs(selectedEvent.startTime);
    const end = dayjs(selectedEvent.endTime);

    if (selectedEvent.status === 'CANCELLED') {
      return { text: '已取消', color: 'default' };
    }
    if (selectedEvent.status === 'COMPLETED') {
      return { text: '已完成', color: 'success' };
    }
    if (end.isBefore(now)) {
      return { text: '已结束', color: 'default' };
    }
    if (start.isBefore(now) && end.isAfter(now)) {
      return { text: '进行中', color: 'processing' };
    }
    return { text: '即将开始', color: 'blue' };
  };

  const status = getEventStatus();

  const shareMenuItems = [
    {
      key: 'clipboard',
      icon: <CopyOutlined />,
      label: '复制到剪贴板',
      onClick: handleShare,
    },
    {
      key: 'email',
      icon: <MailOutlined />,
      label: '通过邮件分享',
      onClick: handleShareEmail,
    },
  ];

  const statusMenuItems = [
    ...(selectedEvent.status !== 'ACTIVE'
      ? [
          {
            key: 'active',
            icon: <CalendarOutlined />,
            label: '恢复为进行中',
            onClick: () => handleStatusChange('ACTIVE'),
          },
        ]
      : []),
    ...(selectedEvent.status !== 'COMPLETED'
      ? [
          {
            key: 'completed',
            icon: <CheckCircleOutlined />,
            label: '标记为完成',
            onClick: () => handleStatusChange('COMPLETED'),
          },
        ]
      : []),
    ...(selectedEvent.status !== 'CANCELLED'
      ? [
          {
            key: 'cancelled',
            icon: <CloseCircleOutlined />,
            label: '取消事件',
            onClick: () => handleStatusChange('CANCELLED'),
          },
        ]
      : []),
  ];

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined />
          <span>事件详情</span>
        </Space>
      }
      open={showEventDetail}
      onCancel={closeEventDetail}
      footer={[
        <Dropdown key="status" menu={{ items: statusMenuItems }} placement="bottomLeft">
          <Button loading={statusLoading}>
            切换状态
          </Button>
        </Dropdown>,
        <Dropdown key="share" menu={{ items: shareMenuItems }} placement="bottomLeft">
          <Button icon={<ShareAltOutlined />}>
            分享
          </Button>
        </Dropdown>,
        <Button key="export" icon={<DownloadOutlined />} onClick={handleExportICS}>
          导出ICS
        </Button>,
        <Button key="edit" type="primary" icon={<EditOutlined />} onClick={handleEdit}>
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确定删除此事件？"
          description="删除后无法恢复"
          onConfirm={handleDelete}
          okText="确定"
          cancelText="取消"
        >
          <Button danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ]}
      width={520}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Title and status */}
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>
            {selectedEvent.title}
          </Title>
          <Tag color={status.color}>{status.text}</Tag>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Time */}
        <Space>
          <ClockCircleOutlined style={{ color: '#1677ff', fontSize: '16px' }} />
          <div>
            <Text strong>时间：</Text>
            <br />
            <Text>
              {formatDateTime(selectedEvent.startTime)} - {formatDateTime(selectedEvent.endTime)}
            </Text>
            <br />
            <Text type="secondary">{getRelativeTime(selectedEvent.startTime)}</Text>
          </div>
        </Space>

        {/* Location */}
        {selectedEvent.location && (
          <Space>
            <EnvironmentOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
            <div>
              <Text strong>地点：</Text>
              <br />
              <Text>{selectedEvent.location}</Text>
            </div>
          </Space>
        )}

        {/* Description */}
        {selectedEvent.description && (
          <Space align="start">
            <FileTextOutlined style={{ color: '#722ed1', fontSize: '16px', marginTop: '4px' }} />
            <div>
              <Text strong>描述：</Text>
              <br />
              <Paragraph style={{ marginBottom: 0 }}>{selectedEvent.description}</Paragraph>
            </div>
          </Space>
        )}

        {/* Attendees */}
        {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
          <div>
            <Space style={{ marginBottom: 8 }}>
              <TeamOutlined style={{ color: '#1677ff', fontSize: '16px' }} />
              <Text strong>参与者：</Text>
            </Space>
            <div style={{ marginLeft: 24 }}>
              <Space wrap>
                {selectedEvent.attendees.map((attendee, index) => (
                  <Tag key={index} color="blue">
                    {attendee}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        )}

        {/* Recurrence */}
        {selectedEvent.recurrence && (
          <Space>
            <SyncOutlined style={{ color: '#fa8c16', fontSize: '16px' }} />
            <div>
              <Text strong>重复：</Text>
              <br />
              <Text>
                每{selectedEvent.recurrence.interval > 1 ? selectedEvent.recurrence.interval : ''}
                {RECURRENCE_LABELS[selectedEvent.recurrence.frequency].replace('每', '')}
                {selectedEvent.recurrence.count ? `，共 ${selectedEvent.recurrence.count} 次` : ''}
              </Text>
            </div>
          </Space>
        )}

        {/* Reminders */}
        {selectedEvent.reminders && selectedEvent.reminders.length > 0 && (
          <div>
            <Space style={{ marginBottom: 8 }}>
              <BellOutlined style={{ color: '#eb2f96', fontSize: '16px' }} />
              <Text strong>提醒：</Text>
            </Space>
            <div style={{ marginLeft: 24 }}>
              <Space wrap>
                {selectedEvent.reminders.map((reminder, index) => (
                  <Tag key={index} color="pink">
                    {reminder.minutesBefore === 0
                      ? '事件开始时'
                      : `${reminder.minutesBefore} 分钟前`}
                    ({reminder.method === 'EMAIL' ? '邮件' : '通知'})
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />

        {/* Created/Updated time */}
        <Space direction="vertical" size="small">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            创建时间：{formatDateTime(selectedEvent.createdAt)}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            更新时间：{formatDateTime(selectedEvent.updatedAt)}
          </Text>
        </Space>
      </Space>
    </Modal>
  );
};

export default EventDetail;
