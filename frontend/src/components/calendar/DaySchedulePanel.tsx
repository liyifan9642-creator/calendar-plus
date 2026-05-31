import React, { useState, useCallback } from 'react';
import { Card, Tag, Button, Empty, Space, Typography, Popconfirm, Segmented, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  FieldTimeOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { CalendarEvent } from '@/types';
import { useCalendar } from '@/hooks';
import { useUIStore } from '@/stores';
import { formatTime, getRelativeTime, formatDuration, getDurationInMinutes, getDayHours, formatHour } from '@/utils';
import dayjs from 'dayjs';

const { Text } = Typography;

type ViewMode = 'list' | 'timeline';

const scheduleStyles = `
  .schedule-card {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .schedule-card:hover {
    box-shadow: 0 20px 60px rgba(14, 165, 233, 0.1), 0 8px 24px rgba(0, 0, 0, 0.06) !important;
    transform: translateY(-2px);
  }

  .schedule-card::after {
    content: '';
    position: absolute;
    top: -30%;
    right: -30%;
    width: 60%;
    height: 60%;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.04) 0%, transparent 70%);
    pointer-events: none;
  }

  .event-card {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .event-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    transition: left 0.6s;
  }

  .event-card:hover::before {
    left: 100%;
  }

  .event-card:hover {
    transform: translateY(-3px) !important;
  }

  .action-btn {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative;
    overflow: hidden;
  }

  .action-btn:hover {
    transform: scale(1.1);
  }

  .action-btn:active {
    transform: scale(0.9);
  }

  .add-btn {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .add-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s;
  }

  .add-btn:hover::before {
    left: 100%;
  }

  .add-btn:hover {
    box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4) !important;
    transform: translateY(-2px);
  }

  .timeline-line {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, #6366f1 0%, #818cf8 50%, #a5b4fc 100%);
    border-radius: 1px;
  }

  .time-badge {
    transition: all 0.2s ease;
  }

  .event-card:hover .time-badge {
    transform: scale(1.02);
  }

  .drag-handle {
    cursor: grab;
    transition: all 0.2s ease;
  }

  .drag-handle:hover {
    color: #6366f1 !important;
    transform: scale(1.1);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .segmented-wrapper .ant-segmented {
    border-radius: 12px !important;
    padding: 3px !important;
    background: rgba(99, 102, 241, 0.06) !important;
  }

  .segmented-wrapper .ant-segmented-item {
    border-radius: 10px !important;
    transition: all 0.2s ease !important;
  }

  .segmented-wrapper .ant-segmented-item-selected {
    background: linear-gradient(135deg, #6366f1, #818cf8) !important;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
  }

  .segmented-wrapper .ant-segmented-thumb {
    background: linear-gradient(135deg, #6366f1, #818cf8) !important;
  }

  @keyframes event-enter {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .event-list > * {
    animation: event-enter 0.3s ease-out;
  }

  .event-list > *:nth-child(2) { animation-delay: 0.05s; }
  .event-list > *:nth-child(3) { animation-delay: 0.1s; }
  .event-list > *:nth-child(4) { animation-delay: 0.15s; }
  .event-list > *:nth-child(5) { animation-delay: 0.2s; }
`;

const DaySchedulePanel: React.FC = () => {
  const { selectedDate, selectedDateDisplay, selectedDayEvents, loading, deleteEvent } =
    useCalendar();
  const { openCreateForm, openEditForm, openEventDetail } = useUIStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Sort events by start time
  const sortedEvents = [...selectedDayEvents].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // Local reordered events for drag-sort
  const [orderedEvents, setOrderedEvents] = useState<CalendarEvent[]>(sortedEvents);

  // Sync when events change
  React.useEffect(() => {
    setOrderedEvents(sortedEvents);
  }, [selectedDayEvents]);

  // Get event status color
  const getEventStatusColor = (event: CalendarEvent) => {
    const now = dayjs();
    const start = dayjs(event.startTime);
    const end = dayjs(event.endTime);

    if (end.isBefore(now)) return '#d1d5db'; // Past
    if (start.isBefore(now) && end.isAfter(now)) return '#6366f1'; // Ongoing
    return '#22c55e'; // Upcoming
  };

  // Get event status text
  const getEventStatusText = (event: CalendarEvent) => {
    const now = dayjs();
    const start = dayjs(event.startTime);
    const end = dayjs(event.endTime);

    if (end.isBefore(now)) return '已结束';
    if (start.isBefore(now) && end.isAfter(now)) return '进行中';
    return '即将开始';
  };

  // Get event color by index for visual variety
  const getEventColor = (index: number) => {
    const colors = [
      'linear-gradient(135deg, #6366f1, #818cf8)',
      'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      'linear-gradient(135deg, #8b5cf6, #a78bfa)',
      'linear-gradient(135deg, #f59e0b, #fbbf24)',
      'linear-gradient(135deg, #ec4899, #f472b6)',
      'linear-gradient(135deg, #14b8a6, #2dd4bf)',
    ];
    return colors[index % colors.length];
  };

  // Get solid color for borders
  const getEventSolidColor = (index: number) => {
    const colors = ['#6366f1', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];
    return colors[index % colors.length];
  };

  // Handle delete event
  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // Drag-sort handlers
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newOrder = [...orderedEvents];
      const [dragged] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dragOverIndex, 0, dragged);
      setOrderedEvents(newOrder);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, orderedEvents]);

  // Get events for a specific hour (for timeline view)
  const getEventsForHour = useCallback(
    (hour: number) => {
      return sortedEvents.filter((event) => {
        const startHour = dayjs(event.startTime).hour();
        const endHour = dayjs(event.endTime).hour();
        return hour >= startHour && hour < endHour;
      });
    },
    [sortedEvents]
  );

  // Render event card
  const renderEventCard = (event: CalendarEvent, index: number, isTimeline = false) => {
    const duration = getDurationInMinutes(event.startTime, event.endTime);
    const statusColor = getEventStatusColor(event);
    const cardGradient = getEventColor(index);
    const cardSolidColor = getEventSolidColor(index);
    const isDragging = dragIndex === index;
    const isDragOver = dragOverIndex === index;

    return (
      <div
        key={event.id}
        className="event-card"
        draggable={!isTimeline}
        onDragStart={() => handleDragStart(index)}
        onDragEnter={() => handleDragEnter(index)}
        onDragOver={(e) => e.preventDefault()}
        onDragEnd={handleDragEnd}
        onClick={() => openEventDetail(event)}
        style={{
          padding: '10px 12px',
          marginBottom: isTimeline ? '6px' : '8px',
          borderRadius: '10px',
          border: `1.5px solid ${isDragOver ? cardSolidColor : 'rgba(0, 0, 0, 0.04)'}`,
          borderLeft: `4px solid ${cardSolidColor}`,
          cursor: 'pointer',
          backgroundColor: isDragging ? '#f5f3ff' : '#ffffff',
          opacity: isDragging ? 0.7 : 1,
          boxShadow: isDragOver
            ? `0 8px 24px ${cardSolidColor}20`
            : '0 4px 16px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        {/* Drag handle */}
        {!isTimeline && (
          <div className="drag-handle" style={{ color: '#d1d5db', paddingTop: '4px', flexShrink: 0 }}>
            <HolderOutlined />
          </div>
        )}

        {/* Time column */}
        <div
          className="time-badge"
          style={{
            flexShrink: 0,
            textAlign: 'center',
            minWidth: '48px',
            padding: '6px 8px',
            background: `${cardSolidColor}10`,
            borderRadius: '8px',
            border: `1px solid ${cardSolidColor}15`,
          }}
        >
          <Text strong style={{ fontSize: '14px', display: 'block', color: cardSolidColor, fontWeight: 700 }}>
            {formatTime(event.startTime)}
          </Text>
          <Text style={{ fontSize: '11px', display: 'block', color: `${cardSolidColor}aa`, marginTop: '2px' }}>
            {formatTime(event.endTime)}
          </Text>
          <div
            style={{
              marginTop: '6px',
              padding: '2px 8px',
              background: `${cardSolidColor}15`,
              borderRadius: '8px',
              fontSize: '10px',
              color: cardSolidColor,
              fontWeight: 600,
            }}
          >
            {formatDuration(duration)}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Text strong ellipsis={{ tooltip: event.title }} style={{ flex: 1, fontSize: '13px', color: '#1e1b4b', fontWeight: 600 }}>
              {event.title}
            </Text>
            <Tag
              color={statusColor}
              style={{
                margin: 0,
                fontSize: '11px',
                lineHeight: '20px',
                padding: '0 8px',
                borderRadius: '12px',
                fontWeight: 600,
                border: 'none',
                boxShadow: `0 2px 8px ${statusColor}30`,
              }}
            >
              {getEventStatusText(event)}
            </Tag>
          </div>

          {event.location && (
            <Space size={6} style={{ marginBottom: '6px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <EnvironmentOutlined style={{ color: '#6b7280', fontSize: '10px' }} />
              </div>
              <Text type="secondary" style={{ fontSize: '13px' }} ellipsis={{ tooltip: event.location }}>
                {event.location}
              </Text>
            </Space>
          )}

          {event.description && (
            <Text
              type="secondary"
              ellipsis={{ tooltip: event.description }}
              style={{ fontSize: '13px', display: 'block', color: '#6b7280', lineHeight: 1.5 }}
            >
              {event.description}
            </Text>
          )}
        </div>

        {/* Actions */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Tooltip title="编辑" placement="left">
            <Button
              className="action-btn"
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openEditForm(event);
              }}
              style={{
                color: '#9ca3af',
                borderRadius: '10px',
                width: '32px',
                height: '32px',
                background: 'rgba(99, 102, 241, 0.04)',
              }}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此事件？"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(event.id);
            }}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除" placement="left">
              <Button
                className="action-btn"
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
                style={{
                  color: '#ef4444',
                  borderRadius: '10px',
                  width: '32px',
                  height: '32px',
                  background: 'rgba(239, 68, 68, 0.04)',
                }}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      </div>
    );
  };

  // Render timeline view
  const renderTimeline = () => {
    const hours = getDayHours();

    return (
      <div style={{ position: 'relative', paddingLeft: '52px' }}>
        <div className="timeline-line" />
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          const isCurrentHour = dayjs().hour() === hour && dayjs().isSame(selectedDate, 'day');

          return (
            <div
              key={hour}
              style={{
                display: 'flex',
                minHeight: '44px',
                borderBottom: '1px solid rgba(99, 102, 241, 0.04)',
                position: 'relative',
              }}
            >
              {/* Hour label */}
              <div
                style={{
                  position: 'absolute',
                  left: '-52px',
                  width: '44px',
                  textAlign: 'right',
                  paddingRight: '16px',
                  fontSize: '12px',
                  color: isCurrentHour ? '#6366f1' : '#9ca3af',
                  fontWeight: isCurrentHour ? 700 : 500,
                  transform: 'translateY(-8px)',
                }}
              >
                {formatHour(hour)}
              </div>

              {/* Current hour indicator */}
              {isCurrentHour && (
                <div
                  style={{
                    position: 'absolute',
                    left: '-6px',
                    top: '0',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                    transform: 'translateY(-7px)',
                    zIndex: 2,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                    border: '3px solid #fff',
                  }}
                />
              )}

              {/* Events for this hour */}
              <div style={{ flex: 1, paddingTop: '8px', paddingBottom: '8px' }}>
                {hourEvents.map((event, idx) => {
                  const eventIndex = sortedEvents.findIndex((e) => e.id === event.id);
                  return renderEventCard(event, eventIndex, true);
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <style>{scheduleStyles}</style>
      <Card
        bordered={false}
        className="schedule-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isHovered
                  ? '0 8px 20px rgba(14, 165, 233, 0.3)'
                  : '0 4px 12px rgba(14, 165, 233, 0.2)',
                transition: 'all 0.3s',
              }}
            >
              <ClockCircleOutlined style={{ fontSize: '16px', color: '#fff' }} />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e1b4b' }}>{selectedDateDisplay}</span>
            <Tag
              style={{
                borderRadius: '20px',
                padding: '2px 12px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
                border: 'none',
                color: '#0369a1',
                boxShadow: '0 2px 8px rgba(14, 165, 233, 0.2)',
              }}
            >
              {getRelativeTime(selectedDate)}
            </Tag>
          </div>
        }
        extra={
          <Space size="middle">
            <div className="segmented-wrapper">
              <Segmented
                size="small"
                value={viewMode}
                onChange={(value) => setViewMode(value as ViewMode)}
                options={[
                  {
                    value: 'list',
                    icon: <UnorderedListOutlined />,
                  },
                  {
                    value: 'timeline',
                    icon: <FieldTimeOutlined />,
                  },
                ]}
              />
            </div>
            <Button
              className="add-btn"
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={openCreateForm}
              style={{
                borderRadius: '12px',
                height: '34px',
                padding: '0 18px',
                fontWeight: 600,
                fontSize: '13px',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                border: 'none',
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
              }}
            >
              添加事件
            </Button>
          </Space>
        }
        style={{
          height: '100%',
          borderRadius: '14px',
          border: 'none',
          boxShadow: isHovered
            ? '0 20px 60px rgba(14, 165, 233, 0.1), 0 8px 24px rgba(0, 0, 0, 0.06)'
            : '0 8px 32px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,255,0.95))',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        styles={{
          header: {
            borderBottom: '1px solid rgba(14, 165, 233, 0.06)',
            padding: '12px 16px',
          },
          body: {
            padding: '12px 16px',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          },
        }}
        loading={loading}
      >
        {sortedEvents.length === 0 ? (
          <Empty
            description={
              <Space direction="vertical" align="center" size="middle">
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(14, 165, 233, 0.2)',
                  }}
                >
                  <CalendarOutlined style={{ fontSize: '24px', color: '#0ea5e9' }} />
                </div>
                <Text style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>暂无事件</Text>
                <Button
                  type="link"
                  onClick={openCreateForm}
                  style={{
                    color: '#6366f1',
                    fontWeight: 600,
                    fontSize: '14px',
                    height: 'auto',
                    padding: '8px 20px',
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.06)',
                  }}
                >
                  点击添加新事件
                </Button>
              </Space>
            }
            style={{ padding: '24px 0' }}
          />
        ) : viewMode === 'timeline' ? (
          renderTimeline()
        ) : (
          <div className="event-list">
            {orderedEvents.map((event, index) => renderEventCard(event, index))}
          </div>
        )}
      </Card>
    </>
  );
};

export default DaySchedulePanel;
