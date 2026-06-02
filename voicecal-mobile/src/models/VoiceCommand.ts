import { Intent } from './enums';

export interface VoiceCommand {
  id: string;
  rawText: string;
  processedText?: string;
  intent: Intent;
  entities: Record<string, string>;
  confidence: number;
  language?: string;
  timestamp: string;
}
