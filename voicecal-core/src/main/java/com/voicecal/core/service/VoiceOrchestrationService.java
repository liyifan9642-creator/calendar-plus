package com.voicecal.core.service;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

/**
 * Interface for voice orchestration - the full ASR -> NLU -> Calendar -> TTS pipeline.
 */
public interface VoiceOrchestrationService {

    /**
     * Process a voice command from audio input.
     */
    Map<String, Object> handleAudio(InputStream audioStream, String sessionId, String userId, String language);

    /**
     * Process a text command directly.
     */
    Map<String, Object> handleText(String text, String sessionId, String userId, String language);

    /**
     * Confirm a pending message operation.
     * @param messageId the message ID to confirm
     * @param sessionId the session ID
     * @return the result of the confirmation
     */
    Map<String, Object> confirmMessage(String messageId, String sessionId);

    /**
     * Cancel a pending message operation.
     * @param messageId the message ID to cancel
     * @param sessionId the session ID
     * @return the result of the cancellation
     */
    Map<String, Object> cancelMessage(String messageId, String sessionId);

    /**
     * Select a clarification option.
     * @param messageId the message ID
     * @param optionId the selected option ID
     * @param sessionId the session ID
     * @return the result after option selection
     */
    Map<String, Object> selectOption(String messageId, String optionId, String sessionId);

    /**
     * Get message by ID.
     * @param messageId the message ID
     * @return the message as a map
     */
    Map<String, Object> getMessageById(String messageId);

    /**
     * Get conversation history for a session.
     * @param sessionId the session ID
     * @param limit max number of items
     * @param offset pagination offset
     * @return list of conversation items
     */
    List<Map<String, Object>> getConversationHistory(String sessionId, int limit, int offset);
}
