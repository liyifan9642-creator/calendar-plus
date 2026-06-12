import { PermissionsAndroid, Platform } from 'react-native';

// Lazy-load Voice module to prevent crashes when native module is unavailable
let Voice: any = null;
let VoiceModuleLoaded = false;
let VoiceLoadError: string | null = null;

function loadVoiceModule(): boolean {
  if (VoiceModuleLoaded) return !!Voice;

  try {
    const mod = require('@react-native-voice/voice');
    Voice = mod?.default ?? mod;

    // Validate the module has expected methods
    if (Voice && typeof Voice.start === 'function') {
      VoiceModuleLoaded = true;
      console.log('AsrService: Voice module loaded successfully');
      return true;
    } else {
      VoiceLoadError = 'Voice module loaded but missing expected methods';
      console.warn('AsrService:', VoiceLoadError);
      VoiceModuleLoaded = true;
      return false;
    }
  } catch (error: any) {
    VoiceLoadError = error?.message ?? 'Unknown error loading Voice module';
    console.warn('AsrService: Failed to load Voice module:', VoiceLoadError);
    VoiceModuleLoaded = true;
    return false;
  }
}

import type { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

export interface AsrStatus {
  state: 'IDLE' | 'LISTENING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  currentText: string;
  partialText: string;
  confidence: number;
  errorMessage?: string;
}

class AsrService {
  private status: AsrStatus = {
    state: 'IDLE',
    currentText: '',
    partialText: '',
    confidence: 0,
  };
  private resolveRecognition: ((text: string) => void) | null = null;
  private rejectRecognition: ((error: Error) => void) | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private listenersSetup = false;

  /**
   * Ensure Voice module is loaded and listeners are set up.
   */
  private ensureInitialized(): boolean {
    if (!loadVoiceModule()) return false;
    if (!this.listenersSetup && Voice) {
      try {
        this.setupVoiceListeners();
        this.listenersSetup = true;
      } catch (error: any) {
        console.warn('AsrService: Failed to setup listeners:', error?.message);
        return false;
      }
    }
    return true;
  }

  private setupVoiceListeners(): void {
    Voice.onSpeechStart = () => {
      this.status = { ...this.status, state: 'LISTENING' };
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const partial = e.value?.[0] || '';
      this.status = { ...this.status, partialText: partial };
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] || '';
      this.status = {
        state: 'COMPLETED',
        currentText: text,
        partialText: '',
        confidence: 0.9,
      };

      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      if (this.resolveRecognition) {
        this.resolveRecognition(text);
        this.resolveRecognition = null;
        this.rejectRecognition = null;
      }
    };

    Voice.onSpeechEnd = () => {
      if (this.resolveRecognition) {
        const text = this.status.currentText || this.status.partialText || '';
        if (text) {
          this.status = { ...this.status, state: 'COMPLETED', currentText: text };
          this.resolveRecognition(text);
        } else {
          this.status = { ...this.status, state: 'IDLE' };
          if (this.rejectRecognition) {
            this.rejectRecognition(new Error('未检测到语音输入'));
          }
        }
        this.resolveRecognition = null;
        this.rejectRecognition = null;
      }

      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      const errorMsg = e.error?.message || '语音识别出错';
      this.status = {
        state: 'ERROR',
        currentText: '',
        partialText: '',
        confidence: 0,
        errorMessage: errorMsg,
      };

      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      if (this.rejectRecognition) {
        this.rejectRecognition(new Error(errorMsg));
        this.resolveRecognition = null;
        this.rejectRecognition = null;
      }
    };
  }

  /**
   * Request microphone permission on Android.
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: '麦克风权限',
          message: '语音识别需要使用麦克风',
          buttonPositive: '允许',
          buttonNegative: '拒绝',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error: any) {
      console.warn('AsrService: Permission request failed:', error?.message);
      return false;
    }
  }

  /**
   * Start listening for speech.
   * Returns a promise that resolves with the recognized text.
   */
  async startListening(): Promise<string> {
    // Check module availability
    if (!this.ensureInitialized()) {
      throw new Error(
        `语音识别模块加载失败${VoiceLoadError ? `: ${VoiceLoadError}` : ''}。请确认使用 Development Build 或 Preview Build。`
      );
    }

    // Request permission first
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('需要麦克风权限才能使用语音识别');
    }

    try {
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        throw new Error('当前设备不支持语音识别，请安装 Google 语音服务');
      }

      await Voice.destroy();

      this.status = {
        state: 'LISTENING',
        currentText: '',
        partialText: '',
        confidence: 0,
      };

      const resultPromise = new Promise<string>((resolve, reject) => {
        this.resolveRecognition = resolve;
        this.rejectRecognition = reject;
      });

      await Voice.start('zh-CN');

      this.silenceTimer = setTimeout(async () => {
        try {
          await this.stopListening();
        } catch {
          // Ignore errors during auto-stop
        }
      }, 10000);

      return resultPromise;
    } catch (error: any) {
      this.status = {
        state: 'ERROR',
        currentText: '',
        partialText: '',
        confidence: 0,
        errorMessage: error?.message ?? '无法启动语音识别',
      };
      throw error;
    }
  }

  /**
   * Stop listening and return the recognized text.
   */
  async stopListening(): Promise<string> {
    if (!Voice) {
      throw new Error('语音识别模块不可用');
    }
    try {
      await Voice.stop();
      this.status = { ...this.status, state: 'PROCESSING' };

      const text = this.status.currentText || this.status.partialText || '';
      if (text) {
        this.status = { ...this.status, state: 'COMPLETED', currentText: text };
      }
      return text;
    } catch (error: any) {
      this.status = {
        state: 'ERROR',
        currentText: '',
        partialText: '',
        confidence: 0,
        errorMessage: error?.message ?? '停止录音失败',
      };
      throw error;
    }
  }

  /**
   * Cancel the current recognition session.
   */
  async cancel(): Promise<void> {
    if (!Voice) return;
    try {
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      await Voice.cancel();
      this.status = {
        state: 'IDLE',
        currentText: '',
        partialText: '',
        confidence: 0,
      };

      if (this.rejectRecognition) {
        this.rejectRecognition(new Error('已取消'));
        this.resolveRecognition = null;
        this.rejectRecognition = null;
      }
    } catch {
      // Ignore cancel errors
    }
  }

  getStatus(): AsrStatus {
    return { ...this.status };
  }

  isRecognizing(): boolean {
    return this.status.state === 'LISTENING';
  }

  getPartialText(): string {
    return this.status.partialText;
  }

  /**
   * Check if speech recognition is available on this device.
   */
  async isAvailable(): Promise<boolean> {
    if (!this.ensureInitialized()) {
      console.warn('AsrService: isAvailable = false (module not loaded). Error:', VoiceLoadError);
      return false;
    }
    try {
      const result = await Voice.isAvailable();
      console.log('AsrService: Voice.isAvailable() =', result);
      return !!result;
    } catch (error: any) {
      console.warn('AsrService: Voice.isAvailable() error:', error?.message);
      return false;
    }
  }

  /**
   * Get list of available speech recognition services.
   */
  async getAvailableServices(): Promise<string[]> {
    if (!this.ensureInitialized()) return [];
    try {
      const services = await Voice.getSpeechRecognitionServices();
      console.log('AsrService: available services:', services);
      return services || [];
    } catch (error: any) {
      console.warn('AsrService: getSpeechRecognitionServices error:', error?.message);
      return [];
    }
  }

  /**
   * Get diagnostic info about the Voice module state.
   */
  getDiagnostics(): { moduleLoaded: boolean; listenersSetup: boolean; error: string | null } {
    return {
      moduleLoaded: !!Voice,
      listenersSetup: this.listenersSetup,
      error: VoiceLoadError,
    };
  }

  reset(): void {
    this.status = {
      state: 'IDLE',
      currentText: '',
      partialText: '',
      confidence: 0,
    };
  }

  async destroy(): Promise<void> {
    try {
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      if (Voice) await Voice.destroy();
    } catch {
      // Ignore destroy errors
    }
  }
}

// Lazy singleton
let _instance: AsrService | null = null;
export function getAsrService(): AsrService {
  if (!_instance) _instance = new AsrService();
  return _instance;
}

export const asrService = getAsrService();
