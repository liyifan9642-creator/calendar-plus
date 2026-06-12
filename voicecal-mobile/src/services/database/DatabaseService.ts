import * as SQLite from 'expo-sqlite';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;

    // Guard against concurrent initialization
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const db = await SQLite.openDatabaseAsync('voicecal.db');
        await this.initTables(db);
        this.db = db;
        return db;
      })();
    }

    return this.initPromise;
  }

  private async initTables(db: SQLite.SQLiteDatabase): Promise<void> {

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT,
        repeat_rule_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT,
        date TEXT,
        week_start_date TEXT,
        start_time TEXT,
        end_time TEXT,
        location TEXT,
        description TEXT,
        target_event_id TEXT,
        conflicts_json TEXT,
        clarification_question TEXT,
        llm_response_json TEXT,
        session_id TEXT,
        user_id TEXT,
        user_input TEXT NOT NULL,
        response_text TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversation_log (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id TEXT,
        input_type TEXT NOT NULL,
        user_input TEXT NOT NULL,
        system_response TEXT NOT NULL,
        message_json TEXT,
        intent TEXT,
        confidence REAL,
        processing_time_ms INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        remind_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING'
      );

      CREATE TABLE IF NOT EXISTS repeat_rules (
        id TEXT PRIMARY KEY,
        frequency TEXT NOT NULL,
        interval INTEGER DEFAULT 1,
        days_of_week TEXT,
        end_date TEXT,
        max_occurrences INTEGER
      );
    `);
  }
}

export const databaseService = new DatabaseService();
