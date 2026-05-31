import { useCallback, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useCalendarStore, useUIStore } from '@/stores';
import { getCalendarDays, getWeekDays, isToday, formatDate, getStartOfWeek, getEndOfWeek } from '@/utils';
import { CalendarDay, CalendarView, EventStatus } from '@/types';

/**
 * Hook for calendar functionality
 */
export const useCalendar = () => {
  const {
    selectedDate,
    currentMonth,
    events,
    selectedDayEvents,
    loading,
    error,
    isBatchMode,
    selectedIds,
    setSelectedDate,
    setCurrentMonth,
    fetchMonthEvents,
    fetchDayEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    updateEventStatus,
    refreshEvents,
    clearError,
    toggleBatchMode,
    toggleSelectEvent,
    selectAllEvents,
    clearSelection,
    batchDeleteEvents,
  } = useCalendarStore();

  const { calendarView, setCalendarView } = useUIStore();

  // Get calendar days for current month view
  const calendarDays: CalendarDay[] = getCalendarDays(currentMonth).map((date) => ({
    date: formatDate(date, 'YYYY-MM-DD'),
    isToday: isToday(date),
    isSelected: date.isSame(selectedDate, 'day'),
    isCurrentMonth: date.isSame(currentMonth, 'month'),
    events: events.filter((e) => dayjs(e.startTime).isSame(date, 'day')),
  }));

  // Get week days for current week view
  const weekDays: CalendarDay[] = getWeekDays(selectedDate).map((date) => ({
    date: formatDate(date, 'YYYY-MM-DD'),
    isToday: isToday(date),
    isSelected: date.isSame(selectedDate, 'day'),
    isCurrentMonth: date.isSame(currentMonth, 'month'),
    events: events.filter((e) => dayjs(e.startTime).isSame(date, 'day')),
  }));

  // Navigate to previous month/week
  const goToPrevious = useCallback(() => {
    if (calendarView === 'week') {
      const newDate = selectedDate.subtract(1, 'week');
      setSelectedDate(newDate);
      setCurrentMonth(newDate);
    } else {
      setCurrentMonth(currentMonth.subtract(1, 'month'));
    }
  }, [calendarView, selectedDate, currentMonth, setSelectedDate, setCurrentMonth]);

  // Navigate to next month/week
  const goToNext = useCallback(() => {
    if (calendarView === 'week') {
      const newDate = selectedDate.add(1, 'week');
      setSelectedDate(newDate);
      setCurrentMonth(newDate);
    } else {
      setCurrentMonth(currentMonth.add(1, 'month'));
    }
  }, [calendarView, selectedDate, currentMonth, setSelectedDate, setCurrentMonth]);

  // Navigate to previous month (for backward compatibility)
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  }, [currentMonth, setCurrentMonth]);

  // Navigate to next month (for backward compatibility)
  const goToNextMonth = useCallback(() => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  }, [currentMonth, setCurrentMonth]);

  // Go to today
  const goToToday = useCallback(() => {
    const today = dayjs();
    setCurrentMonth(today);
    setSelectedDate(today);
  }, [setCurrentMonth, setSelectedDate]);

  // Select a date
  const selectDate = useCallback(
    (date: Dayjs) => {
      setSelectedDate(date);
      // If selecting a date in different month, update current month
      if (!date.isSame(currentMonth, 'month')) {
        setCurrentMonth(date);
      }
    },
    [currentMonth, setSelectedDate, setCurrentMonth]
  );

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Dayjs) => {
      return events.filter((e) => dayjs(e.startTime).isSame(date, 'day'));
    },
    [events]
  );

  // Check if a date has events
  const hasEvents = useCallback(
    (date: Dayjs) => {
      return events.some((e) => dayjs(e.startTime).isSame(date, 'day'));
    },
    [events]
  );

  // Change event status
  const changeEventStatus = useCallback(
    async (id: string, status: EventStatus) => {
      return await updateEventStatus(id, status);
    },
    [updateEventStatus]
  );

  // Format current month for display
  const currentMonthDisplay = formatDate(currentMonth, 'YYYY年M月');

  // Format selected date for display
  const selectedDateDisplay = formatDate(selectedDate, 'YYYY年M月D日 dddd');

  // Format week range for display
  const weekRangeDisplay = (() => {
    const start = getStartOfWeek(selectedDate);
    const end = getEndOfWeek(selectedDate);
    if (start.isSame(end, 'month')) {
      return `${formatDate(start, 'YYYY年M月D日')} - ${formatDate(end, 'D日')}`;
    }
    return `${formatDate(start, 'YYYY年M月D日')} - ${formatDate(end, 'YYYY年M月D日')}`;
  })();

  // Check if an event is selected in batch mode
  const isEventSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  return {
    // State
    selectedDate,
    currentMonth,
    events,
    selectedDayEvents,
    calendarDays,
    weekDays,
    calendarView,
    loading,
    error,
    currentMonthDisplay,
    selectedDateDisplay,
    weekRangeDisplay,
    isBatchMode,
    selectedIds,
    selectedCount: selectedIds.size,

    // Actions
    goToPrevious,
    goToNext,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    selectDate,
    setCalendarView,
    getEventsForDate,
    hasEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    changeEventStatus,
    refreshEvents,
    clearError,

    // Batch actions
    toggleBatchMode,
    toggleSelectEvent,
    selectAllEvents,
    clearSelection,
    batchDeleteEvents,
    isEventSelected,
  };
};

export default useCalendar;
