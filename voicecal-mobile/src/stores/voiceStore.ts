import { create } from 'zustand';
import { Message } from '../models';
import { MessageStatus } from '../models/enums';
import { generateId } from '../utils/uuid';

interface VoiceState {
  /** Conversation messages */
  messages: Message[];
  /** Current session ID */
  sessionId: string;
  /** ASR recording state */
  isListening: boolean;
  /** LLM processing state */
  isProcessing: boolean;
  /** Current text input */
  currentInput: string;
  /** Error message */
  error: string | null;

  /** Add a message to the conversation */
  addMessage: (message: Message) => void;
  /** Update the status of a message by ID */
  updateMessageStatus: (id: string, status: MessageStatus) => void;
  /** Set ASR listening state */
  setListening: (listening: boolean) => void;
  /** Set LLM processing state */
  setProcessing: (processing: boolean) => void;
  /** Set current text input */
  setCurrentInput: (input: string) => void;
  /** Clear all messages */
  clearMessages: () => void;
  /** Set or clear error */
  setError: (error: string | null) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  messages: [],
  sessionId: generateId(),
  isListening: false,
  isProcessing: false,
  currentInput: '',
  error: null,

  addMessage: (message: Message) => {
    set((state) => {
      // Prevent duplicate messages with the same ID
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return state;
      return { messages: [...state.messages, message] };
    });
  },

  updateMessageStatus: (id: string, status: MessageStatus) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, status, updatedAt: new Date().toISOString() } : m
      ),
    }));
  },

  setListening: (listening: boolean) => {
    set({ isListening: listening });
  },

  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },

  setCurrentInput: (input: string) => {
    set({ currentInput: input });
  },

  clearMessages: () => {
    set({ messages: [], sessionId: generateId() });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
