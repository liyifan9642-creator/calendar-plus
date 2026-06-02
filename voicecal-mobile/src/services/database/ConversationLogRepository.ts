import { ConversationLog } from '../../models';
import { databaseService } from './DatabaseService';

const COLS = [
  'id', 'session_id', 'user_id', 'input_type', 'user_input',
  'system_response', 'message_json', 'intent', 'confidence',
  'processing_time_ms', 'created_at',
];

function toRow(log: ConversationLog): Record<string, unknown> {
  return {
    id: log.id,
    session_id: log.sessionId,
    user_id: log.userId ?? null,
    input_type: log.inputType,
    user_input: log.userInput,
    system_response: log.systemResponse,
    message_json: log.messageJson ?? null,
    intent: log.intent ?? null,
    confidence: log.confidence ?? null,
    processing_time_ms: log.processingTimeMs ?? null,
    created_at: log.createdAt,
  };
}

function fromRow(row: Record<string, unknown>): ConversationLog {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    userId: (row.user_id as string) || '',
    inputType: row.input_type as 'VOICE' | 'TEXT',
    userInput: row.user_input as string,
    systemResponse: row.system_response as string,
    messageJson: row.message_json as string | undefined,
    intent: row.intent as string | undefined,
    confidence: row.confidence as number | undefined,
    processingTimeMs: row.processing_time_ms as number | undefined,
    createdAt: row.created_at as string,
  };
}

export class ConversationLogRepository {
  async save(log: ConversationLog): Promise<ConversationLog> {
    const db = await databaseService.getDatabase();
    const r = toRow(log);
    await db.runAsync(
      `INSERT OR REPLACE INTO conversation_log (${COLS.join(', ')}) VALUES (${COLS.map(() => '?').join(', ')})`,
      COLS.map((c) => r[c]) as (string | number | null)[]
    );
    return log;
  }

  async findBySessionId(sessionId: string, limit?: number, offset?: number): Promise<ConversationLog[]> {
    const db = await databaseService.getDatabase();
    let sql = `SELECT ${COLS.join(', ')} FROM conversation_log WHERE session_id = ? ORDER BY created_at ASC`;
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

  async countBySessionId(sessionId: string): Promise<number> {
    const db = await databaseService.getDatabase();
    const row = await db.getFirstAsync(
      'SELECT COUNT(*) AS count FROM conversation_log WHERE session_id = ?',
      [sessionId]
    );
    return (row as Record<string, unknown>).count as number;
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    const db = await databaseService.getDatabase();
    await db.runAsync('DELETE FROM conversation_log WHERE session_id = ?', [sessionId]);
  }
}

export const conversationLogRepository = new ConversationLogRepository();
