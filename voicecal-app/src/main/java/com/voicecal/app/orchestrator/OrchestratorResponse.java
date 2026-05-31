package com.voicecal.app.orchestrator;

import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.Intent;
import com.voicecal.core.model.VoiceCommand;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Structured response from the VoiceOrchestrator.
 * Contains the result of processing a voice command end-to-end.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrchestratorResponse {

    /**
     * Unique response identifier.
     */
    private String responseId;

    /**
     * Associated session identifier.
     */
    private String sessionId;

    /**
     * The voice command that triggered this response.
     */
    private VoiceCommand voiceCommand;

    /**
     * The recognized intent.
     */
    private Intent intent;

    /**
     * Extracted and resolved entities.
     */
    private Map<String, String> entities;

    /**
     * The natural language response text to be spoken by TTS.
     */
    private String responseText;

    /**
     * TTS audio data for the response (WAV format).
     */
    private byte[] responseAudio;

    /**
     * Calendar events affected by the operation (created, updated, found, etc.).
     */
    private List<CalendarEvent> affectedEvents;

    /**
     * Whether the operation was successful.
     */
    private boolean success;

    /**
     * Error code if the operation failed, null otherwise.
     */
    private String errorCode;

    /**
     * Error message if the operation failed, null otherwise.
     */
    private String errorMessage;

    /**
     * Processing metadata for diagnostics.
     */
    private ProcessingMetadata metadata;

    /**
     * Timestamp when the response was generated.
     */
    private LocalDateTime timestamp;

    /**
     * Whether this response requires user confirmation before execution.
     */
    private boolean requiresConfirmation;

    /**
     * Create a success response.
     */
    public static OrchestratorResponse success(String sessionId, VoiceCommand command,
                                                 String responseText, byte[] responseAudio) {
        return OrchestratorResponse.builder()
                .responseId(java.util.UUID.randomUUID().toString())
                .sessionId(sessionId)
                .voiceCommand(command)
                .intent(command.getIntent())
                .entities(command.getEntities())
                .responseText(responseText)
                .responseAudio(responseAudio)
                .success(true)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Create an error response.
     */
    public static OrchestratorResponse error(String sessionId, String errorCode,
                                               String errorMessage) {
        return OrchestratorResponse.builder()
                .responseId(java.util.UUID.randomUUID().toString())
                .sessionId(sessionId)
                .success(false)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Create a confirmation-required response.
     */
    public static OrchestratorResponse needsConfirmation(String sessionId,
                                                           VoiceCommand command,
                                                           String confirmationText) {
        return OrchestratorResponse.builder()
                .responseId(java.util.UUID.randomUUID().toString())
                .sessionId(sessionId)
                .voiceCommand(command)
                .intent(command.getIntent())
                .entities(command.getEntities())
                .responseText(confirmationText)
                .success(true)
                .requiresConfirmation(true)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Processing metadata for performance diagnostics.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProcessingMetadata {
        private long asrDurationMs;
        private long timeParseDurationMs;
        private long nluDurationMs;
        private long calendarDurationMs;
        private long ttsDurationMs;
        private long totalDurationMs;
        private int retryCount;
        private double asrConfidence;
        private double nluConfidence;
    }
}
