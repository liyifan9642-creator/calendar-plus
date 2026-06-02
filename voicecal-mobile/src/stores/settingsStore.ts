import { create } from 'zustand';
import { AppConfig } from '../config/AppConfig';

interface SettingsState {
  /** LLM API base URL */
  llmBaseUrl: string;
  /** LLM API key */
  llmApiKey: string;
  /** LLM model name */
  llmModel: string;
  /** Speech recognition language */
  language: string;
  /** TTS speech rate */
  speechRate: number;

  /** Update LLM configuration */
  updateLlmConfig: (baseUrl: string, apiKey: string, model: string) => void;
  /** Update voice configuration */
  updateVoiceConfig: (language: string, speechRate: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  llmBaseUrl: AppConfig.llm.baseUrl,
  llmApiKey: AppConfig.llm.apiKey,
  llmModel: AppConfig.llm.model,
  language: AppConfig.voice.language,
  speechRate: AppConfig.voice.speechRate,

  updateLlmConfig: (baseUrl: string, apiKey: string, model: string) => {
    set({ llmBaseUrl: baseUrl, llmApiKey: apiKey, llmModel: model });
  },

  updateVoiceConfig: (language: string, speechRate: number) => {
    set({ language, speechRate });
  },
}));
