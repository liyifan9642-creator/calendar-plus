package com.voicecal.service.message;

import com.voicecal.core.model.Message;
import com.voicecal.core.model.MessageStatus;
import com.voicecal.core.service.MessageService;
import com.voicecal.service.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of MessageService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MessageRepository messageRepository;

    @Override
    @Transactional
    public Message save(Message message) {
        if (message.getId() == null) {
            message.setId(UUID.randomUUID().toString());
        }
        if (message.getCreatedAt() == null) {
            message.setCreatedAt(LocalDateTime.now());
        }
        message.setUpdatedAt(LocalDateTime.now());

        log.info("Saving message: id={}, mode={}, status={}", message.getId(), message.getMode(), message.getStatus());
        return messageRepository.save(message);
    }

    @Override
    @Transactional
    public Message update(Message message) {
        message.setUpdatedAt(LocalDateTime.now());
        log.info("Updating message: id={}", message.getId());
        return messageRepository.save(message);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Message> findById(String id) {
        return messageRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Message> findBySessionId(String sessionId, int limit, int offset) {
        return messageRepository.findBySessionIdOrderByCreatedAtDesc(sessionId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Message> findPendingBySessionId(String sessionId) {
        return messageRepository.findBySessionIdAndStatus(sessionId, MessageStatus.NEED_CLARIFICATION);
    }

    @Override
    @Transactional
    public Message updateStatus(String id, MessageStatus status) {
        Optional<Message> optMessage = messageRepository.findById(id);
        if (optMessage.isPresent()) {
            Message message = optMessage.get();
            message.setStatus(status);
            message.setUpdatedAt(LocalDateTime.now());
            return messageRepository.save(message);
        }
        throw new RuntimeException("Message not found: " + id);
    }

    @Override
    @Transactional
    public void deleteById(String id) {
        log.info("Deleting message: id={}", id);
        messageRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public long countBySessionId(String sessionId) {
        return messageRepository.countBySessionId(sessionId);
    }
}
