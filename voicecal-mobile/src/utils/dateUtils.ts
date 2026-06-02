import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

/**
 * Format a date string or Date object.
 * @param date - ISO date string or Date
 * @param format - dayjs format string, defaults to 'YYYY-MM-DD'
 */
export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format);
}

/**
 * Combine a date (YYYY-MM-DD) and time (HH:mm) into an ISO datetime string.
 */
export function toIsoDateTime(date: string, time: string): string {
  return dayjs(`${date} ${time}`).toISOString();
}

/**
 * Split an ISO datetime into date and time parts.
 */
export function parseIsoDateTime(iso: string): { date: string; time: string } {
  const d = dayjs(iso);
  return {
    date: d.format('YYYY-MM-DD'),
    time: d.format('HH:mm'),
  };
}

/**
 * Returns today's date as YYYY-MM-DD.
 */
export function getToday(): string {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * Returns the current time as HH:mm.
 */
export function getNow(): string {
  return dayjs().format('HH:mm');
}

/**
 * Returns the Monday of the current (or given) week as YYYY-MM-DD.
 */
export function getWeekStart(date?: string): string {
  const d = date ? dayjs(date) : dayjs();
  return d.isoWeekday(1).format('YYYY-MM-DD');
}

/**
 * Add a number of days to a date string.
 */
export function addDays(date: string, days: number): string {
  return dayjs(date).add(days, 'day').format('YYYY-MM-DD');
}

/**
 * Check whether an end time is after a start time (both HH:mm).
 */
export function isTimeRangeValid(start: string, end: string): boolean {
  return dayjs(`2000-01-01 ${end}`).isAfter(dayjs(`2000-01-01 ${start}`));
}
