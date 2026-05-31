import React, { useState } from 'react';
import { Tooltip } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarDay as CalendarDayType } from '@/types';
import { formatDate } from '@/utils';

const dayStyles = `
  .calendar-day {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .calendar-day::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.06);
    transform: translate(-50%, -50%);
    transition: width 0.4s, height 0.4s;
  }

  .calendar-day:hover::before {
    width: 180%;
    height: 180%;
  }

  .calendar-day:hover {
    transform: scale(1.05);
    z-index: 2;
  }

  .calendar-day:active {
    transform: scale(0.98);
  }

  .calendar-day.selected {
    animation: bounce-in 0.4s ease-out;
  }

  @keyframes bounce-in {
    0% { transform: scale(0.8); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  .calendar-day.today .day-number {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
  }

  .event-dot {
    transition: all 0.2s ease;
  }

  .calendar-day:hover .event-dot {
    transform: scale(1.3);
  }

  .drag-target {
    animation: drag-highlight 0.3s ease-out;
  }

  @keyframes drag-highlight {
    0% { background-color: transparent; }
    50% { background-color: rgba(99, 102, 241, 0.15); }
    100% { background-color: rgba(99, 102, 241, 0.1); }
  }

  .drag-indicator {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6366f1;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .drag-target .drag-indicator {
    opacity: 1;
  }
`;

interface CalendarDayProps {
  day: CalendarDayType;
  onSelect: (date: Dayjs) => void;
  isDragTarget?: boolean;
  onDragStart?: (date: Dayjs) => void;
  onDragEnter?: (date: Dayjs) => void;
  onDragEnd?: () => void;
  compact?: boolean;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  onSelect,
  isDragTarget = false,
  onDragStart,
  onDragEnter,
  onDragEnd,
  compact = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const date = dayjs(day.date);
  const dayNumber = date.date();
  const hasEvents = day.events.length > 0;
  const isWeekend = date.day() === 0 || date.day() === 6;

  const getBackground = () => {
    if (isDragTarget) return 'linear-gradient(135deg, #e0e7ff, #c7d2fe)';
    if (day.isSelected) return 'linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc)';
    if (day.isToday) return 'linear-gradient(135deg, #eef2ff, #e0e7ff)';
    if (isHovered) return 'linear-gradient(135deg, #f5f3ff, #ede9fe)';
    return 'transparent';
  };

  const getTextColor = () => {
    if (isDragTarget) return '#6366f1';
    if (day.isSelected) return '#fff';
    if (!day.isCurrentMonth) return '#d1d5db';
    if (isWeekend) return '#ef4444';
    return '#374151';
  };

  const getDayNumberStyle = () => {
    const base: React.CSSProperties = {
      fontSize: compact ? '13px' : '14px',
      fontWeight: day.isToday || day.isSelected ? 700 : 500,
      color: getTextColor(),
      lineHeight: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
    };

    if (day.isToday && !day.isSelected) {
      return {
        ...base,
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
      };
    }

    return base;
  };

  const cellHeight = compact ? '48px' : '64px';

  return (
    <>
      <style>{dayStyles}</style>
      <Tooltip
        title={
          hasEvents
            ? `${day.events.length}个事件：${day.events.map((e) => e.title).join('、')}`
            : undefined
        }
        placement="top"
      >
        <div
          className={`calendar-day ${day.isSelected ? 'selected' : ''} ${day.isToday ? 'today' : ''} ${isDragTarget ? 'drag-target' : ''}`}
          onClick={() => onSelect(date)}
          draggable={!!onDragStart}
          onDragStart={() => onDragStart?.(date)}
          onDragEnter={() => onDragEnter?.(date)}
          onDragOver={(e) => e.preventDefault()}
          onDragEnd={onDragEnd}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: cellHeight,
            padding: compact ? '6px' : '8px',
            borderRadius: '16px',
            cursor: 'pointer',
            background: getBackground(),
            border: isDragTarget ? '2px dashed #6366f1' : '2px solid transparent',
            position: 'relative',
            userSelect: 'none',
            boxShadow: day.isSelected
              ? '0 8px 24px rgba(99, 102, 241, 0.3)'
              : isDragTarget
                ? '0 4px 16px rgba(99, 102, 241, 0.15)'
                : 'none',
          }}
        >
          {/* Day number */}
          <span className="day-number" style={getDayNumberStyle()}>
            {dayNumber}
          </span>

          {/* Event indicator dots */}
          {hasEvents && (
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginTop: compact ? '4px' : '6px',
                position: 'absolute',
                bottom: compact ? '6px' : '8px',
              }}
            >
              {day.events.slice(0, compact ? 2 : 3).map((event, idx) => (
                <div
                  key={idx}
                  className="event-dot"
                  style={{
                    width: compact ? '5px' : '7px',
                    height: compact ? '5px' : '7px',
                    borderRadius: '50%',
                    backgroundColor: day.isSelected ? 'rgba(255,255,255,0.9)' : '#6366f1',
                    boxShadow: !day.isSelected ? '0 2px 6px rgba(99, 102, 241, 0.3)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
              {day.events.length > (compact ? 2 : 3) && (
                <span
                  style={{
                    fontSize: compact ? '9px' : '10px',
                    color: day.isSelected ? 'rgba(255,255,255,0.9)' : '#6366f1',
                    lineHeight: 1,
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                  }}
                >
                  +{day.events.length - (compact ? 2 : 3)}
                </span>
              )}
            </div>
          )}

          {/* Drag indicator */}
          <div className="drag-indicator" />
        </div>
      </Tooltip>
    </>
  );
};

export default CalendarDay;
