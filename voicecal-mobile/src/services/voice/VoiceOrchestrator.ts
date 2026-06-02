import { Message, CalendarEvent, MessageMode, MessageStatus, Intent } from '../../models';
import { calendarService } from '../calendar';
import { llmService, IntentResult } from '../nlu/LlmService';
import { TimeParserService } from '../nlu/TimeParserService';
import { generateId } from '../../utils/uuid';
import dayjs from 'dayjs';

export interface OrchestratorResponse {
  success: boolean;
  message: Message;
  responseText: string;
  affectedEvents?: CalendarEvent[];
  requiresConfirmation?: boolean;
  error?: string;
}

class VoiceOrchestrator {
  /**
   * Main entry point: 4-step LLM pipeline.
   * ASR (handled externally) -> NLU -> Calendar -> Response
   */
  async processText(
    userInput: string,
    sessionId: string,
    userId: string = 'default'
  ): Promise<OrchestratorResponse> {
    const now = new Date();
    const nowIso = dayjs(now).toISOString();

    // Create initial Message
    const message: Message = {
      id: generateId(),
      mode: MessageMode.QUERY,
      status: MessageStatus.PENDING,
      sessionId,
      userId,
      userInput,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      // ======================== Step 1: Intent Recognition ========================
      const intentResult = await llmService.recognizeIntent(userInput, now);

      // Map intent to MessageMode
      // LlmService.recognizeIntent already returns MessageMode, but handle
      // edge cases where Intent enum values may appear
      message.mode = this.mapIntentToMode(intentResult.intent);

      // Extract entities from intentResult into message fields
      this.populateMessageFromEntities(message, intentResult.entities);

      // Store LLM response for debugging
      message.llmResponseJson = JSON.stringify(intentResult);

      // ======================== Step 2: Completeness Check ========================
      if (message.mode === MessageMode.QUERY) {
        // For QUERY: if weekStartDate or date is present, consider complete.
        // If no date, default to today.
        if (!message.weekStartDate && !message.date) {
          message.date = dayjs().format('YYYY-MM-DD');
        }
      } else {
        // For CREATE/UPDATE/DELETE: check completeness
        if (!intentResult.isComplete) {
          const completenessResult = await llmService.checkCompleteness(
            intentResult.entities
          );

          if (!completenessResult.isComplete) {
            message.status = MessageStatus.NEED_CLARIFICATION;
            message.clarificationQuestion =
              completenessResult.suggestions ||
              this.buildMissingFieldsMessage(completenessResult.missingFields);
            message.updatedAt = dayjs().toISOString();

            return {
              success: true,
              message,
              responseText: message.clarificationQuestion,
              requiresConfirmation: true,
            };
          }
        }
      }

      // ======================== Step 3: Conflict Detection (CREATE only) ========================
      if (message.mode === MessageMode.CREATE && message.date && message.startTime) {
        const startIso = dayjs(`${message.date} ${message.startTime}`).toISOString();
        const endIso = message.endTime
          ? dayjs(`${message.date} ${message.endTime}`).toISOString()
          : dayjs(`${message.date} ${message.startTime}`).add(1, 'hour').toISOString();

        const conflicts = await calendarService.checkForConflicts(startIso, endIso, null);

        if (conflicts.length > 0) {
          const newEvent = {
            title: message.title || '新事件',
            startTime: startIso,
            endTime: endIso,
          };

          const conflictResult = await llmService.resolveConflict(
            userInput,
            newEvent,
            conflicts.map((e) => ({
              id: e.id,
              title: e.title,
              startTime: e.startTime,
              endTime: e.endTime,
            }))
          );

          if (conflictResult.needClarification) {
            message.status = MessageStatus.NEED_CLARIFICATION;
            message.clarificationQuestion = conflictResult.clarificationQuestion;
            message.conflictsJson = JSON.stringify(conflicts);
            message.updatedAt = dayjs().toISOString();

            return {
              success: true,
              message,
              responseText: conflictResult.clarificationQuestion,
              requiresConfirmation: true,
              affectedEvents: conflicts,
            };
          }

          if (conflictResult.action === 'REPLACE') {
            message.targetEventId = conflictResult.targetEventId;
          }
        }
      }

      // ======================== Step 4: Execute Calendar Operation ========================
      message.status = MessageStatus.CONFIRMED;

      const event = await this.executeMessageOperation(message);

      // Generate response text
      const responseText = this.generateResponseText(message, event);
      message.responseText = responseText;
      message.status = MessageStatus.EXECUTED;
      message.updatedAt = dayjs().toISOString();

      return {
        success: true,
        message,
        responseText,
        affectedEvents: event ? [event] : undefined,
      };
    } catch (error: any) {
      console.error('VoiceOrchestrator.processText failed:', error?.message ?? error);
      message.status = MessageStatus.FAILED;
      message.updatedAt = dayjs().toISOString();

      return {
        success: false,
        message,
        responseText: `处理失败：${error?.message ?? '未知错误'}`,
        error: error?.message ?? 'Unknown error',
      };
    }
  }

  /**
   * Execute the calendar operation corresponding to the message mode.
   */
  async executeMessageOperation(message: Message): Promise<CalendarEvent | null> {
    switch (message.mode) {
      case MessageMode.CREATE: {
        if (!message.date || !message.startTime) {
          throw new Error('创建事件需要日期和开始时间');
        }

        const startIso = dayjs(`${message.date} ${message.startTime}`).toISOString();
        const endIso = message.endTime
          ? dayjs(`${message.date} ${message.endTime}`).toISOString()
          : dayjs(`${message.date} ${message.startTime}`).add(1, 'hour').toISOString();

        const newEvent = await calendarService.createEvent({
          title: message.title || '新事件',
          description: message.description,
          startTime: startIso,
          endTime: endIso,
          location: message.location,
          status: 'ACTIVE' as any,
        });

        return newEvent;
      }

      case MessageMode.DELETE: {
        if (!message.targetEventId) {
          throw new Error('删除事件需要目标事件ID');
        }
        await calendarService.deleteEvent(message.targetEventId);
        return null;
      }

      case MessageMode.UPDATE: {
        if (!message.targetEventId) {
          throw new Error('更新事件需要目标事件ID');
        }

        const updates: Partial<CalendarEvent> = {};
        if (message.title) updates.title = message.title;
        if (message.location !== undefined) updates.location = message.location;
        if (message.description !== undefined) updates.description = message.description;

        if (message.date && message.startTime) {
          updates.startTime = dayjs(`${message.date} ${message.startTime}`).toISOString();
          if (message.endTime) {
            updates.endTime = dayjs(`${message.date} ${message.endTime}`).toISOString();
          }
        }

        const updated = await calendarService.updateEvent(message.targetEventId, updates);
        return updated;
      }

      case MessageMode.QUERY:
        // QUERY is a no-op for calendar operations
        return null;

      default:
        return null;
    }
  }

  /**
   * Generate natural language response text based on the operation result.
   */
  generateResponseText(message: Message, event?: CalendarEvent | null): string {
    if (message.status === MessageStatus.NEED_CLARIFICATION) {
      return message.clarificationQuestion || '请补充更多信息。';
    }

    switch (message.mode) {
      case MessageMode.CREATE: {
        if (event) {
          const dateDisplay = dayjs(event.startTime).format('YYYY年M月D日');
          const startDisplay = dayjs(event.startTime).format('HH:mm');
          const endDisplay = dayjs(event.endTime).format('HH:mm');
          return `已创建事件「${event.title}」，时间：${dateDisplay} ${startDisplay}-${endDisplay}`;
        }
        return '已创建事件';
      }

      case MessageMode.DELETE:
        return '已删除事件';

      case MessageMode.UPDATE: {
        if (message.title) {
          return `已更新事件「${message.title}」`;
        }
        return '已更新事件';
      }

      case MessageMode.QUERY: {
        // For QUERY, response is generated by the caller with actual search results.
        // Provide a fallback here.
        return '查询完成';
      }

      default:
        return '好的，已处理您的请求。';
    }
  }

  /**
   * Confirm a pending or clarification-needed message and execute it.
   */
  async confirmMessage(
    messageId: string,
    messages: Message[]
  ): Promise<OrchestratorResponse> {
    const message = messages.find((m) => m.id === messageId);

    if (!message) {
      return {
        success: false,
        message: {
          id: messageId,
          mode: MessageMode.QUERY,
          status: MessageStatus.FAILED,
          sessionId: '',
          userId: '',
          userInput: '',
          createdAt: '',
          updatedAt: '',
        },
        responseText: '未找到该消息',
        error: 'Message not found',
      };
    }

    if (message.status !== MessageStatus.NEED_CLARIFICATION) {
      return {
        success: false,
        message,
        responseText: '该消息当前状态无法确认',
        error: `Cannot confirm message with status: ${message.status}`,
      };
    }

    try {
      message.status = MessageStatus.CONFIRMED;
      const event = await this.executeMessageOperation(message);

      const responseText = this.generateResponseText(message, event);
      message.responseText = responseText;
      message.status = MessageStatus.EXECUTED;
      message.updatedAt = dayjs().toISOString();

      return {
        success: true,
        message,
        responseText,
        affectedEvents: event ? [event] : undefined,
      };
    } catch (error: any) {
      console.error('confirmMessage failed:', error?.message ?? error);
      message.status = MessageStatus.FAILED;
      message.updatedAt = dayjs().toISOString();

      return {
        success: false,
        message,
        responseText: `确认失败：${error?.message ?? '未知错误'}`,
        error: error?.message ?? 'Unknown error',
      };
    }
  }

  /**
   * Cancel a pending message.
   */
  cancelMessage(messageId: string, messages: Message[]): OrchestratorResponse {
    const message = messages.find((m) => m.id === messageId);

    if (!message) {
      return {
        success: false,
        message: {
          id: messageId,
          mode: MessageMode.QUERY,
          status: MessageStatus.FAILED,
          sessionId: '',
          userId: '',
          userInput: '',
          createdAt: '',
          updatedAt: '',
        },
        responseText: '未找到该消息',
        error: 'Message not found',
      };
    }

    message.status = MessageStatus.FAILED;
    message.updatedAt = dayjs().toISOString();

    return {
      success: true,
      message,
      responseText: '操作已取消',
    };
  }

  /**
   * Generate a new session ID.
   */
  createSession(): string {
    return generateId();
  }

  // ======================== Private Helpers ========================

  /**
   * Map Intent enum values to MessageMode.
   * LlmService.recognizeIntent already returns MessageMode, but we also
   * handle the full Intent enum for robustness.
   */
  private mapIntentToMode(intent: MessageMode | Intent): MessageMode {
    switch (intent) {
      case Intent.CREATE_EVENT:
      case Intent.SET_REMINDER:
      case MessageMode.CREATE:
        return MessageMode.CREATE;

      case Intent.DELETE_EVENT:
      case Intent.CANCEL_REMINDER:
      case MessageMode.DELETE:
        return MessageMode.DELETE;

      case Intent.UPDATE_EVENT:
      case MessageMode.UPDATE:
        return MessageMode.UPDATE;

      case Intent.LIST_EVENTS:
      case Intent.SEARCH_EVENTS:
      case Intent.CHECK_AVAILABILITY:
      case MessageMode.QUERY:
        return MessageMode.QUERY;

      default:
        return MessageMode.QUERY;
    }
  }

  /**
   * Extract entities from the LLM intent result into message fields.
   */
  private populateMessageFromEntities(
    message: Message,
    entities: Record<string, string>
  ): void {
    if (entities.title) {
      message.title = entities.title;
    }
    if (entities.date) {
      message.date = entities.date;
    }
    if (entities.weekStart) {
      message.weekStartDate = entities.weekStart;
    }
    if (entities.startTime) {
      message.startTime = entities.startTime;
    }
    if (entities.endTime) {
      message.endTime = entities.endTime;
    }
    if (entities.location) {
      message.location = entities.location;
    }
    if (entities.description) {
      message.description = entities.description;
    }
    if (entities.event_id) {
      message.targetEventId = entities.event_id;
    }
  }

  /**
   * Build a user-friendly message listing missing fields.
   */
  private buildMissingFieldsMessage(missingFields: string[]): string {
    if (!missingFields || missingFields.length === 0) {
      return '请补充完整信息。';
    }

    const fieldLabels: Record<string, string> = {
      title: '事件标题',
      date: '日期',
      startTime: '开始时间',
      endTime: '结束时间',
    };

    const lines = missingFields.map(
      (f) => `- ${fieldLabels[f] || f}`
    );
    return `请补充以下信息：\n${lines.join('\n')}`;
  }
}

export const voiceOrchestrator = new VoiceOrchestrator();
