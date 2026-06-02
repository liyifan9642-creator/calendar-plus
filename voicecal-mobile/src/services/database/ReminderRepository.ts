import { Reminder, ReminderStatus } from '../../models';
import { databaseService } from './DatabaseService';

const COLS = ['id', 'event_id', 'remind_at', 'status'];

function toRow(r: Reminder): Record<string, unknown> {
  return {
    id: r.id,
    event_id: r.eventId,
    remind_at: r.remindAt,
    status: r.status,
  };
}

function fromRow(row: Record<string, unknown>): Reminder {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    remindAt: row.remind_at as string,
    status: row.status as ReminderStatus,
  };
}

export class ReminderRepository {
  async save(reminder: Reminder): Promise<Reminder> {
    const db = await databaseService.getDatabase();
    const r = toRow(reminder);
    await db.runAsync(
      `INSERT OR REPLACE INTO reminders (${COLS.join(', ')}) VALUES (${COLS.map(() => '?').join(', ')})`,
      COLS.map((c) => r[c]) as (string | number | null)[]
    );
    return reminder;
  }

  async findDueReminders(now: string): Promise<Reminder[]> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT ${COLS.join(', ')} FROM reminders WHERE status = ? AND remind_at <= ? ORDER BY remind_at ASC`,
      [ReminderStatus.PENDING, now]
    );
    return (rows as Record<string, unknown>[]).map(fromRow);
  }

  async findByEventId(eventId: string): Promise<Reminder[]> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT ${COLS.join(', ')} FROM reminders WHERE event_id = ? ORDER BY remind_at ASC`,
      [eventId]
    );
    return (rows as Record<string, unknown>[]).map(fromRow);
  }

  async updateStatus(id: string, status: ReminderStatus): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('UPDATE reminders SET status = ? WHERE id = ?', [status, id]);
  }

  async deleteByEventId(eventId: string): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('DELETE FROM reminders WHERE event_id = ?', [eventId]);
  }

  async cancelPendingByEventId(eventId: string): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync(
      "UPDATE reminders SET status = ? WHERE event_id = ? AND status = 'PENDING'",
      [ReminderStatus.CANCELLED, eventId]
    );
  }
}

export const reminderRepository = new ReminderRepository();
