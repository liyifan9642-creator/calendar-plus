package com.voicecal.core.exception;

/**
 * ASR服务异常
 */
public class AsrServiceException extends VoiceCalException {

    public AsrServiceException(String message) {
        super(message, "ASR_ERROR");
    }

    public AsrServiceException(String errorCode, String message) {
        super(message, errorCode);
    }

    public AsrServiceException(String errorCode, String message, Throwable cause) {
        super(message, errorCode, cause);
    }

    /**
     * 音频流异常
     */
    public static class AudioStreamException extends AsrServiceException {
        public AudioStreamException(String message) {
            super("AUDIO_STREAM_ERROR", message);
        }

        public AudioStreamException(String message, Throwable cause) {
            super("AUDIO_STREAM_ERROR", message, cause);
        }
    }

    /**
     * 识别失败异常
     */
    public static class RecognitionFailedException extends AsrServiceException {
        public RecognitionFailedException(String message) {
            super("RECOGNITION_FAILED", message);
        }

        public RecognitionFailedException(String message, Throwable cause) {
            super("RECOGNITION_FAILED", message, cause);
        }
    }

    /**
     * 服务不可用异常
     */
    public static class ServiceUnavailableException extends AsrServiceException {
        public ServiceUnavailableException(String message) {
            super("SERVICE_UNAVAILABLE", message);
        }
    }
}
