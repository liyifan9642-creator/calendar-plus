package com.voicecal.service.repository;

import com.voicecal.core.model.ConversationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 对话历史记录仓库接口
 */
@Repository
public interface ConversationLogRepository extends JpaRepository<ConversationLog, String> {

    /**
     * 根据会话ID查询对话历史
     */
    Page<ConversationLog> findBySessionIdOrderByCreatedAtDesc(String sessionId, Pageable pageable);

    /**
     * 根据用户ID查询对话历史
     */
    Page<ConversationLog> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    /**
     * 查询指定时间范围内的对话历史
     */
    @Query("SELECT c FROM ConversationLog c WHERE c.createdAt BETWEEN :start AND :end ORDER BY c.createdAt DESC")
    List<ConversationLog> findByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * 根据会话ID统计对话数量
     */
    long countBySessionId(String sessionId);

    /**
     * 查询最近的对话记录
     */
    @Query("SELECT c FROM ConversationLog c WHERE c.sessionId = :sessionId ORDER BY c.createdAt DESC")
    List<ConversationLog> findRecentBySessionId(@Param("sessionId") String sessionId, Pageable pageable);

    /**
     * 根据会话ID删除对话记录
     */
    void deleteBySessionId(String sessionId);
}
