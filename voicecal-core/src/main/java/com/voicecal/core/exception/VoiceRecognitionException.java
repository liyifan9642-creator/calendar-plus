package com.voicecal.core.exception;

/**
 * Exception thrown when voice recognition fails.
 */
public class VoiceRecognitionException extends VoiceCalException {

    public VoiceRecognitionException(String message) {
        super(message, "VOICE_RECOGNITION_ERROR");
    }

    public VoiceRecognitionException(String message, Throwable cause) {
        super(message, "VOICE_RECOGNITION_ERROR", cause);
    }
}