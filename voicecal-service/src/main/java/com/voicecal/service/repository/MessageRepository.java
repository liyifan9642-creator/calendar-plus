package com.voicecal.service.repository;

import com.voicecal.core.model.Message;
import com.voicecal.core.model.MessageMode;
import com.voicecal.core.model.MessageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Message 仓库接口
 */
@Repository
public interface MessageRepository extends JpaRepository<Message, String> {

    /**
     * 根据会话ID查询消息列表
     */
    List<Message> findBySessionIdOrderByCreatedAtDesc(String sessionId);

    /**
     * 根据会话ID和状态查询消息
     */
    List<Message> findBySessionIdAndStatus(String sessionId, MessageStatus status);

    /**
     * 根据用户ID查询消息列表
     */
    List<Message> findByUserIdOrderByCreatedAtDesc(String userId);

    /**
     * 根据模式查询消息
     */
    List<Message> findByMode(MessageMode mode);

    /**
     * 查询指定时间范围内的消息
     */
    @Query("SELECT m FROM Message m WHERE m.createdAt BETWEEN :start AND :end ORDER BY m.createdAt DESC")
    List<Message> findByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * 查询需要澄清的消息
     */
    List<Message> findByStatus(MessageStatus status);

    /**
     * 根据目标事件ID查询消息
     */
    List<Message> findByTargetEventId(String targetEventId);

    /**
     * 统计会话中的消息数量
     */
    long countBySessionId(String sessionId);
}
