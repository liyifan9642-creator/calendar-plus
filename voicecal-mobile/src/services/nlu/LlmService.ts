import axios from 'axios';
import { AppConfig } from '../../config/AppConfig';
import { MessageMode } from '../../models/enums';

export interface IntentResult {
  intent: MessageMode;
  confidence: number;
  entities: Record<string, string>;
  isComplete: boolean;
  missingFields: string[];
  message: string;
}

export interface CompletenessResult {
  isComplete: boolean;
  missingFields: string[];
  suggestions: string;
}

export interface ConflictResult {
  action: 'CREATE_NEW' | 'REPLACE' | 'MODIFY';
  targetEventId: string;
  needClarification: boolean;
  clarificationQuestion: string;
}

// ======================== Prompt Templates ========================

const INTENT_RECOGNITION_PROMPT = `你是一个日历助手意图识别模块。分析用户输入，只返回 JSON 对象，不要返回其他内容。

返回格式：
{"intent":"CREATE","confidence":0.95,"entities":{"title":"meeting","date":"2026-06-01","startTime":"15:00","endTime":"17:00"},"isComplete":true,"missingFields":[],"message":""}

规则：
1. intent 必须是以下之一：CREATE, DELETE, UPDATE, QUERY
2. isComplete 表示信息是否完整（需要具体时间和事件内容）
3. missingFields 列出缺失字段（可能的值：title, date, startTime, endTime）
4. 如果用户说'取消'、'删除'、'去掉'，intent 为 DELETE
5. 如果用户说'改'、'修改'、'推迟'，intent 为 UPDATE
6. 如果用户问'什么'、'什么时候'、'行程'、'安排'，intent 为 QUERY
7. 如果用户说'创建'、'添加'、'安排一个会议'，intent 为 CREATE
8. confidence 是 0.0-1.0 的浮点数
9. 对于 QUERY 意图，如果有日期信息则 isComplete 为 true
10. 周范围查询处理：当用户提到'本周'、'这周'、'这一周'、'本周行程'等周范围查询时，
    在 entities 中返回 weekStart 字段（本周一的日期，格式 YYYY-MM-DD），不要返回 date 字段
11. 只返回 JSON 对象，不要返回其他内容`;

const COMPLETENESS_CHECK_PROMPT = `检查日历事件信息是否完整。只返回 JSON 对象，不要返回其他内容。

完整性要求：
1. 必须有具体日期（YYYY-MM-DD 格式）
2. 必须有具体时间（HH:mm 格式）或时间范围（startTime-endTime）
3. 必须有事件内容/标题

返回格式：
{"isComplete":true,"missingFields":[],"suggestions":""}

重要：suggestions 字段必须使用中文提示用户补充缺失信息。`;

const CONFLICT_RESOLUTION_PROMPT = `用户想创建一个新事件，但与已有事件冲突。判断用户的真实意图。只返回 JSON 对象，不要返回其他内容。

可能的情况：
1. 用户想添加新事件（与已有事件共存）- action: CREATE_NEW
2. 用户想用新事件替换已有事件 - action: REPLACE
3. 用户想修改已有事件的时间 - action: MODIFY

返回格式：
{"action":"CREATE_NEW","targetEventId":"","needClarification":false,"clarificationQuestion":""}

重要：clarificationQuestion 字段必须使用中文提问。`;

// ======================== LlmService ========================

export class LlmService {
  private get baseUrl(): string {
    return AppConfig.llm.baseUrl;
  }

  private get apiKey(): string {
    return AppConfig.llm.apiKey;
  }

  private get model(): string {
    return AppConfig.llm.model;
  }

  private get temperature(): number {
    return AppConfig.llm.temperature;
  }

  private get maxTokens(): number {
    return AppConfig.llm.maxTokens;
  }

  /**
   * Call the LLM API (OpenAI-compatible / DeepSeek).
   * Returns the content string from the first choice, or empty string on failure.
   */
  async callLlm(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/chat/completions`;
      const body = {
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      };

      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 30000,
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (typeof content === 'string') {
        return content;
      }

      console.warn('LLM response format unexpected:', response.data);
      return '';
    } catch (error: any) {
      console.error('LLM call failed:', error?.message ?? error);
      return '';
    }
  }

  /**
   * Strip markdown code fences (```json ... ``` or ``` ... ```) then parse JSON.
   */
  parseJsonResponse(response: string): Record<string, any> {
    let jsonStr = response.trim();

    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.substring(3);
    }

    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }

    jsonStr = jsonStr.trim();
    return JSON.parse(jsonStr);
  }

  /**
   * Recognize user intent via LLM.
   * Maps the intent string to MessageMode enum.
   * Returns a default QUERY result with confidence 0.0 on failure.
   */
  async recognizeIntent(userInput: string, currentTime?: Date): Promise<IntentResult> {
    try {
      const now = currentTime ?? new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
        `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const userMessage = `User input: ${userInput}\nCurrent time: ${timeStr}`;

      const response = await this.callLlm(INTENT_RECOGNITION_PROMPT, userMessage);
      console.log('LLM intent recognition response:', response);

      if (!response || response.trim() === '') {
        console.warn('LLM returned empty response for intent recognition');
        return {
          intent: MessageMode.QUERY,
          confidence: 0.0,
          entities: {},
          isComplete: false,
          missingFields: ['title', 'date', 'startTime'],
          message: 'LLM returned empty response',
        };
      }

      const result = this.parseJsonResponse(response);

      // Map intent string to MessageMode
      const intentStr = String(result.intent ?? 'QUERY').toUpperCase();
      let intent: MessageMode;
      if (Object.values(MessageMode).includes(intentStr as MessageMode)) {
        intent = intentStr as MessageMode;
      } else {
        console.warn(`Unknown intent "${intentStr}", defaulting to QUERY`);
        intent = MessageMode.QUERY;
      }

      const confidence = typeof result.confidence === 'number' ? result.confidence : 0.8;
      const entities: Record<string, string> =
        result.entities && typeof result.entities === 'object' ? result.entities : {};
      const isComplete = result.isComplete === true;
      const missingFields: string[] =
        Array.isArray(result.missingFields) ? result.missingFields : [];
      const message = typeof result.message === 'string' ? result.message : '';

      return { intent, confidence, entities, isComplete, missingFields, message };
    } catch (error: any) {
      console.error('Intent recognition failed:', error?.message ?? error);
      return {
        intent: MessageMode.QUERY,
        confidence: 0.0,
        entities: {},
        isComplete: false,
        missingFields: ['title', 'date', 'startTime'],
        message: 'Unable to recognize intent, please try again',
      };
    }
  }

  /**
   * Check whether collected event entities are complete enough to create an event.
   */
  async checkCompleteness(entities: Record<string, string>): Promise<CompletenessResult> {
    try {
      const userMessage = `Event information: ${JSON.stringify(entities)}`;

      const response = await this.callLlm(COMPLETENESS_CHECK_PROMPT, userMessage);
      console.log('LLM completeness check response:', response);

      if (!response || response.trim() === '') {
        return {
          isComplete: false,
          missingFields: ['title', 'date', 'startTime'],
          suggestions: 'Unable to check completeness, please provide complete information',
        };
      }

      const result = this.parseJsonResponse(response);

      const isComplete = result.isComplete === true;
      const missingFields: string[] =
        Array.isArray(result.missingFields) ? result.missingFields : [];
      const suggestions = typeof result.suggestions === 'string' ? result.suggestions : '';

      return { isComplete, missingFields, suggestions };
    } catch (error: any) {
      console.error('Completeness check failed:', error?.message ?? error);
      return {
        isComplete: false,
        missingFields: ['title', 'date', 'startTime'],
        suggestions: 'Unable to check completeness, please provide complete information',
      };
    }
  }

  /**
   * Resolve scheduling conflicts between a new event and existing events.
   */
  async resolveConflict(
    userInput: string,
    newEvent: { title: string; startTime: string; endTime: string },
    existingEvents: Array<{ id: string; title: string; startTime: string; endTime: string }>
  ): Promise<ConflictResult> {
    try {
      let existingEventsStr = '';
      for (let i = 0; i < existingEvents.length; i++) {
        const e = existingEvents[i];
        existingEventsStr += `\n${i + 1}. ID: ${e.id}, Title: ${e.title}, Time: ${e.startTime} - ${e.endTime}`;
      }

      const userMessage =
        `New event: title=${newEvent.title}, time=${newEvent.startTime} - ${newEvent.endTime}` +
        `\nExisting events:${existingEventsStr}` +
        `\nUser input: ${userInput}`;

      const response = await this.callLlm(CONFLICT_RESOLUTION_PROMPT, userMessage);
      console.log('LLM conflict resolution response:', response);

      if (!response || response.trim() === '') {
        return {
          action: 'CREATE_NEW',
          targetEventId: '',
          needClarification: true,
          clarificationQuestion: '检测到时间冲突，请问您想如何处理？',
        };
      }

      const result = this.parseJsonResponse(response);

      const validActions = ['CREATE_NEW', 'REPLACE', 'MODIFY'];
      const action = validActions.includes(result.action) ? result.action : 'CREATE_NEW';
      const targetEventId = typeof result.targetEventId === 'string' ? result.targetEventId : '';
      const needClarification = result.needClarification === true;
      const clarificationQuestion =
        typeof result.clarificationQuestion === 'string' ? result.clarificationQuestion : '';

      return {
        action: action as ConflictResult['action'],
        targetEventId,
        needClarification,
        clarificationQuestion,
      };
    } catch (error: any) {
      console.error('Conflict resolution failed:', error?.message ?? error);
      return {
        action: 'CREATE_NEW',
        targetEventId: '',
        needClarification: true,
        clarificationQuestion: '检测到时间冲突，请问您想如何处理？',
      };
    }
  }
}

// Export singleton instance
export const llmService = new LlmService();
