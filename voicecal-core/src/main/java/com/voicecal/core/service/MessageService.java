package com.voicecal.core.service;

import com.voicecal.core.model.Message;
import com.voicecal.core.model.MessageStatus;

import java.util.List;
import java.util.Optional;

/**
 * Service for managing Message objects.
 */
public interface MessageService {

    /**
     * Save a new message.
     */
    Message save(Message message);

    /**
     * Update an existing message.
     */
    Message update(Message message);

    /**
     * Find message by ID.
     */
    Optional<Message> findById(String id);

    /**
     * Find messages by session ID.
     */
    List<Message> findBySessionId(String sessionId, int limit, int offset);

    /**
     * Find pending messages by session ID.
     */
    List<Message> findPendingBySessionId(String sessionId);

    /**
     * Update message status.
     */
    Message updateStatus(String id, MessageStatus status);

    /**
     * Delete message by ID.
     */
    void deleteById(String id);

    /**
     * Count messages by session ID.
     */
    long countBySessionId(String sessionId);
}
