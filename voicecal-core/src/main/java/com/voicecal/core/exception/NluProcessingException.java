package com.voicecal.core.exception;

/**
 * Exception thrown when NLU processing fails.
 */
public class NluProcessingException extends VoiceCalException {

    public NluProcessingException(String message) {
        super(message, "NLU_PROCESSING_ERROR");
    }

    public NluProcessingException(String message, Throwable cause) {
        super(message, "NLU_PROCESSING_ERROR", cause);
    }
}