import { useCallback, useRef, useEffect } from 'react';
import { useVoiceStore } from '@/stores';
import { useCalendarStore } from '@/stores';
import { ProcessResponse, ConfirmRequest } from '@/types';

/**
 * Hook for voice recording functionality
 * 集成新的 process 和 confirm 接口，同时保留旧接口兼容
 */
export const useVoice = () => {
  const {
    voiceState,
    interimText,
    finalText,
    systemResponse,
    recognizedIntent,
    confidence,
    conversationHistory,
    loading,
    error,
    volume,
    recordingDuration,
    isCancelled,
    settings,
    // 新增状态
    currentMessage,
    clarificationOptions,
    setVoiceState,
    setInterimText,
    setFinalText,
    setVolume,
    setRecordingDuration,
    setIsCancelled,
    updateSettings,
    startListening,
    stopListening,
    // [旧代码保留] 旧的 processAudio 和 processText
    // processAudio,
    // processText,
    // 新的 process 和 confirm 方法
    process,
    confirmAction,
    selectClarificationOption,
    // 兼容旧接口
    processAudio,
    processText,
    clearCurrentInput,
    clearHistory,
    clearError,
    setCurrentMessage,
    setClarificationOptions,
    fetchHistory,
  } = useVoiceStore();

  const { refreshEvents } = useCalendarStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationCounterRef = useRef<number>(0);

  // Start volume monitoring using AnalyserNode
  const startVolumeMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255; // Normalize to 0-1
        setVolume(avg);
      };

      volumeIntervalRef.current = window.setInterval(updateVolume, 50);
    } catch (err) {
      console.warn('AudioContext not available for volume monitoring:', err);
    }
  }, [setVolume]);

  // Stop volume monitoring
  const stopVolumeMonitoring = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVolume(0);
  }, [setVolume]);

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    durationCounterRef.current = 0;
    setRecordingDuration(0);
    durationIntervalRef.current = window.setInterval(() => {
      durationCounterRef.current += 1;
      setRecordingDuration(durationCounterRef.current);
    }, 1000);
  }, [setRecordingDuration]);

  // Stop duration timer
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Format duration as mm:ss
  const formatDuration = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      // Try using Web Speech API first for real-time recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = settings.language;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          if (interim) {
            setInterimText(interim);
          }
          if (final) {
            setFinalText(final);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // Fall back to MediaRecorder
          startMediaRecording();
        };

        recognition.onend = () => {
          // Recognition ended
        };

        recognitionRef.current = recognition;
        recognition.start();
        startListening();
        startDurationTimer();
      } else {
        // Fall back to MediaRecorder
        await startMediaRecording();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      clearError();
    }
  }, [settings.language, startListening, setInterimText, setFinalText, clearError, startDurationTimer]);

  // Start MediaRecorder (fallback)
  const startMediaRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const { isCancelled: cancelled } = useVoiceStore.getState();

        stopVolumeMonitoring();
        stopDurationTimer();

        // If cancelled, do not process
        if (cancelled) {
          audioChunksRef.current = [];
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        // [旧代码保留] 使用旧的 processAudio
        // try {
        //   const response = await processAudio(audioBlob);
        //   if (response.affectedEvents && response.affectedEvents.length > 0) {
        //     await refreshEvents();
        //   }
        // } catch (error) {
        //   console.error('Failed to process audio:', error);
        // }

        // 使用新的 process 接口
        try {
          const response = await handleProcessVoice(audioBlob);
          // Refresh calendar events if needed
          await refreshEvents();
        } catch (error) {
          console.error('Failed to process audio:', error);
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      startListening();
      startVolumeMonitoring(stream);
      startDurationTimer();
    } catch (error) {
      console.error('Failed to start media recording:', error);
      throw error;
    }
  }, [startListening, refreshEvents, startVolumeMonitoring, stopVolumeMonitoring, startDurationTimer, stopDurationTimer]);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    // Stop Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    stopVolumeMonitoring();
    stopDurationTimer();
    stopListening();
  }, [stopListening, stopVolumeMonitoring, stopDurationTimer]);

  // Cancel current recording (slide to cancel)
  const cancelRecording = useCallback(() => {
    setIsCancelled(true);

    // Stop Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    // Stop MediaRecorder without processing
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    stopVolumeMonitoring();
    stopDurationTimer();
    setVoiceState('idle');
    clearCurrentInput();
  }, [setIsCancelled, setVoiceState, clearCurrentInput, stopVolumeMonitoring, stopDurationTimer]);

  // ======================== 新的 process 方法 ========================

  /**
   * 处理语音输入（使用新接口 POST /api/voice/process）
   */
  const handleProcessVoice = useCallback(
    async (audioBlob: Blob): Promise<ProcessResponse> => {
      try {
        const response = await process({
          inputType: 'VOICE',
          audio: audioBlob,
          language: settings.language,
        });

        // Refresh calendar events if needed
        await refreshEvents();

        return response;
      } catch (error) {
        console.error('Failed to process voice:', error);
        throw error;
      }
    },
    [process, settings.language, refreshEvents]
  );

  /**
   * 处理文本输入（使用新接口 POST /api/voice/process）
   */
  const handleProcessText = useCallback(
    async (text: string): Promise<ProcessResponse> => {
      try {
        const response = await process({
          inputType: 'TEXT',
          text: text,
          language: settings.language,
        });

        // Refresh calendar events if needed
        await refreshEvents();

        return response;
      } catch (error) {
        console.error('Failed to process text:', error);
        throw error;
      }
    },
    [process, settings.language, refreshEvents]
  );

  /**
   * 确认操作（使用新接口 POST /api/voice/confirm）
   */
  const handleConfirm = useCallback(
    async (messageId: string) => {
      try {
        await confirmAction({
          messageId,
          action: 'CONFIRM',
        });
        await refreshEvents();
      } catch (error) {
        console.error('Failed to confirm:', error);
        throw error;
      }
    },
    [confirmAction, refreshEvents]
  );

  /**
   * 取消操作
   */
  const handleCancel = useCallback(
    async (messageId: string) => {
      try {
        await confirmAction({
          messageId,
          action: 'CANCEL',
        });
      } catch (error) {
        console.error('Failed to cancel:', error);
        throw error;
      }
    },
    [confirmAction]
  );

  /**
   * 选择澄清选项
   */
  const handleSelectOption = useCallback(
    async (optionId: string) => {
      try {
        await selectClarificationOption(optionId);
        await refreshEvents();
      } catch (error) {
        console.error('Failed to select option:', error);
        throw error;
      }
    },
    [selectClarificationOption, refreshEvents]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopVolumeMonitoring();
      stopDurationTimer();
    };
  }, [stopVolumeMonitoring, stopDurationTimer]);

  return {
    // State
    voiceState,
    interimText,
    finalText,
    systemResponse,
    recognizedIntent,
    confidence,
    conversationHistory,
    loading,
    error,
    volume,
    recordingDuration,
    isCancelled,
    settings,
    // 新增状态
    currentMessage,
    clarificationOptions,

    // Formatters
    formattedDuration: formatDuration(recordingDuration),

    // Actions
    startRecording,
    stopRecording,
    cancelRecording,

    // 新的 process 和 confirm 方法
    process: handleProcessText,       // 文本处理（新接口）
    processVoice: handleProcessVoice, // 语音处理（新接口）
    confirm: handleConfirm,           // 确认操作
    cancel: handleCancel,             // 取消操作
    selectOption: handleSelectOption, // 选择澄清选项

    // [旧代码保留] 兼容旧接口
    processText: handleProcessText,
    processAudio: processAudio,

    clearCurrentInput,
    clearHistory,
    clearError,
    setVoiceState,
    updateSettings,
    setCurrentMessage,
    setClarificationOptions,
    fetchHistory,
  };
};

export default useVoice;
