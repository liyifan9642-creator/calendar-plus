export interface ConversationLog {
  id: string;
  sessionId: string;
  userId: string;
  inputType: 'VOICE' | 'TEXT';
  userInput: string;
  systemResponse: string;
  messageJson?: string;
  intent?: string;
  confidence?: number;
  processingTimeMs?: number;
  createdAt: string;
}
