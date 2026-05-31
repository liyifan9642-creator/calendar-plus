import { CalendarEvent, RecurrenceRule, Reminder, ICSImportResult } from '@/types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Format a date to ICS format (YYYYMMDDTHHmmssZ)
 */
const toICSDate = (isoDate: string): string => {
  return dayjs(isoDate).utc().format('YYYYMMDDTHHmmss') + 'Z';
};

/**
 * Generate a UUID for ICS UID
 */
const generateUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Convert recurrence rule to ICS RRULE string
 */
const toICSRecurrenceRule = (rule: RecurrenceRule): string => {
  const freqMap: Record<string, string> = {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
  };

  let rrule = `RRULE:FREQ=${freqMap[rule.frequency]}`;

  if (rule.interval && rule.interval > 1) {
    rrule += `;INTERVAL=${rule.interval}`;
  }

  if (rule.count) {
    rrule += `;COUNT=${rule.count}`;
  }

  if (rule.until) {
    rrule += `;UNTIL=${toICSDate(rule.until)}`;
  }

  if (rule.byDay && rule.byDay.length > 0) {
    rrule += `;BYDAY=${rule.byDay.join(',')}`;
  }

  return rrule;
};

/**
 * Convert reminder to ICS VALARM
 */
const toICSReminder = (reminder: Reminder): string => {
  const triggerMinutes = -reminder.minutesBefore;
  const method = reminder.method === 'EMAIL' ? 'EMAIL' : 'DISPLAY';

  return [
    'BEGIN:VALARM',
    `TRIGGER:${triggerMinutes >= 0 ? '+' : ''}PT${Math.abs(triggerMinutes)}M`,
    `ACTION:${method}`,
    method === 'DISPLAY' ? 'DESCRIPTION:Reminder' : 'SUMMARY:Reminder',
    'END:VALARM',
  ].join('\r\n');
};

/**
 * Escape special characters for ICS text fields
 */
const escapeICSText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Export a single event to ICS format
 */
export const eventToICS = (event: CalendarEvent): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Voice Calendar//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id || generateUID()}`,
    `DTSTAMP:${toICSDate(event.createdAt || new Date().toISOString())}`,
    `DTSTART:${toICSDate(event.startTime)}`,
    `DTEND:${toICSDate(event.endTime)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  if (event.attendees && event.attendees.length > 0) {
    event.attendees.forEach((attendee) => {
      lines.push(`ATTENDEE;CN=${escapeICSText(attendee)}:mailto:${attendee.replace(/\s/g, '')}@example.com`);
    });
  }

  if (event.recurrence) {
    lines.push(toICSRecurrenceRule(event.recurrence));
  }

  if (event.reminders && event.reminders.length > 0) {
    event.reminders.forEach((reminder) => {
      lines.push(toICSReminder(reminder));
    });
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
};

/**
 * Export multiple events to ICS format
 */
export const eventsToICS = (events: CalendarEvent[]): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Voice Calendar//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((event) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id || generateUID()}`);
    lines.push(`DTSTAMP:${toICSDate(event.createdAt || new Date().toISOString())}`);
    lines.push(`DTSTART:${toICSDate(event.startTime)}`);
    lines.push(`DTEND:${toICSDate(event.endTime)}`);
    lines.push(`SUMMARY:${escapeICSText(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }

    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach((attendee) => {
        lines.push(`ATTENDEE;CN=${escapeICSText(attendee)}:mailto:${attendee.replace(/\s/g, '')}@example.com`);
      });
    }

    if (event.recurrence) {
      lines.push(toICSRecurrenceRule(event.recurrence));
    }

    if (event.reminders && event.reminders.length > 0) {
      event.reminders.forEach((reminder) => {
        lines.push(toICSReminder(reminder));
      });
    }

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
};

/**
 * Parse ICS date string to ISO 8601
 */
const parseICSDate = (icsDate: string): string => {
  // Handle format: YYYYMMDDTHHmmssZ or YYYYMMDDTHHmmss
  const cleaned = icsDate.replace(/[^0-9TZ]/g, '');
  if (cleaned.length >= 15) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    const hour = cleaned.substring(9, 11);
    const minute = cleaned.substring(11, 13);
    const second = cleaned.substring(13, 15);
    const hasZ = cleaned.endsWith('Z');
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${hasZ ? 'Z' : ''}`;
  }
  return icsDate;
};

/**
 * Unescape ICS text
 */
const unescapeICSText = (text: string): string => {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
};

/**
 * Parse RRULE string to RecurrenceRule
 */
const parseRecurrenceRule = (rrule: string): RecurrenceRule | undefined => {
  const freqMatch = rrule.match(/FREQ=([A-Z]+)/);
  if (!freqMatch) return undefined;

  const rule: RecurrenceRule = {
    frequency: freqMatch[1] as RecurrenceRule['frequency'],
    interval: 1,
  };

  const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
  if (intervalMatch) {
    rule.interval = parseInt(intervalMatch[1], 10);
  }

  const countMatch = rrule.match(/COUNT=(\d+)/);
  if (countMatch) {
    rule.count = parseInt(countMatch[1], 10);
  }

  const untilMatch = rrule.match(/UNTIL=([0-9TZ]+)/);
  if (untilMatch) {
    rule.until = parseICSDate(untilMatch[1]);
  }

  const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
  if (byDayMatch) {
    rule.byDay = byDayMatch[1].split(',');
  }

  return rule;
};

/**
 * Parse ICS content to CalendarEvent array
 */
export const parseICS = (icsContent: string): ICSImportResult => {
  const result: ICSImportResult = {
    totalEvents: 0,
    importedEvents: 0,
    skippedEvents: 0,
    errors: [],
  };

  const events: Partial<CalendarEvent>[] = [];

  // Split into VEVENT blocks
  const eventBlocks = icsContent.split('BEGIN:VEVENT');

  // Skip the first block (VCALENDAR header)
  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i];
    const endIndex = block.indexOf('END:VEVENT');
    if (endIndex === -1) {
      result.errors.push('Invalid VEVENT block: missing END:VEVENT');
      result.skippedEvents++;
      continue;
    }

    const eventContent = block.substring(0, endIndex);
    result.totalEvents++;

    try {
      const event: Partial<CalendarEvent> = {};

      // Extract fields
      const getField = (name: string): string | undefined => {
        // Match field with optional parameters (e.g., DTSTART;TZID=...)
        const regex = new RegExp(`(?:^|\\r?\\n)${name}(?:;[^:]*)?:(.+?)(?=\\r?\\n[A-Z]|$)`, 's');
        const match = eventContent.match(regex);
        return match ? match[1].trim() : undefined;
      };

      const summary = getField('SUMMARY');
      if (!summary) {
        result.errors.push(`Event ${i}: Missing SUMMARY`);
        result.skippedEvents++;
        continue;
      }

      event.title = unescapeICSText(summary);

      const dtstart = getField('DTSTART');
      const dtend = getField('DTEND');

      if (!dtstart) {
        result.errors.push(`Event ${i} (${event.title}): Missing DTSTART`);
        result.skippedEvents++;
        continue;
      }

      event.startTime = parseICSDate(dtstart);
      event.endTime = dtend ? parseICSDate(dtend) : dayjs(event.startTime).add(1, 'hour').toISOString();

      const uid = getField('UID');
      if (uid) {
        event.id = uid;
      }

      const description = getField('DESCRIPTION');
      if (description) {
        event.description = unescapeICSText(description);
      }

      const location = getField('LOCATION');
      if (location) {
        event.location = unescapeICSText(location);
      }

      // Parse attendees
      const attendeeRegex = /ATTENDEE(?:;[^:]*)?:.*?CN=([^:;]+)/g;
      const attendees: string[] = [];
      let attendeeMatch;
      while ((attendeeMatch = attendeeRegex.exec(eventContent)) !== null) {
        attendees.push(unescapeICSText(attendeeMatch[1]));
      }
      if (attendees.length > 0) {
        event.attendees = attendees;
      }

      // Parse recurrence rule
      const rrule = getField('RRULE');
      if (rrule) {
        event.recurrence = parseRecurrenceRule(rrule);
      }

      // Parse reminders (VALARM blocks)
      const alarmBlocks = eventContent.split('BEGIN:VALARM');
      const reminders: Reminder[] = [];
      for (let j = 1; j < alarmBlocks.length; j++) {
        const alarmBlock = alarmBlocks[j];
        const alarmEnd = alarmBlock.indexOf('END:VALARM');
        if (alarmEnd === -1) continue;

        const alarmContent = alarmBlock.substring(0, alarmEnd);
        const triggerMatch = alarmContent.match(/TRIGGER[^:]*:(.+)/);
        if (triggerMatch) {
          const triggerStr = triggerMatch[1].trim();
          const minutesMatch = triggerStr.match(/([+-]?)PT(\d+)M/);
          if (minutesMatch) {
            const minutes = parseInt(minutesMatch[2], 10);
            const methodMatch = alarmContent.match(/ACTION:(\w+)/);
            const method: Reminder['method'] =
              methodMatch && methodMatch[1] === 'EMAIL' ? 'EMAIL' : 'NOTIFICATION';
            reminders.push({ minutesBefore: minutes, method });
          }
        }
      }
      if (reminders.length > 0) {
        event.reminders = reminders;
      }

      event.status = 'ACTIVE';
      event.createdAt = new Date().toISOString();
      event.updatedAt = new Date().toISOString();

      events.push(event as CalendarEvent);
      result.importedEvents++;
    } catch (error) {
      result.errors.push(`Event ${i}: ${error instanceof Error ? error.message : 'Parse error'}`);
      result.skippedEvents++;
    }
  }

  return result;
};

/**
 * Download content as a file
 */
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Read file content as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
