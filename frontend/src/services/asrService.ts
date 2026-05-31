/**
 * ASR (Automatic Speech Recognition) Service
 *
 * 三级降级策略：
 * 1. Web Speech API (浏览器内置) - 优先级最高
 * 2. 联网 ASR 服务 (后端 API) - 中等优先级
 * 3. 本地 Sherpa-ONNX (后端 API) - 最低优先级
 */

// ==================== 类型定义 ====================

/** ASR 识别方式 */
export type AsrMethod = 'web-speech' | 'online-asr' | 'sherpa-local';

/** ASR 识别状态 */
export type AsrStatus = 'idle' | 'listening' | 'recognizing' | 'error';

/** ASR 识别结果 */
export interface AsrResult {
  /** 识别文本 */
  text: string;
  /** 是否为最终结果 */
  isFinal: boolean;
  /** 置信度 (0-1) */
  confidence: number;
  /** 使用的识别方式 */
  method: AsrMethod;
}

/** ASR 错误信息 */
export interface AsrError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 使用的识别方式 */
  method: AsrMethod;
  /** 原始错误 */
  originalError?: Error;
}

/** ASR 配置 */
export interface AsrConfig {
  /** 语言 (默认: zh-CN) */
  language: string;
  /** 是否启用 Web Speech API */
  enableWebSpeech: boolean;
  /** 是否启用联网 ASR */
  enableOnlineAsr: boolean;
  /** 是否启用本地 Sherpa */
  enableSherpaLocal: boolean;
  /** 识别结果回调 */
  onResult?: (result: AsrResult) => void;
  /** 错误回调 */
  onError?: (error: AsrError) => void;
  /** 状态变化回调 */
  onStatusChange?: (status: AsrStatus) => void;
}

/** 音频处理响应 (复用 OrchestratorResponse) */
interface ProcessAudioResponse {
  responseId: string;
  sessionId: string;
  intent: string;
  entities: Record<string, string>;
  responseText: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata: {
    asrDurationMs: number;
    asrConfidence: number;
    [key: string]: any;
  };
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: AsrConfig = {
  language: 'zh-CN',
  enableWebSpeech: true,
  enableOnlineAsr: true,
  enableSherpaLocal: true,
};

// ==================== Web Speech API 实现 ====================

/**
 * 检测浏览器是否支持 Web Speech API
 */
export function isWebSpeechAvailable(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Web Speech API 识别器
 */
class WebSpeechRecognizer {
  private recognition: any = null;
  private config: AsrConfig;
  private status: AsrStatus = 'idle';

  constructor(config: AsrConfig) {
    this.config = config;
  }

  /** 获取当前状态 */
  getStatus(): AsrStatus {
    return this.status;
  }

  /** 开始识别 */
  start(): void {
    if (!isWebSpeechAvailable()) {
      throw new Error('Web Speech API is not available');
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence || 0.9;

        if (event.results[i].isFinal) {
          final += transcript;
          this.config.onResult?.({
            text: transcript,
            isFinal: true,
            confidence,
            method: 'web-speech',
          });
        } else {
          interim += transcript;
          this.config.onResult?.({
            text: transcript,
            isFinal: false,
            confidence,
            method: 'web-speech',
          });
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Web Speech API error:', event.error);
      this.status = 'error';
      this.config.onStatusChange?.('error');
      this.config.onError?.({
        code: `WEB_SPEECH_${event.error.toUpperCase()}`,
        message: `Web Speech API error: ${event.error}`,
        method: 'web-speech',
        originalError: new Error(event.error),
      });
    };

    this.recognition.onend = () => {
      if (this.status === 'listening') {
        // Recognition ended unexpectedly, might want to restart or notify
        this.status = 'idle';
        this.config.onStatusChange?.('idle');
      }
    };

    this.recognition.start();
    this.status = 'listening';
    this.config.onStatusChange?.('listening');
  }

  /** 停止识别 */
  stop(): string | null {
    let finalText: string | null = null;

    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    this.status = 'idle';
    this.config.onStatusChange?.('idle');
    return finalText;
  }

  /** 中止识别 */
  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }

    this.status = 'idle';
    this.config.onStatusChange?.('idle');
  }
}

// ==================== 联网 ASR 实现 ====================

/**
 * 调用后端联网 ASR 接口
 * POST /api/voice/process-audio
 */
async function callOnlineAsr(audioBlob: Blob, language: string): Promise<ProcessAudioResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('language', language);

  const response = await fetch('/api/voice/process-audio', {
    method: 'POST',
    body: formData,
    // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
  });

  if (!response.ok) {
    throw new Error(`Online ASR request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ==================== Sherpa-ONNX 本地识别实现 ====================

/**
 * 调用后端 Sherpa-ONNX ASR 接口
 * POST /api/voice/process-asr
 */
async function callSherpaAsr(audioBase64: string, language: string): Promise<ProcessAudioResponse> {
  const response = await fetch('/api/voice/process-asr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: audioBase64,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sherpa ASR request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * 将 Blob 转换为 Base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // 移除 data:audio/webm;base64, 前缀
      const base64 = base64String.split(',')[1] || base64String;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ==================== ASR 服务主类 ====================

/**
 * ASR 服务 - 实现三级降级策略
 */
export class AsrService {
  private config: AsrConfig;
  private webSpeechRecognizer: WebSpeechRecognizer | null = null;
  private currentMethod: AsrMethod | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor(config: Partial<AsrConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** 获取当前使用的识别方式 */
  getCurrentMethod(): AsrMethod | null {
    return this.currentMethod;
  }

  /** 更新配置 */
  updateConfig(config: Partial<AsrConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 开始识别 - 使用三级降级策略
   *
   * 优先级 1: Web Speech API (实时识别)
   * 优先级 2: 联网 ASR (录音后发送)
   * 优先级 3: 本地 Sherpa-ONNX (录音后发送)
   */
  async startRecognition(): Promise<void> {
    this.config.onStatusChange?.('listening');

    // 优先级 1: 尝试 Web Speech API
    if (this.config.enableWebSpeech && isWebSpeechAvailable()) {
      try {
        this.webSpeechRecognizer = new WebSpeechRecognizer(this.config);
        this.webSpeechRecognizer.start();
        this.currentMethod = 'web-speech';
        console.log('[ASR] Using Web Speech API');
        return;
      } catch (error) {
        console.warn('[ASR] Web Speech API failed, falling back:', error);
        this.config.onError?.({
          code: 'WEB_SPEECH_FAILED',
          message: 'Web Speech API 启动失败，尝试其他方式',
          method: 'web-speech',
          originalError: error as Error,
        });
      }
    }

    // 优先级 2 & 3: 使用 MediaRecorder 录音
    // 录音结束后会根据配置尝试联网 ASR 或本地 Sherpa
    try {
      await this.startMediaRecording();
    } catch (error) {
      this.config.onStatusChange?.('error');
      this.config.onError?.({
        code: 'RECORDING_FAILED',
        message: '无法启动录音，请检查麦克风权限',
        method: this.currentMethod || 'online-asr',
        originalError: error as Error,
      });
      throw error;
    }
  }

  /**
   * 停止识别并获取结果
   */
  async stopRecognition(): Promise<string | null> {
    // 如果使用 Web Speech API
    if (this.currentMethod === 'web-speech' && this.webSpeechRecognizer) {
      const result = this.webSpeechRecognizer.stop();
      this.webSpeechRecognizer = null;
      this.currentMethod = null;
      this.config.onStatusChange?.('idle');
      return result;
    }

    // 如果使用 MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.config.onStatusChange?.('recognizing');
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.config.onStatusChange?.('idle');
          resolve(null);
        }, 30000); // 30秒超时

        this.mediaRecorder!.onstop = async () => {
          clearTimeout(timeout);
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.audioChunks = [];

          // 停止录音流
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          try {
            const text = await this.processRecordedAudio(audioBlob);
            this.config.onStatusChange?.('idle');
            resolve(text);
          } catch (error) {
            this.config.onStatusChange?.('error');
            resolve(null);
          }
        };

        this.mediaRecorder!.stop();
      });
    }

    this.config.onStatusChange?.('idle');
    return null;
  }

  /**
   * 中止识别
   */
  abort(): void {
    // 中止 Web Speech API
    if (this.webSpeechRecognizer) {
      this.webSpeechRecognizer.abort();
      this.webSpeechRecognizer = null;
    }

    // 中止 MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // 停止录音流
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.audioChunks = [];
    this.currentMethod = null;
    this.config.onStatusChange?.('idle');
  }

  /**
   * 启动 MediaRecorder 录音
   */
  private async startMediaRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.stream = stream;

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    this.audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder = mediaRecorder;
    mediaRecorder.start(100); // 每100ms收集一次数据
  }

  /**
   * 处理录音音频 - 降级策略
   */
  private async processRecordedAudio(audioBlob: Blob): Promise<string | null> {
    // 优先级 2: 联网 ASR
    if (this.config.enableOnlineAsr) {
      try {
        this.currentMethod = 'online-asr';
        console.log('[ASR] Trying Online ASR...');

        const response = await callOnlineAsr(audioBlob, this.config.language);

        if (response.success && response.responseText) {
          this.config.onResult?.({
            text: response.responseText,
            isFinal: true,
            confidence: response.metadata?.asrConfidence || 0.8,
            method: 'online-asr',
          });
          return response.responseText;
        }
      } catch (error) {
        console.warn('[ASR] Online ASR failed, falling back:', error);
        this.config.onError?.({
          code: 'ONLINE_ASR_FAILED',
          message: '联网识别失败，尝试本地识别',
          method: 'online-asr',
          originalError: error as Error,
        });
      }
    }

    // 优先级 3: Sherpa-ONNX 本地识别
    if (this.config.enableSherpaLocal) {
      try {
        this.currentMethod = 'sherpa-local';
        console.log('[ASR] Trying Sherpa-ONNX Local...');

        const audioBase64 = await blobToBase64(audioBlob);
        const response = await callSherpaAsr(audioBase64, this.config.language);

        if (response.success && response.responseText) {
          this.config.onResult?.({
            text: response.responseText,
            isFinal: true,
            confidence: response.metadata?.asrConfidence || 0.7,
            method: 'sherpa-local',
          });
          return response.responseText;
        }
      } catch (error) {
        console.error('[ASR] Sherpa-ONNX failed:', error);
        this.config.onError?.({
          code: 'SHERPA_FAILED',
          message: '本地识别失败',
          method: 'sherpa-local',
          originalError: error as Error,
        });
      }
    }

    // 所有方式都失败
    this.config.onError?.({
      code: 'ALL_ASR_FAILED',
      message: '所有识别方式均失败，请重试',
      method: 'sherpa-local',
    });

    return null;
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建 ASR 服务实例
 */
export function createAsrService(config?: Partial<AsrConfig>): AsrService {
  return new AsrService(config);
}

// ==================== 导出默认实例 ====================

export default AsrService;
