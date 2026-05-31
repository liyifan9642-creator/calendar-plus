-- 语音日历工具 - 数据库表结构
-- 数据库：H2 (开发) / MySQL (生产)

-- ==================== 日历事件表 ====================
CREATE TABLE IF NOT EXISTS calendar_events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location VARCHAR(500),
    status VARCHAR(20) DEFAULT 'ACTIVE',  -- ACTIVE, CANCELLED, COMPLETED
    repeat_rule_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON calendar_events(status);

-- ==================== 提醒表 ====================
CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    remind_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, SENT, CANCELLED
    FOREIGN KEY (event_id) REFERENCES calendar_events(id)
);

CREATE INDEX IF NOT EXISTS idx_reminders_event_id ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);

-- ==================== 重复规则表 ====================
CREATE TABLE IF NOT EXISTS repeat_rules (
    id VARCHAR(36) PRIMARY KEY,
    frequency VARCHAR(20) NOT NULL,  -- DAILY, WEEKLY, MONTHLY, YEARLY
    interval_count INT DEFAULT 1,
    days_of_week VARCHAR(20),        -- 1,2,3,4,5,6,7
    end_date DATE,
    max_occurrences INT
);

-- ==================== Message 消息表 ====================
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),

    -- 模式和状态
    mode VARCHAR(20) NOT NULL,           -- CREATE, DELETE, UPDATE, QUERY
    status VARCHAR(30) NOT NULL,         -- PENDING, CONFIRMED, EXECUTED, FAILED, NEED_CLARIFICATION

    -- 事件内容
    title VARCHAR(200),
    event_date DATE,
    start_time TIME,
    end_time TIME,
    location VARCHAR(500),
    description TEXT,

    -- 目标事件ID（用于更新/删除）
    target_event_id VARCHAR(36),

    -- 冲突信息（JSON格式）
    conflicts_json TEXT,

    -- 澄清问题
    clarification_question VARCHAR(1000),

    -- LLM 响应（JSON格式）
    llm_response_json TEXT,

    -- 用户输入和系统响应
    user_input TEXT,
    response_text TEXT,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_mode ON messages(mode);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ==================== 对话历史表 ====================
CREATE TABLE IF NOT EXISTS conversation_log (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),

    -- 用户输入
    input_type VARCHAR(10) NOT NULL,    -- VOICE, TEXT
    user_input TEXT NOT NULL,

    -- 系统响应
    system_response TEXT,
    message_json TEXT,                   -- Message JSON

    -- 元数据
    intent VARCHAR(20),
    confidence DECIMAL(3,2),
    processing_time_ms INT,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_session_id ON conversation_log(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON conversation_log(created_at);

-- ==================== 语音会话表 ====================
CREATE TABLE IF NOT EXISTS voice_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),

    -- 会话状态
    state VARCHAR(20) DEFAULT 'ACTIVE',  -- ACTIVE, COMPLETED, EXPIRED

    -- 上下文信息（JSON格式）
    context_json TEXT,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_state ON voice_sessions(state);
