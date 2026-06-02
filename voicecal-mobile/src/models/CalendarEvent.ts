import { EventStatus } from './enums';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  location?: string;
  repeatRuleId?: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}
