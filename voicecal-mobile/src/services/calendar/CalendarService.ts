import { CalendarEvent, Reminder, EventStatus, ReminderStatus } from '../../models';
import { calendarRepository, reminderRepository } from '../database';
import { generateId } from '../../utils/uuid';
import dayjs from 'dayjs';

export class CalendarService {
  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    if (!event.title || event.title.trim().length === 0) {
      throw new Error('Event title is required');
    }
    if (!event.startTime) {
      throw new Error('Event startTime is required');
    }
    if (!event.endTime) {
      throw new Error('Event endTime is required');
    }

    this.validateTimeRange(event.startTime, event.endTime);

    const conflicts = await this.checkForConflicts(event.startTime, event.endTime, null);
    if (conflicts.length > 0) {
      throw new Error(
        `Time conflict with ${conflicts.length} existing event(s): ${conflicts.map((c) => c.title).join(', ')}`
      );
    }

    const now = dayjs().toISOString();
    const newEvent: CalendarEvent = {
      id: event.id ?? generateId(),
      title: event.title!.trim(),
      description: event.description?.trim(),
      startTime: event.startTime!,
      endTime: event.endTime!,
      location: event.location?.trim(),
      repeatRuleId: event.repeatRuleId,
      status: event.status ?? EventStatus.ACTIVE,
      createdAt: event.createdAt ?? now,
      updatedAt: event.updatedAt ?? now,
    };

    return calendarRepository.save(newEvent);
  }

  async getEvent(id: string): Promise<CalendarEvent | null> {
    return calendarRepository.findById(id);
  }

  async getEvents(start: string, end: string): Promise<CalendarEvent[]> {
    return calendarRepository.findByDateRange(start, end);
  }

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const existing = await calendarRepository.findById(id);
    if (!existing) {
      throw new Error(`Event not found: ${id}`);
    }

    const merged: CalendarEvent = { ...existing };

    if (updates.title !== undefined && updates.title !== null) {
      merged.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
      merged.description = updates.description?.trim();
    }
    if (updates.startTime !== undefined && updates.startTime !== null) {
      merged.startTime = updates.startTime;
    }
    if (updates.endTime !== undefined && updates.endTime !== null) {
      merged.endTime = updates.endTime;
    }
    if (updates.location !== undefined) {
      merged.location = updates.location?.trim();
    }
    if (updates.repeatRuleId !== undefined) {
      merged.repeatRuleId = updates.repeatRuleId;
    }
    if (updates.status !== undefined && updates.status !== null) {
      merged.status = updates.status;
    }

    // Re-validate if times changed
    if (updates.startTime !== undefined || updates.endTime !== undefined) {
      this.validateTimeRange(merged.startTime, merged.endTime);

      const conflicts = await this.checkForConflicts(merged.startTime, merged.endTime, id);
      if (conflicts.length > 0) {
        throw new Error(
          `Time conflict with ${conflicts.length} existing event(s): ${conflicts.map((c) => c.title).join(', ')}`
        );
      }
    }

    merged.updatedAt = dayjs().toISOString();

    return calendarRepository.save(merged);
  }

  async deleteEvent(id: string): Promise<void> {
    await this.cancelReminders(id);
    await calendarRepository.delete(id);
  }

  async searchEvents(query: string): Promise<CalendarEvent[]> {
    if (!query || query.trim().length === 0) {
      return this.getAllEvents();
    }
    return calendarRepository.search(query.trim());
  }

  // ---------------------------------------------------------------------------
  // Extended Operations
  // ---------------------------------------------------------------------------

  async isAvailable(start: string, end: string): Promise<boolean> {
    const conflicts = await this.checkForConflicts(start, end, null);
    return conflicts.length === 0;
  }

  async batchDeleteEvents(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.deleteEvent(id);
    }
  }

  async getAllEvents(): Promise<CalendarEvent[]> {
    const events = await calendarRepository.findAll();
    return events.filter((e) => e.status !== EventStatus.CANCELLED);
  }

  async getEventsByWeek(weekStart: string): Promise<Record<string, CalendarEvent[]>> {
    const start = dayjs(weekStart).startOf('day');
    const end = start.add(7, 'day');

    const events = await calendarRepository.findByDateRange(
      start.toISOString(),
      end.toISOString()
    );

    const grouped: Record<string, CalendarEvent[]> = {};
    for (let i = 0; i < 7; i++) {
      const dateKey = start.add(i, 'day').format('YYYY-MM-DD');
      grouped[dateKey] = [];
    }

    for (const event of events) {
      const dateKey = dayjs(event.startTime).format('YYYY-MM-DD');
      if (grouped[dateKey]) {
        grouped[dateKey].push(event);
      }
    }

    return grouped;
  }

  async getEventCountByDate(start: string, end: string): Promise<Record<string, number>> {
    return calendarRepository.countByDateRange(start, end);
  }

  // ---------------------------------------------------------------------------
  // Conflict Detection
  // ---------------------------------------------------------------------------

  async checkForConflicts(
    start: string,
    end: string,
    excludeEventId: string | null
  ): Promise<CalendarEvent[]> {
    if (excludeEventId) {
      return calendarRepository.findByDateRangeExcluding(start, end, excludeEventId);
    }
    return calendarRepository.findByDateRange(start, end);
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validateTimeRange(start: string, end: string): void {
    if (!start || start.trim().length === 0) {
      throw new Error('Start time is required');
    }
    if (!end || end.trim().length === 0) {
      throw new Error('End time is required');
    }

    const startDay = dayjs(start);
    const endDay = dayjs(end);

    if (!startDay.isValid()) {
      throw new Error('Invalid start time');
    }
    if (!endDay.isValid()) {
      throw new Error('Invalid end time');
    }
    if (!endDay.isAfter(startDay)) {
      throw new Error('End time must be after start time');
    }
  }

  // ---------------------------------------------------------------------------
  // Reminder Management
  // ---------------------------------------------------------------------------

  async createReminder(eventId: string, remindAt: string): Promise<Reminder> {
    const event = await calendarRepository.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const reminder: Reminder = {
      id: generateId(),
      eventId,
      remindAt,
      status: ReminderStatus.PENDING,
    };

    return reminderRepository.save(reminder);
  }

  async createReminderBeforeEvent(eventId: string, minutesBefore: number): Promise<Reminder> {
    const event = await calendarRepository.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const remindAt = dayjs(event.startTime).subtract(minutesBefore, 'minute').toISOString();

    return this.createReminder(eventId, remindAt);
  }

  async getReminders(eventId: string): Promise<Reminder[]> {
    return reminderRepository.findByEventId(eventId);
  }

  async cancelReminders(eventId: string): Promise<void> {
    await reminderRepository.cancelPendingByEventId(eventId);
  }

  async processPendingReminders(): Promise<Reminder[]> {
    const now = dayjs().toISOString();
    const due = await reminderRepository.findDueReminders(now);

    for (const reminder of due) {
      await reminderRepository.updateStatus(reminder.id, ReminderStatus.SENT);
    }

    return due;
  }
}

export const calendarService = new CalendarService();
