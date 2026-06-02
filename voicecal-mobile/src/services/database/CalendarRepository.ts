import { CalendarEvent } from '../../models';
import { EventStatus } from '../../models';
import { databaseService } from './DatabaseService';

// Column order matches the calendar_events table schema
const COLS = [
  'id', 'title', 'description', 'start_time', 'end_time',
  'location', 'repeat_rule_id', 'status', 'created_at', 'updated_at',
];

function toRow(e: CalendarEvent): Record<string, unknown> {
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? null,
    start_time: e.startTime,
    end_time: e.endTime,
    location: e.location ?? null,
    repeat_rule_id: e.repeatRuleId ?? null,
    status: e.status,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

function fromRow(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    location: row.location as string | undefined,
    repeatRuleId: row.repeat_rule_id as string | undefined,
    status: row.status as EventStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export class CalendarRepository {
  async findAll(): Promise<CalendarEvent[]> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync(`SELECT ${COLS.join(', ')} FROM calendar_events ORDER BY start_time ASC`);
    return (rows as Record<string, unknown>[]).map(fromRow);
  }

  async findById(id: string): Promise<CalendarEvent | null> {
    const db = await databaseService.getDatabase();
    const row = await db.getFirstAsync(
      `SELECT ${COLS.join(', ')} FROM calendar_events WHERE id = ?`,
      [id]
    );
    return row ? fromRow(row as Record<string, unknown>) : null;
  }

  async findByDateRange(start: string, end: string): Promise<CalendarEvent[]> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT ${COLS.join(', ')} FROM calendar_events WHERE start_time < ? AND end_time > ? ORDER BY start_time ASC`,
      [end, start]
    );
    return (rows as Record<string, unknown>[]).map(fromRow);
  }

  async findByDateRangeExcluding(start: string, end: string, excludeId: string): Promise<CalendarEvent[]> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT ${COLS.join(', ')} FROM calendar_events WHERE start_time < ? AND end_time > ? AND id != ? ORDER BY start_time ASC`,
      [end, start, excludeId]
    );
    return (rows as Record<string, unknown>[]).map(fromRow);
  }

  async search(query: string): Promise<CalendarEvent[]> {
    const db = await databaseService.getDatabase();
    const pattern = `%${query}%`;
    const rows = await db.getAllAsync(
      `SELECT ${COLS.join(', ')} FROM calendar_events WHERE title LIKE ? OR description LIKE ? OR location LIKE ? ORDER BY start_time ASC`,
      [pattern, pattern, pattern]
    );
    return (rows as Record<string, unknown>[]).map(fromRow);
  }

  async save(event: CalendarEvent): Promise<CalendarEvent> {
    const db = await databaseService.getDatabase();
    const r = toRow(event);
    await db.runAsync(
      `INSERT OR REPLACE INTO calendar_events (${COLS.join(', ')}) VALUES (${COLS.map(() => '?').join(', ')})`,
      COLS.map((c) => r[c]) as (string | number | null)[]
    );
    return event;
  }

  async delete(id: string): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('DELETE FROM calendar_events WHERE id = ?', [id]);
  }

  async deleteAll(): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('DELETE FROM calendar_events');
  }

  async countByDateRange(start: string, end: string): Promise<Record<string, number>> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT SUBSTR(start_time, 1, 10) AS date, COUNT(*) AS count FROM calendar_events WHERE start_time < ? AND end_time > ? GROUP BY SUBSTR(start_time, 1, 10)`,
      [end, start]
    );
    const result: Record<string, number> = {};
    for (const row of rows as Record<string, unknown>[]) {
      result[row.date as string] = row.count as number;
    }
    return result;
  }
}

export const calendarRepository = new CalendarRepository();
