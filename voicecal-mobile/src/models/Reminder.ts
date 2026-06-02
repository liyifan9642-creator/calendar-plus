import { ReminderStatus } from './enums';

export interface Reminder {
  id: string;
  eventId: string;
  remindAt: string; // ISO datetime
  status: ReminderStatus;
}
