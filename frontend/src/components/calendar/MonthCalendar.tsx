import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Typography, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined } from '@ant-design/icons';
import { useCalendar } from '@/hooks';
import CalendarDay from './CalendarDay';
import { getWeekDayNames, formatDate } from '@/utils';
import dayjs, { Dayjs } from 'dayjs';

const { Text } = Typography;

const calendarStyles = `
  .calendar-card {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .calendar-card:hover {
    box-shadow: 0 20px 60px rgba(99, 102, 241, 0.1), 0 8px 24px rgba(0, 0, 0, 0.06) !important;
    transform: translateY(-2px);
  }

  .calendar-card::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.03) 0%, transparent 70%);
    pointer-events: none;
  }

  .nav-btn {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative;
    overflow: hidden;
  }

  .nav-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.2) !important;
  }

  .nav-btn:active {
    transform: scale(0.95);
  }

  .today-btn {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .today-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.1);
    transform: translate(-50%, -50%);
    transition: width 0.4s, height 0.4s;
  }

  .today-btn:hover::before {
    width: 200%;
    height: 200%;
  }

  .today-btn:hover {
    color: #6366f1 !important;
    border-color: #6366f1 !important;
    transform: translateY(-1px);
  }

  .weekday-header {
    transition: all 0.2s ease;
  }

  .weekday-header:hover {
    transform: scale(1.05);
  }

  .calendar-grid {
    animation: fade-in 0.4s ease-out;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .month-title {
    background: linear-gradient(135deg, #1e1b4b, #4338ca);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient-flow 3s ease infinite;
    background-size: 200% 200%;
  }
`;

const MonthCalendar: React.FC = () => {
  const {
    calendarDays,
    weekDays: weekViewDays,
    calendarView,
    currentMonthDisplay,
    weekRangeDisplay,
    loading,
    goToPrevious,
    goToNext,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    selectDate,
  } = useCalendar();

  // Drag-to-select state
  const [dragStartDate, setDragStartDate] = useState<Dayjs | null>(null);
  const [dragCurrentDate, setDragCurrentDate] = useState<Dayjs | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const weekDayNames = getWeekDayNames();
  const isWeekView = calendarView === 'week';
  const displayDays = isWeekView ? weekViewDays : calendarDays;
  const displayTitle = isWeekView ? weekRangeDisplay : currentMonthDisplay;

  // Drag handlers
  const handleDragStart = useCallback((date: Dayjs) => {
    setDragStartDate(date);
    setDragCurrentDate(date);
  }, []);

  const handleDragEnter = useCallback((date: Dayjs) => {
    setDragCurrentDate(date);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragStartDate && dragCurrentDate) {
      const start = dragStartDate.isBefore(dragCurrentDate) ? dragStartDate : dragCurrentDate;
      selectDate(start);
    }
    setDragStartDate(null);
    setDragCurrentDate(null);
  }, [dragStartDate, dragCurrentDate, selectDate]);

  // Check if a date is in drag range
  const isInDragRange = useCallback((date: Dayjs) => {
    if (!dragStartDate || !dragCurrentDate) return false;
    const start = dragStartDate.isBefore(dragCurrentDate) ? dragStartDate : dragCurrentDate;
    const end = dragStartDate.isBefore(dragCurrentDate) ? dragCurrentDate : dragStartDate;
    return date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day');
  }, [dragStartDate, dragCurrentDate]);

  return (
    <>
      <style>{calendarStyles}</style>
      <Card
        bordered={false}
        className="calendar-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isHovered
                  ? '0 8px 20px rgba(99, 102, 241, 0.3)'
                  : '0 4px 12px rgba(99, 102, 241, 0.2)',
                transition: 'all 0.3s',
              }}
            >
              <CalendarOutlined style={{ fontSize: '16px', color: '#fff' }} />
            </div>
            <span className="month-title" style={{ fontSize: '16px', fontWeight: 700 }}>
              {displayTitle}
            </span>
          </div>
        }
        extra={
          <Space size="small">
            <Button
              className="today-btn"
              size="small"
              onClick={goToToday}
              style={{
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '12px',
                height: '32px',
                padding: '0 14px',
                border: '1.5px solid rgba(99, 102, 241, 0.2)',
                color: '#6366f1',
              }}
            >
              今天
            </Button>
            <Tooltip title="上一个">
              <Button
                className="nav-btn"
                size="small"
                icon={<LeftOutlined />}
                onClick={goToPrevious}
                style={{
                  borderRadius: '10px',
                  width: '32px',
                  height: '32px',
                  border: '1.5px solid rgba(99, 102, 241, 0.1)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              />
            </Tooltip>
            <Tooltip title="下一个">
              <Button
                className="nav-btn"
                size="small"
                icon={<RightOutlined />}
                onClick={goToNext}
                style={{
                  borderRadius: '10px',
                  width: '32px',
                  height: '32px',
                  border: '1.5px solid rgba(99, 102, 241, 0.1)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              />
            </Tooltip>
          </Space>
        }
        style={{
          height: '100%',
          borderRadius: '24px',
          border: 'none',
          boxShadow: isHovered
            ? '0 20px 60px rgba(99, 102, 241, 0.1), 0 8px 24px rgba(0, 0, 0, 0.06)'
            : '0 8px 32px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,255,0.95))',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        styles={{
          header: {
            borderBottom: '1px solid rgba(99, 102, 241, 0.06)',
            padding: '18px 24px',
          },
          body: { padding: '20px 24px' },
        }}
        loading={loading}
      >
        {/* Week day headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            marginBottom: '14px',
          }}
        >
          {weekDayNames.map((day, index) => (
            <div
              key={index}
              className="weekday-header"
              style={{
                textAlign: 'center',
                padding: '10px 0',
                fontWeight: 700,
                color: index >= 5 ? '#ef4444' : '#6366f1',
                fontSize: '12px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          className="calendar-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
          }}
        >
          {displayDays.map((day, index) => (
            <CalendarDay
              key={`${day.date}-${index}`}
              day={day}
              onSelect={selectDate}
              isDragTarget={isInDragRange(dayjs(day.date))}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              compact={isWeekView}
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default MonthCalendar;
