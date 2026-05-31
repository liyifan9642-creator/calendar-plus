// Calendar event types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  location?: string;
  attendees?: string[];
  status: EventStatus;
  recurrence?: RecurrenceRule;
  reminders?: Reminder[];
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';

export interface CreateEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  recurrence?: RecurrenceRule;
  reminders?: Reminder[];
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

// Calendar day type for calendar view
export interface CalendarDay {
  date: string; // YYYY-MM-DD
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
}

// Event form values
export interface EventFormValues {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  recurrence?: RecurrenceRule;
  reminders?: Reminder[];
}

// Recurrence types
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // e.g., every 2 weeks
  count?: number; // number of occurrences
  until?: string; // end date ISO 8601
  byDay?: string[]; // e.g., ['MO', 'WE', 'FR']
}

// Reminder types
export type ReminderMethod = 'NOTIFICATION' | 'EMAIL';

export interface Reminder {
  minutesBefore: number;
  method: ReminderMethod;
}

// Batch operation types
export interface BatchSelectionState {
  selectedIds: Set<string>;
  isBatchMode: boolean;
}

// ICS export/import types
export interface ICSExportOptions {
  startDate?: string;
  endDate?: string;
  eventIds?: string[];
}

export interface ICSImportResult {
  totalEvents: number;
  importedEvents: number;
  skippedEvents: number;
  errors: string[];
}

// Calendar view type
export type CalendarView = 'month' | 'week' | 'day';

// Date range for drag selection
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}
