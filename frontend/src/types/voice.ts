// Voice related types

export type VoiceState = 'idle' | 'listening' | 'processing' | 'responding';

// Intent 类型（对应设计文档的 mode）
export type Intent =
  | 'CREATE'
  | 'DELETE'
  | 'UPDATE'
  | 'QUERY'
  | 'UNKNOWN';

/**
 * Message - core data structure for voice calendar operations.
 * Represents a parsed user intent with mode, status, and content.
 */
export interface Message {
  id: string;
  mode: 'CREATE' | 'DELETE' | 'UPDATE' | 'QUERY';
  status: 'PENDING' | 'CONFIRMED' | 'EXECUTED' | 'FAILED' | 'NEED_CLARIFICATION';
  content: MessageContent;
  targetEventId?: string;
  conflicts?: CalendarEvent[];
  clarificationQuestion?: string;
  llmResponse?: LlmResponse;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message content - calendar event details extracted from user input.
 */
export interface MessageContent {
  title: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  location?: string;
  description?: string;
}

/**
 * LLM raw response information.
 */
export interface LlmResponse {
  intent: string;
  confidence: number;
  rawResponse: string;
}

/**
 * Request for the unified /api/voice/process endpoint.
 */
export interface ProcessRequest {
  inputType: 'VOICE' | 'TEXT';
  text?: string;
  audio?: string;       // Base64 encoded
  sessionId?: string;
  language?: string;
}

/**
 * Response from /api/voice/process and /api/voice/confirm endpoints.
 */
export interface ProcessResponse {
  success: boolean;
  message: Message;
  responseText: string;
  options?: ClarificationOption[];
  error?: ErrorInfo;
}

/**
 * Error information in API responses.
 */
export interface ErrorInfo {
  code: string;
  message: string;
}

/**
 * Clarification option presented to user when disambiguation is needed.
 */
export interface ClarificationOption {
  id: string;
  label: string;
  value: string;
}

/**
 * Request for the /api/voice/confirm endpoint.
 */
export interface ConfirmRequest {
  messageId: string;
  action: 'CONFIRM' | 'CANCEL' | 'SELECT_OPTION';
  optionId?: string;
  additionalText?: string;
}

/**
 * Confirm response.
 */
export interface ConfirmResponse {
  success: boolean;
  message: Message;
  responseText: string;
}

/**
 * Conversation history response.
 */
export interface HistoryResponse {
  total: number;
  items: ConversationItem[];
}

/**
 * A single conversation history item.
 */
export interface ConversationItem {
  id: string;
  timestamp: string;
  userInput: string;
  systemResponse: string;
  message?: Message;
  // 兼容旧字段
  intent?: Intent;
  success?: boolean;
}

/**
 * OrchestratorResponse - 兼容旧接口
 */
export interface OrchestratorResponse {
  responseId?: string;
  sessionId?: string;
  intent?: Intent;
  entities?: Record<string, string>;
  responseText: string;
  affectedEvents?: CalendarEvent[];
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata?: ProcessingMetadata;
  timestamp?: string;
  requiresConfirmation?: boolean;
  // 新增字段
  message?: Message;
  options?: ClarificationOption[];
}

/**
 * Processing metadata.
 */
export interface ProcessingMetadata {
  asrDurationMs?: number;
  timeParseDurationMs?: number;
  nluDurationMs?: number;
  calendarDurationMs?: number;
  totalDurationMs?: number;
  retryCount?: number;
  asrConfidence?: number;
  nluConfidence?: number;
}

export interface SessionState {
  sessionId: string;
  state: string;
  turnNumber: number;
  language: string;
  hasPendingConfirmation: boolean;
  contextEntities: Record<string, string>;
}

export interface HealthStatus {
  status: string;
  activeSessions: number;
}

// Voice settings
export interface VoiceSettings {
  language: 'zh-CN' | 'en-US';
  speechRate: number;   // 0.5 - 2.0
  volume: number;       // 0 - 1
}

// Voice help command
export interface VoiceCommand {
  command: string;
  description: string;
  examples: string[];
  intent: Intent;
}

// Import CalendarEvent type
import { CalendarEvent } from './calendar';
