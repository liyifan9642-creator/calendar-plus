import { MessageMode, MessageStatus } from './enums';
import { CalendarEvent } from './CalendarEvent';

export interface Message {
  id: string;
  mode: MessageMode;
  status: MessageStatus;
  title?: string;
  date?: string;       // YYYY-MM-DD
  weekStartDate?: string; // YYYY-MM-DD (Monday)
  startTime?: string;  // HH:mm
  endTime?: string;    // HH:mm
  location?: string;
  description?: string;
  targetEventId?: string;
  conflictsJson?: string;
  clarificationQuestion?: string;
  llmResponseJson?: string;
  sessionId: string;
  userId: string;
  userInput: string;
  responseText?: string;
  createdAt: string;
  updatedAt: string;
}
