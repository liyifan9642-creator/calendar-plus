import { create } from 'zustand';
import {
  VoiceState,
  OrchestratorResponse,
  ConversationItem,
  Intent,
  VoiceSettings,
  Message,
  ProcessResponse,
  ClarificationOption,
  ConfirmRequest,
} from '@/types';
import { voiceApi } from '@/services/voiceApi';
import { v4 as uuidv4 } from 'uuid';

interface VoiceStore {
  // [旧代码保留] 旧的状态
  // voiceState: VoiceState;
  // interimText: string;
  // finalText: string;
  // systemResponse: string;
  // recognizedIntent: Intent | null;
  // confidence: number;
  // sessionId: string | null;
  // conversationHistory: ConversationItem[];
  // loading: boolean;
  // error: string | null;
  // volume: number;
  // recordingDuration: number;
  // isCancelled: boolean;
  // settings: VoiceSettings;

  // State（合并旧状态和新状态）
  voiceState: VoiceState;
  interimText: string;
  finalText: string;
  systemResponse: string;
  recognizedIntent: Intent | null;
  confidence: number;
  sessionId: string | null;
  conversationHistory: ConversationItem[];
  loading: boolean;
  error: string | null;

  // 增强功能状态
  volume: number;          // Current microphone volume level 0-1
  recordingDuration: number; // Recording duration in seconds
  isCancelled: boolean;     // Whether the current recording was cancelled

  // 新增状态（设计文档 7.1）
  currentMessage: Message | null;           // 当前 Message
  clarificationOptions: ClarificationOption[];  // 澄清选项

  // Settings
  settings: VoiceSettings;

  // [旧代码保留] 旧的 Actions
  // setVoiceState: (state: VoiceState) => void;
  // setInterimText: (text: string) => void;
  // setFinalText: (text: string) => void;
  // setVolume: (volume: number) => void;
  // setRecordingDuration: (duration: number) => void;
  // setIsCancelled: (cancelled: boolean) => void;
  // updateSettings: (settings: Partial<VoiceSettings>) => void;
  // startListening: () => void;
  // stopListening: () => void;
  // processAudio: (audioBlob: Blob) => Promise<OrchestratorResponse>;
  // processText: (text: string) => Promise<OrchestratorResponse>;
  // clearCurrentInput: () => void;
  // clearHistory: () => void;
  // clearError: () => void;

  // Actions
  setVoiceState: (state: VoiceState) => void;
  setInterimText: (text: string) => void;
  setFinalText: (text: string) => void;
  setVolume: (volume: number) => void;
  setRecordingDuration: (duration: number) => void;
  setIsCancelled: (cancelled: boolean) => void;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
  startListening: () => void;
  stopListening: () => void;

  // [旧代码保留] 旧的 processAudio 和 processText
  // processAudio: (audioBlob: Blob) => Promise<OrchestratorResponse>;
  // processText: (text: string) => Promise<OrchestratorResponse>;

  // 新的 process 方法（设计文档 5.1）
  process: (params: {
    inputType: 'VOICE' | 'TEXT';
    text?: string;
    audio?: Blob;
    sessionId?: string;
    language?: 'zh-CN' | 'en-US';
  }) => Promise<ProcessResponse>;

  // 确认/取消操作
  confirmAction: (request: ConfirmRequest) => Promise<void>;

  // 选择澄清选项
  selectClarificationOption: (optionId: string) => Promise<void>;

  // [旧代码保留] 兼容旧接口
  processAudio: (audioBlob: Blob) => Promise<OrchestratorResponse>;
  processText: (text: string) => Promise<OrchestratorResponse>;

  clearCurrentInput: () => void;
  clearHistory: () => void;
  clearError: () => void;

  // 新增方法
  setCurrentMessage: (message: Message | null) => void;
  setClarificationOptions: (options: ClarificationOption[]) => void;
  fetchHistory: (sessionId: string, limit?: number, offset?: number) => Promise<void>;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  language: 'zh-CN',
  speechRate: 1.0,
  volume: 0.8,
};

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  // Initial state
  voiceState: 'idle',
  interimText: '',
  finalText: '',
  systemResponse: '',
  recognizedIntent: null,
  confidence: 0,
  sessionId: null,
  conversationHistory: [],
  loading: false,
  error: null,

  // 增强功能状态
  volume: 0,
  recordingDuration: 0,
  isCancelled: false,

  // 新增状态
  currentMessage: null,
  clarificationOptions: [],

  // Settings
  settings: DEFAULT_SETTINGS,

  // Set voice state
  setVoiceState: (state: VoiceState) => {
    set({ voiceState: state });
  },

  // Set interim text (real-time recognition)
  setInterimText: (text: string) => {
    set({ interimText: text });
  },

  // Set final text
  setFinalText: (text: string) => {
    set({ finalText: text });
  },

  // Set volume level
  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },

  // Set recording duration
  setRecordingDuration: (duration: number) => {
    set({ recordingDuration: duration });
  },

  // Set cancelled state
  setIsCancelled: (cancelled: boolean) => {
    set({ isCancelled: cancelled });
  },

  // Update settings
  updateSettings: (partial: Partial<VoiceSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
  },

  // Start listening
  startListening: () => {
    set({
      voiceState: 'listening',
      interimText: '',
      finalText: '',
      error: null,
      volume: 0,
      recordingDuration: 0,
      isCancelled: false,
    });
  },

  // Stop listening
  stopListening: () => {
    set({ voiceState: 'processing' });
  },

  // ======================== 新的 process 方法（设计文档 5.1） ========================

  /**
   * POST /api/voice/process - 统一处理语音/文本输入
   * 返回 ProcessResponse（包含 Message 对象）
   */
  process: async (params) => {
    const { sessionId } = get();
    set({ loading: true, error: null, voiceState: 'processing' });

    if (params.inputType === 'TEXT') {
      set({ finalText: params.text || '' });
    }

    try {
      const response = await voiceApi.process({
        ...params,
        sessionId: params.sessionId || sessionId || undefined,
      });

      const message = response.message;

      // 更新状态
      set({
        currentMessage: message,
        systemResponse: response.responseText,
        clarificationOptions: response.options || [],
        sessionId: sessionId, // 保持现有 sessionId
        loading: false,
        voiceState: 'idle',
      });

      // 添加到对话历史
      const { conversationHistory } = get();
      const newItem: ConversationItem = {
        id: message.id || uuidv4(),
        timestamp: new Date().toISOString(),
        userInput: params.text || '',
        systemResponse: response.responseText,
        message: message,
        success: response.success,
      };

      set({
        conversationHistory: [newItem, ...conversationHistory].slice(0, 50),
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理失败';
      set({
        error: errorMessage,
        loading: false,
        voiceState: 'idle',
      });
      throw error;
    }
  },

  /**
   * POST /api/voice/confirm - 确认或取消操作
   */
  confirmAction: async (request: ConfirmRequest) => {
    set({ loading: true, error: null, voiceState: 'processing' });

    try {
      const response = await voiceApi.confirm(request);
      const message = response.message;

      // 更新当前消息
      set({
        currentMessage: message,
        systemResponse: response.responseText,
        clarificationOptions: [],
        loading: false,
        voiceState: 'idle',
      });

      // 更新对话历史中对应的记录
      const { conversationHistory } = get();
      const updatedHistory = conversationHistory.map((item) => {
        if (item.message?.id === request.messageId) {
          return {
            ...item,
            message: message,
            systemResponse: response.responseText,
          };
        }
        return item;
      });

      set({ conversationHistory: updatedHistory });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '确认操作失败';
      set({
        error: errorMessage,
        loading: false,
      });
      throw error;
    }
  },

  /**
   * 选择澄清选项
   */
  selectClarificationOption: async (optionId: string) => {
    const { currentMessage } = get();
    if (!currentMessage) return;

    await get().confirmAction({
      messageId: currentMessage.id,
      action: 'SELECT_OPTION',
      optionId: optionId,
    });
  },

  // ======================== 旧的 processAudio 和 processText（兼容） ========================

  // [旧代码保留] Process audio recording
  processAudio: async (audioBlob: Blob) => {
    const { sessionId, settings } = get();
    set({ loading: true, error: null, voiceState: 'processing' });

    try {
      // [旧代码保留] 使用旧接口
      // const response = await voiceApi.processAudio(audioBlob, settings.language, sessionId || undefined);

      // 使用新接口
      const processResponse = await voiceApi.process({
        inputType: 'VOICE',
        audio: audioBlob,
        sessionId: sessionId || undefined,
        language: settings.language,
      });

      const message = processResponse.message;

      // 更新状态
      set({
        currentMessage: message,
        systemResponse: processResponse.responseText,
        clarificationOptions: processResponse.options || [],
        loading: false,
        voiceState: 'idle',
      });

      // 添加到对话历史
      const { finalText, conversationHistory } = get();
      const newItem: ConversationItem = {
        id: message.id || uuidv4(),
        timestamp: new Date().toISOString(),
        userInput: finalText,
        systemResponse: processResponse.responseText,
        message: message,
        success: processResponse.success,
      };

      set({
        conversationHistory: [newItem, ...conversationHistory].slice(0, 50),
      });

      // 返回兼容格式
      const response: OrchestratorResponse = {
        responseText: processResponse.responseText,
        success: processResponse.success,
        message: message,
        options: processResponse.options,
      };

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理语音失败';
      set({
        error: errorMessage,
        loading: false,
        voiceState: 'idle',
      });
      throw error;
    }
  },

  // [旧代码保留] Process text input
  processText: async (text: string) => {
    const { sessionId, settings } = get();
    set({ loading: true, error: null, voiceState: 'processing', finalText: text });

    try {
      // [旧代码保留] 使用旧接口
      // const response = await voiceApi.processText(text, sessionId || undefined, settings.language);

      // 使用新接口
      const processResponse = await voiceApi.process({
        inputType: 'TEXT',
        text: text,
        sessionId: sessionId || undefined,
        language: settings.language,
      });

      const message = processResponse.message;

      // 更新状态
      set({
        currentMessage: message,
        systemResponse: processResponse.responseText,
        clarificationOptions: processResponse.options || [],
        loading: false,
        voiceState: 'idle',
      });

      // 添加到对话历史
      const { conversationHistory } = get();
      const newItem: ConversationItem = {
        id: message.id || uuidv4(),
        timestamp: new Date().toISOString(),
        userInput: text,
        systemResponse: processResponse.responseText,
        message: message,
        success: processResponse.success,
      };

      set({
        conversationHistory: [newItem, ...conversationHistory].slice(0, 50),
      });

      // 返回兼容格式
      const response: OrchestratorResponse = {
        responseText: processResponse.responseText,
        success: processResponse.success,
        message: message,
        options: processResponse.options,
      };

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理文本失败';
      set({
        error: errorMessage,
        loading: false,
        voiceState: 'idle',
      });
      throw error;
    }
  },

  // Clear current input
  clearCurrentInput: () => {
    set({
      interimText: '',
      finalText: '',
      systemResponse: '',
      recognizedIntent: null,
      confidence: 0,
      volume: 0,
      recordingDuration: 0,
      isCancelled: false,
      currentMessage: null,
      clarificationOptions: [],
    });
  },

  // Clear conversation history
  clearHistory: () => {
    set({ conversationHistory: [] });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Set current message
  setCurrentMessage: (message: Message | null) => {
    set({ currentMessage: message });
  },

  // Set clarification options
  setClarificationOptions: (options: ClarificationOption[]) => {
    set({ clarificationOptions: options });
  },

  // Fetch conversation history from backend
  fetchHistory: async (sessionId: string, limit = 20, offset = 0) => {
    try {
      const response = await voiceApi.getHistory(sessionId, limit, offset);
      set({ conversationHistory: response.items });
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
    }
  },
}));

export default useVoiceStore;
