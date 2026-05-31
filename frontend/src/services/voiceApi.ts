import axios from 'axios';
import {
  OrchestratorResponse,
  SessionState,
  HealthStatus,
  ProcessResponse,
  ConfirmRequest,
  ConfirmResponse,
  HistoryResponse,
} from '@/types';

const api = axios.create({
  baseURL: '/api/voice',
  timeout: 30000, // Voice processing may take longer
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Voice API Error:', error);
    return Promise.reject(error);
  }
);

export const voiceApi = {
  // ======================== 旧 API 方法（保留） ========================

  // [旧代码保留] processAudio - 旧的音频处理方法
  // processAudio: async (audio: Blob, language = 'zh-CN', sessionId?: string): Promise<OrchestratorResponse> => {
  //   const formData = new FormData();
  //   formData.append('audio', audio, 'recording.webm');
  //   formData.append('language', language);
  //   if (sessionId) {
  //     formData.append('sessionId', sessionId);
  //   }
  //   const response = await api.post<OrchestratorResponse>('/process-audio', formData, {
  //     headers: { 'Content-Type': 'multipart/form-data' },
  //   });
  //   return response.data;
  // },

  // [旧代码保留] processText - 旧的文本处理方法
  // processText: async (text: string, sessionId?: string, language = 'zh-CN'): Promise<OrchestratorResponse> => {
  //   const response = await api.post<OrchestratorResponse>('/process-text', null, {
  //     params: { text, sessionId, language },
  //   });
  //   return response.data;
  // },

  /**
   * [旧代码保留] Process audio file - 兼容旧接口
   */
  processAudio: async (audio: Blob, language = 'zh-CN', sessionId?: string): Promise<OrchestratorResponse> => {
    const formData = new FormData();
    formData.append('audio', audio, 'recording.webm');
    formData.append('language', language);
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }

    const response = await api.post<OrchestratorResponse>('/process-audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * [旧代码保留] Process text command - 兼容旧接口
   */
  processText: async (text: string, sessionId?: string, language = 'zh-CN'): Promise<OrchestratorResponse> => {
    const response = await api.post<OrchestratorResponse>('/process-text', null, {
      params: {
        text,
        sessionId,
        language,
      },
    });
    return response.data;
  },

  // ======================== 新 API 方法（设计文档 5.1） ========================

  /**
   * POST /api/voice/process - 统一处理语音/文本输入
   * 返回 Message 对象和 ProcessResponse
   */
  process: async (params: {
    inputType: 'VOICE' | 'TEXT';
    text?: string;
    audio?: Blob;
    sessionId?: string;
    language?: 'zh-CN' | 'en-US';
  }): Promise<ProcessResponse> => {
    if (params.inputType === 'VOICE' && params.audio) {
      const formData = new FormData();
      formData.append('inputType', 'VOICE');
      formData.append('audio', params.audio, 'recording.webm');
      if (params.sessionId) formData.append('sessionId', params.sessionId);
      if (params.language) formData.append('language', params.language);

      const response = await api.post<ProcessResponse>('/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } else {
      const response = await api.post<ProcessResponse>('/process', {
        inputType: 'TEXT',
        text: params.text,
        sessionId: params.sessionId,
        language: params.language || 'zh-CN',
      });
      return response.data;
    }
  },

  /**
   * POST /api/voice/confirm - 用户确认或选择澄清选项
   */
  confirm: async (request: ConfirmRequest): Promise<ConfirmResponse> => {
    const response = await api.post<ConfirmResponse>('/confirm', request);
    return response.data;
  },

  /**
   * GET /api/voice/history - 获取对话历史
   */
  getHistory: async (sessionId: string, limit = 20, offset = 0): Promise<HistoryResponse> => {
    const response = await api.get<HistoryResponse>('/history', {
      params: { sessionId, limit, offset },
    });
    return response.data;
  },

  // ======================== 其他 API 方法（保留） ========================

  /**
   * Get session state
   */
  getSession: async (sessionId: string): Promise<SessionState> => {
    const response = await api.get<SessionState>(`/session/${sessionId}`);
    return response.data;
  },

  /**
   * Terminate a session
   */
  terminateSession: async (sessionId: string): Promise<void> => {
    await api.post(`/session/${sessionId}/terminate`);
  },

  /**
   * Health check
   */
  healthCheck: async (): Promise<HealthStatus> => {
    const response = await api.get<HealthStatus>('/health');
    return response.data;
  },

  /**
   * [旧代码保留] Confirm or cancel a pending operation - 兼容旧接口
   */
  confirmAction: async (sessionId: string, responseId: string, confirmed: boolean): Promise<OrchestratorResponse> => {
    const response = await api.post<OrchestratorResponse>('/confirm', {
      sessionId,
      responseId,
      confirmed,
    });
    return response.data;
  },

  /**
   * Get user voice settings
   */
  getSettings: async (userId?: string): Promise<{
    language: string;
    speechRate: number;
    volume: number;
  }> => {
    const response = await api.get('/settings', { params: { userId } });
    return response.data;
  },

  /**
   * Save user voice settings
   */
  saveSettings: async (settings: {
    language: string;
    speechRate: number;
    volume: number;
  }, userId?: string): Promise<{ success: boolean }> => {
    const response = await api.put('/settings', settings, { params: { userId } });
    return response.data;
  },

  /**
   * Get supported voice commands
   */
  getCommands: async (language = 'zh-CN'): Promise<Array<{
    intent: string;
    command: string;
    description: string;
    examples: string[];
  }>> => {
    const response = await api.get('/commands', { params: { language } });
    return response.data;
  },
};

export default voiceApi;
