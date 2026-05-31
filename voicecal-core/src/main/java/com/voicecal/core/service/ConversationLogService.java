package com.voicecal.core.service;

import com.voicecal.core.model.ConversationLog;

import java.util.List;
import java.util.Optional;

/**
 * Service for managing conversation history.
 */
public interface ConversationLogService {

    /**
     * Save a conversation log entry.
     */
    ConversationLog save(ConversationLog log);

    /**
     * Find conversation log by ID.
     */
    Optional<ConversationLog> findById(String id);

    /**
     * Find conversation history by session ID with pagination.
     */
    List<ConversationLog> findBySessionId(String sessionId, int limit, int offset);

    /**
     * Count conversation logs by session ID.
     */
    long countBySessionId(String sessionId);

    /**
     * Delete conversation logs by session ID.
     */
    void deleteBySessionId(String sessionId);
}
