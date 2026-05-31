package com.voicecal.app.orchestrator;

import com.voicecal.core.model.Intent;
import com.voicecal.core.model.VoiceCommand;
import com.voicecal.nlu.time.TimeParseResult;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Represents an active voice interaction session.
 * Maintains conversation state, context, and history across multiple turns.
 */
@Data
public class VoiceSession {

    /**
     * Unique session identifier.
     */
    private final String sessionId;

    /**
     * User identifier for multi-user support.
     */
    private String userId;

    /**
     * Current state of the session.
     */
    private SessionState state;

    /**
     * Session creation timestamp.
     */
    private final LocalDateTime createdAt;

    /**
     * Last activity timestamp for timeout detection.
     */
    private LocalDateTime lastActivityAt;

    /**
     * Current conversation turn number.
     */
    private int turnNumber;

    /**
     * History of voice commands in this session.
     */
    private final List<VoiceCommand> commandHistory;

    /**
     * History of orchestrator responses in this session.
     */
    private final List<OrchestratorResponse> responseHistory;

    /**
     * Accumulated context entities from the conversation.
     * Persists across turns for context-aware processing.
     */
    private final Map<String, String> contextEntities;

    /**
     * Pending confirmation state for destructive operations.
     */
    private PendingConfirmation pendingConfirmation;

    /**
     * Preferred language for this session.
     */
    private String language;

    /**
     * Last parsed time result for context carryover.
     */
    private TimeParseResult lastTimeResult;

    /**
     * Last recognized intent for context carryover.
     */
    private Intent lastIntent;

    public VoiceSession(String sessionId) {
        this.sessionId = sessionId;
        this.state = SessionState.CREATED;
        this.createdAt = LocalDateTime.now();
        this.lastActivityAt = LocalDateTime.now();
        this.turnNumber = 0;
        this.commandHistory = new ArrayList<>();
        this.responseHistory = new ArrayList<>();
        this.contextEntities = new HashMap<>();
        this.language = "zh-CN";
    }

    /**
     * Start a new turn in the session.
     */
    public void beginTurn() {
        this.turnNumber++;
        this.lastActivityAt = LocalDateTime.now();
        this.state = SessionState.LISTENING;
    }

    /**
     * Record a voice command in the session history.
     */
    public void addCommand(VoiceCommand command) {
        this.commandHistory.add(command);
        this.lastActivityAt = LocalDateTime.now();
        if (command.getIntent() != null) {
            this.lastIntent = command.getIntent();
        }
    }

    /**
     * Record an orchestrator response in the session history.
     */
    public void addResponse(OrchestratorResponse response) {
        this.responseHistory.add(response);
    }

    /**
     * Merge new entities into the session context.
     * New values override existing ones for the same key.
     */
    public void mergeContextEntities(Map<String, String> newEntities) {
        if (newEntities != null) {
            this.contextEntities.putAll(newEntities);
        }
    }

    /**
     * Check if the session has timed out.
     *
     * @param timeoutMinutes the timeout duration in minutes
     * @return true if the session has been inactive longer than the timeout
     */
    public boolean isTimedOut(int timeoutMinutes) {
        return LocalDateTime.now().isAfter(
                this.lastActivityAt.plusMinutes(timeoutMinutes));
    }

    /**
     * Set a pending confirmation for a destructive operation.
     */
    public void setPendingConfirmation(Intent intent, Map<String, String> entities) {
        this.pendingConfirmation = new PendingConfirmation(intent, entities);
        this.state = SessionState.AWAITING_CONFIRMATION;
    }

    /**
     * Clear the pending confirmation after user responds.
     */
    public void clearPendingConfirmation() {
        this.pendingConfirmation = null;
        if (this.state == SessionState.AWAITING_CONFIRMATION) {
            this.state = SessionState.PROCESSING;
        }
    }

    /**
     * Check if there is a pending confirmation awaiting user response.
     */
    public boolean hasPendingConfirmation() {
        return this.pendingConfirmation != null;
    }

    /**
     * Session state enumeration.
     */
    public enum SessionState {
        /** Session just created */
        CREATED,
        /** Listening for voice input */
        LISTENING,
        /** Processing voice input */
        PROCESSING,
        /** Awaiting user confirmation for destructive action */
        AWAITING_CONFIRMATION,
        /** Executing calendar operation */
        EXECUTING,
        /** Generating TTS response */
        RESPONDING,
        /** Session completed one turn successfully */
        COMPLETED,
        /** Session encountered an error */
        ERROR,
        /** Session timed out or was terminated */
        TERMINATED
    }

    /**
     * Represents a pending confirmation request.
     */
    @Data
    public static class PendingConfirmation {
        private final Intent intent;
        private final Map<String, String> entities;
        private final LocalDateTime requestedAt;

        public PendingConfirmation(Intent intent, Map<String, String> entities) {
            this.intent = intent;
            this.entities = entities != null ? entities : new HashMap<>();
            this.requestedAt = LocalDateTime.now();
        }
    }
}
