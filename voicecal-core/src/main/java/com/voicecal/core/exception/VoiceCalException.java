package com.voicecal.core.exception;

/**
 * Base exception for Voice Calendar application.
 */
public class VoiceCalException extends RuntimeException {

    private final String errorCode;

    public VoiceCalException(String message) {
        super(message);
        this.errorCode = "VOICECAL_ERROR";
    }

    public VoiceCalException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public VoiceCalException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "VOICECAL_ERROR";
    }

    public VoiceCalException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}