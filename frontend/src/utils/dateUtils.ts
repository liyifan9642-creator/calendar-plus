import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/zh-cn';

// Extend dayjs with plugins
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(weekday);
dayjs.extend(localeData);

// Set default locale to Chinese
dayjs.locale('zh-cn');

/**
 * Format date to display string
 */
export const formatDate = (date: Dayjs | string, format = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

/**
 * Format time to display string
 */
export const formatTime = (date: Dayjs | string, format = 'HH:mm'): string => {
  return dayjs(date).format(format);
};

/**
 * Format datetime to display string
 */
export const formatDateTime = (date: Dayjs | string, format = 'YYYY-MM-DD HH:mm'): string => {
  return dayjs(date).format(format);
};

/**
 * Get today's date
 */
export const getToday = (): Dayjs => {
  return dayjs().startOf('day');
};

/**
 * Check if a date is today
 */
export const isToday = (date: Dayjs | string): boolean => {
  return dayjs(date).isSame(dayjs(), 'day');
};

/**
 * Check if a date is in the past
 */
export const isPast = (date: Dayjs | string): boolean => {
  return dayjs(date).isBefore(dayjs(), 'day');
};

/**
 * Check if a date is in the future
 */
export const isFuture = (date: Dayjs | string): boolean => {
  return dayjs(date).isAfter(dayjs(), 'day');
};

/**
 * Get the start of month
 */
export const getStartOfMonth = (date: Dayjs | string): Dayjs => {
  return dayjs(date).startOf('month');
};

/**
 * Get the end of month
 */
export const getEndOfMonth = (date: Dayjs | string): Dayjs => {
  return dayjs(date).endOf('month');
};

/**
 * Get calendar days for a month (including padding days from prev/next month)
 */
export const getCalendarDays = (month: Dayjs | string): Dayjs[] => {
  const start = getStartOfMonth(month);
  const end = getEndOfMonth(month);

  // Get the first day of the week for the start of month
  const startDay = start.weekday();

  // Get the last day of the week for the end of month
  const endDay = end.weekday();

  const days: Dayjs[] = [];

  // Add padding days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(start.subtract(i + 1, 'day'));
  }

  // Add days of current month
  let current = start;
  while (current.isSameOrBefore(end, 'day')) {
    days.push(current);
    current = current.add(1, 'day');
  }

  // Add padding days from next month
  for (let i = 1; i <= 6 - endDay; i++) {
    days.push(end.add(i, 'day'));
  }

  return days;
};

/**
 * Get relative time description
 */
export const getRelativeTime = (date: Dayjs | string): string => {
  const d = dayjs(date);
  const today = dayjs();

  if (d.isSame(today, 'day')) {
    return '今天';
  } else if (d.isSame(today.add(1, 'day'), 'day')) {
    return '明天';
  } else if (d.isSame(today.subtract(1, 'day'), 'day')) {
    return '昨天';
  } else if (d.isSame(today.add(2, 'day'), 'day')) {
    return '后天';
  } else if (d.isSame(today.subtract(2, 'day'), 'day')) {
    return '前天';
  } else if (d.isAfter(today) && d.isBefore(today.add(7, 'day'))) {
    return `${d.format('dddd')}`;
  } else {
    return d.format('M月D日');
  }
};

/**
 * Check if two time ranges overlap
 */
export const isTimeOverlap = (
  start1: Dayjs | string,
  end1: Dayjs | string,
  start2: Dayjs | string,
  end2: Dayjs | string
): boolean => {
  const s1 = dayjs(start1);
  const e1 = dayjs(end1);
  const s2 = dayjs(start2);
  const e2 = dayjs(end2);

  return s1.isBefore(e2) && s2.isBefore(e1);
};

/**
 * Get duration in minutes
 */
export const getDurationInMinutes = (start: Dayjs | string, end: Dayjs | string): number => {
  return dayjs(end).diff(dayjs(start), 'minute');
};

/**
 * Format duration
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${mins}分钟`;
};

/**
 * Get week day names in Chinese
 */
export const getWeekDayNames = (): string[] => {
  return ['一', '二', '三', '四', '五', '六', '日'];
};

/**
 * Get the start of the week (Monday)
 */
export const getStartOfWeek = (date: Dayjs | string): Dayjs => {
  return dayjs(date).startOf('week').add(1, 'day'); // Monday
};

/**
 * Get the end of the week (Sunday)
 */
export const getEndOfWeek = (date: Dayjs | string): Dayjs => {
  return getStartOfWeek(date).add(6, 'day').endOf('day');
};

/**
 * Get all days in a week
 */
export const getWeekDays = (date: Dayjs | string): Dayjs[] => {
  const start = getStartOfWeek(date);
  const days: Dayjs[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(start.add(i, 'day'));
  }
  return days;
};

/**
 * Get hours in a day (0-23)
 */
export const getDayHours = (): number[] => {
  return Array.from({ length: 24 }, (_, i) => i);
};

/**
 * Format hour for display
 */
export const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

/**
 * Check if two dates are in the same week
 */
export const isSameWeek = (date1: Dayjs | string, date2: Dayjs | string): boolean => {
  const d1 = dayjs(date1);
  const d2 = dayjs(date2);
  return getStartOfWeek(d1).isSame(getStartOfWeek(d2), 'day');
};

export default dayjs;
