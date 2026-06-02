import { Intent, MessageMode } from '../../models/enums';
import { VoiceCommand } from '../../models';
import { TimeParserService } from './TimeParserService';
import { llmService, IntentResult } from './LlmService';
import { generateId } from '../../utils/uuid';
import dayjs from 'dayjs';

/**
 * Local NLU service that combines TimeParserService and LlmService
 * for intent recognition. Provides a fast local fallback when LLM
 * is unavailable.
 */
export class NluService {
  /**
   * Process text input: extract entities via TimeParserService, then call
   * LlmService for intent recognition. Build a VoiceCommand from the results.
   */
  async processText(text: string): Promise<VoiceCommand> {
    const entities = this.extractEntities(text);

    let intentResult: IntentResult;
    try {
      intentResult = await llmService.recognizeIntent(text);
    } catch {
      // Fallback to local keyword-based recognition when LLM is unavailable
      const localIntent = this.localIntentRecognition(text);
      intentResult = {
        intent: this.mapIntentToMessageMode(localIntent),
        confidence: 0.5,
        entities,
        isComplete: false,
        missingFields: [],
        message: 'Used local intent recognition fallback',
      };
    }

    // Merge time-parser entities into the LLM entities (LLM takes precedence)
    const mergedEntities: Record<string, string> = { ...entities, ...intentResult.entities };

    const command: VoiceCommand = {
      id: generateId(),
      rawText: text,
      intent: this.mapMessageModeToIntent(intentResult.intent),
      entities: mergedEntities,
      confidence: intentResult.confidence,
      timestamp: dayjs().toISOString(),
    };

    return command;
  }

  /**
   * Extract time entities using TimeParserService.parse().
   */
  extractEntities(text: string): Record<string, string> {
    const result = TimeParserService.parse(text);
    const entities: Record<string, string> = {};

    if (result.date) {
      entities.date = result.date;
    }
    if (result.time) {
      entities.time = result.time;
    }
    if (result.dateTime) {
      entities.dateTime = result.dateTime;
    }

    return entities;
  }

  /**
   * Fast local keyword-based intent recognition as fallback.
   * Checks for Chinese keywords to determine intent.
   */
  localIntentRecognition(text: string): Intent {
    const createKeywords = ['创建', '添加', '安排', '新建', '加个', '设个'];
    const deleteKeywords = ['删除', '取消', '去掉', '移除', '删掉'];
    const updateKeywords = ['改', '修改', '推迟', '变更', '调整', '改一下'];
    const listKeywords = ['什么', '什么时候', '行程', '安排', '有哪些', '看看', '查看', '查一下'];

    for (const keyword of createKeywords) {
      if (text.includes(keyword)) return Intent.CREATE_EVENT;
    }
    for (const keyword of deleteKeywords) {
      if (text.includes(keyword)) return Intent.DELETE_EVENT;
    }
    for (const keyword of updateKeywords) {
      if (text.includes(keyword)) return Intent.UPDATE_EVENT;
    }
    for (const keyword of listKeywords) {
      if (text.includes(keyword)) return Intent.LIST_EVENTS;
    }

    return Intent.UNKNOWN;
  }

  /**
   * Map Intent enum to MessageMode enum.
   */
  private mapIntentToMessageMode(intent: Intent): MessageMode {
    switch (intent) {
      case Intent.CREATE_EVENT:
        return MessageMode.CREATE;
      case Intent.DELETE_EVENT:
        return MessageMode.DELETE;
      case Intent.UPDATE_EVENT:
        return MessageMode.UPDATE;
      case Intent.LIST_EVENTS:
      case Intent.SEARCH_EVENTS:
        return MessageMode.QUERY;
      default:
        return MessageMode.QUERY;
    }
  }

  /**
   * Map MessageMode enum to Intent enum.
   */
  private mapMessageModeToIntent(mode: MessageMode): Intent {
    switch (mode) {
      case MessageMode.CREATE:
        return Intent.CREATE_EVENT;
      case MessageMode.DELETE:
        return Intent.DELETE_EVENT;
      case MessageMode.UPDATE:
        return Intent.UPDATE_EVENT;
      case MessageMode.QUERY:
        return Intent.LIST_EVENTS;
      default:
        return Intent.UNKNOWN;
    }
  }
}

export const nluService = new NluService();
