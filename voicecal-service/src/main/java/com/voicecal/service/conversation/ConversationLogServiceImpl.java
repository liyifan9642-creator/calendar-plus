package com.voicecal.service.conversation;

import com.voicecal.core.model.ConversationLog;
import com.voicecal.core.service.ConversationLogService;
import com.voicecal.service.repository.ConversationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of ConversationLogService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationLogServiceImpl implements ConversationLogService {

    private final ConversationLogRepository conversationLogRepository;

    @Override
    @Transactional
    public ConversationLog save(ConversationLog conversationLog) {
        if (conversationLog.getId() == null) {
            conversationLog.setId(UUID.randomUUID().toString());
        }
        if (conversationLog.getCreatedAt() == null) {
            conversationLog.setCreatedAt(LocalDateTime.now());
        }

        log.debug("Saving conversation log: id={}, sessionId={}", conversationLog.getId(), conversationLog.getSessionId());
        return conversationLogRepository.save(conversationLog);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ConversationLog> findById(String id) {
        return conversationLogRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationLog> findBySessionId(String sessionId, int limit, int offset) {
        return conversationLogRepository.findBySessionIdOrderByCreatedAtDesc(
                sessionId, PageRequest.of(offset / limit, limit)).getContent();
    }

    @Override
    @Transactional(readOnly = true)
    public long countBySessionId(String sessionId) {
        return conversationLogRepository.countBySessionId(sessionId);
    }

    @Override
    @Transactional
    public void deleteBySessionId(String sessionId) {
        log.info("Deleting conversation logs for session: {}", sessionId);
        conversationLogRepository.deleteBySessionId(sessionId);
    }
}
