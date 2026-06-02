import { Message, MessageStatus, MessageMode } from '../../models';
import { databaseService } from './DatabaseService';

const COLS = [
  'id', 'mode', 'status', 'title', 'date', 'week_start_date',
  'start_time', 'end_time', 'location', 'description',
  'target_event_id', 'conflicts_json', 'clarification_question',
  'llm_response_json', 'session_id', 'user_id', 'user_input',
  'response_text', 'created_at', 'updated_at',
];

function toRow(m: Message): Record<string, unknown> {
  return {
    id: m.id,
    mode: m.mode,
    status: m.status,
    title: m.title ?? null,
    date: m.date ?? null,
    week_start_date: m.weekStartDate ?? null,
    start_time: m.startTime ?? null,
    end_time: m.endTime ?? null,
    location: m.location ?? null,
    description: m.description ?? null,
    target_event_id: m.targetEventId ?? null,
    conflicts_json: m.conflictsJson ?? null,
    clarification_question: m.clarificationQuestion ?? null,
    llm_response_json: m.llmResponseJson ?? null,
    session_id: m.sessionId,
    user_id: m.userId,
    user_input: m.userInput,
    response_text: m.responseText ?? null,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}

function fromRow(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    mode: row.mode as MessageMode,
    status: row.status as MessageStatus,
    title: row.title as string | undefined,
    date: row.date as string | undefined,
    weekStartDate: row.week_start_date as string | undefined,
    startTime: row.start_time as string | undefined,
    endTime: row.end_time as string | undefined,
    location: row.location as string | undefined,
    description: row.description as string | undefined,
    targetEventId: row.target_event_id as string | undefined,
    conflictsJson: row.conflicts_json as string | undefined,
    clarificationQuestion: row.clarification_question as string | undefined,
    llmResponseJson: row.llm_response_json as string | undefined,
    sessionId: row.session_id as string,
    userId: row.user_id as string,
    userInput: row.user_input as string,
    responseText: row.response_text as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export class MessageRepository {
  async save(message: Message): Promise<Message> {
    const db = await databaseService.getDatabase();
    const r = toRow(message);
    await db.runAsync(
      `INSERT OR REPLACE INTO messages (${COLS.join(', ')}) VALUES (${COLS.map(() => '?').join(', ')})`,
      COLS.map((c) => r[c]) as (string | number | null)[]
    );
    return message;
  }

  async findById(id: string): Promise<Message | null> {
    const db = await databaseService.getDatabase();
    const row = await db.getFirstAsync(
      `SELECT ${COLS.join(', ')} FROM messages WHERE id = ?`,
      [id]
    );
    return row ? fromRow(row as Record<string, unknown>) : null;
  }

  async findBySessionId(sessionId: string, limit?: number, offset?: number): Promise<Message[]> {
    const db = await databaseService.getDatabase();
    let sql = `SELECT ${COLS.join(', ')} FROM messages WHERE session_id = ? ORDER BY created_at ASC`;
    const params: (string | number | null)[] = [sessionId];

    if (limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    if (offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(offset);
    }

    const rows = await db.getAllAsync(sql, params);
    return (rows as Record<string, unknown>[]).map(fromRow);
  }

  async findPendingBySessionId(sessionId: string): Promise<Message[]> {
    const db = await databaseService.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT ${COLS.join(', ')} FROM messages WHERE session_id = ? AND status = ? ORDER BY created_at ASC`,
      [sessionId, MessageStatus.PENDING]
    );
    return (rows as Record<string, unknown>[]).map(fromRow);
  }

  async updateStatus(id: string, status: MessageStatus): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync(
      'UPDATE messages SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), id]
    );
  }

  async deleteById(id: string): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
  }

  async countBySessionId(sessionId: string): Promise<number> {
    const db = await databaseService.getDatabase();
    const row = await db.getFirstAsync(
      'SELECT COUNT(*) AS count FROM messages WHERE session_id = ?',
      [sessionId]
    );
    return (row as Record<string, unknown>).count as number;
  }
}

export const messageRepository = new MessageRepository();
