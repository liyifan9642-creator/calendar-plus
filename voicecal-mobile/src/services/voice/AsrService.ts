import { Audio } from 'expo-av';

export interface AsrStatus {
  state: 'IDLE' | 'LISTENING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  currentText: string;
  confidence: number;
  errorMessage?: string;
}

export interface AsrCallback {
  onResult: (text: string, confidence: number) => void;
  onError: (error: string) => void;
  onPartialResult?: (text: string) => void;
}

class AsrService {
  private recording: Audio.Recording | null = null;
  private status: AsrStatus = {
    state: 'IDLE',
    currentText: '',
    confidence: 0,
  };

  /**
   * Request audio permissions and start recording using expo-av.
   */
  async startRecording(): Promise<void> {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        this.status = {
          state: 'ERROR',
          currentText: '',
          confidence: 0,
          errorMessage: 'Audio recording permission not granted',
        };
        throw new Error('Audio recording permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.status = {
        state: 'LISTENING',
        currentText: '',
        confidence: 0,
      };
    } catch (error: any) {
      this.status = {
        state: 'ERROR',
        currentText: '',
        confidence: 0,
        errorMessage: error?.message ?? 'Failed to start recording',
      };
      throw error;
    }
  }

  /**
   * Stop the current recording and return the recording URI.
   */
  async stopRecording(): Promise<string> {
    if (!this.recording) {
      throw new Error('No active recording to stop');
    }

    try {
      this.status = { ...this.status, state: 'PROCESSING' };

      await this.recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = this.recording.getURI();
      this.recording = null;

      if (!uri) {
        throw new Error('Recording URI is null');
      }

      this.status = {
        state: 'COMPLETED',
        currentText: '',
        confidence: 0,
      };

      return uri;
    } catch (error: any) {
      this.recording = null;
      this.status = {
        state: 'ERROR',
        currentText: '',
        confidence: 0,
        errorMessage: error?.message ?? 'Failed to stop recording',
      };
      throw error;
    }
  }

  /**
   * Get the current ASR status.
   */
  getStatus(): AsrStatus {
    return { ...this.status };
  }

  /**
   * Check if the service is currently recording.
   */
  isRecognizing(): boolean {
    return this.status.state === 'LISTENING';
  }

  /**
   * Transcribe an audio file by URI.
   * Placeholder implementation -- will be replaced with a cloud ASR API later.
   */
  async transcribeAudio(
    _uri: string
  ): Promise<{ text: string; confidence: number }> {
    this.status = { ...this.status, state: 'PROCESSING' };

    try {
      // TODO: Integrate cloud ASR API (e.g. Google Speech-to-Text, Whisper API)
      // For now, return empty result as a placeholder.
      const result = { text: '', confidence: 0 };

      this.status = {
        state: 'COMPLETED',
        currentText: result.text,
        confidence: result.confidence,
      };

      return result;
    } catch (error: any) {
      this.status = {
        state: 'ERROR',
        currentText: '',
        confidence: 0,
        errorMessage: error?.message ?? 'Transcription failed',
      };
      throw error;
    }
  }

  /**
   * Reset the service to idle state.
   */
  reset(): void {
    this.recording = null;
    this.status = {
      state: 'IDLE',
      currentText: '',
      confidence: 0,
    };
  }
}

export const asrService = new AsrService();
