package com.voicecal.core.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 消息实体 - 表示一次语音交互的完整信息
 * 用于在后端处理流程中传递和持久化用户意图、事件信息、冲突信息等
 */
@Entity
@Table(name = "messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    private String id;

    /**
     * 消息模式：CREATE, DELETE, UPDATE, QUERY
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageMode mode;

    /**
     * 消息状态：PENDING, CONFIRMED, EXECUTED, FAILED, NEED_CLARIFICATION
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageStatus status;

    // ======================== 事件内容 ========================

    /** 事件标题 */
    @Column(name = "title")
    private String title;

    /** 事件日期 */
    @Column(name = "event_date")
    private LocalDate date;

    /** 周范围查询的起始日期（本周一） */
    @Column(name = "week_start_date")
    private LocalDate weekStartDate;

    /** 开始时间 */
    @Column(name = "start_time")
    private LocalTime startTime;

    /** 结束时间 */
    @Column(name = "end_time")
    private LocalTime endTime;

    /** 地点 */
    @Column(name = "location", length = 500)
    private String location;

    /** 描述 */
    @Column(name = "description", length = 2000)
    private String description;

    // ======================== 目标事件（用于更新/删除） ========================

    /** 目标事件ID（用于更新/删除操作） */
    @Column(name = "target_event_id")
    private String targetEventId;

    // ======================== 冲突信息 ========================

    /** 冲突信息（JSON格式） */
    @Column(name = "conflicts_json", columnDefinition = "TEXT")
    private String conflictsJson;

    // ======================== 澄清信息 ========================

    /** 澄清问题 */
    @Column(name = "clarification_question", length = 1000)
    private String clarificationQuestion;

    // ======================== LLM 响应 ========================

    /** LLM原始响应（JSON格式） */
    @Column(name = "llm_response_json", columnDefinition = "TEXT")
    private String llmResponseJson;

    // ======================== 会话信息 ========================

    /** 会话ID */
    @Column(name = "session_id")
    private String sessionId;

    /** 用户ID */
    @Column(name = "user_id")
    private String userId;

    /** 用户原始输入 */
    @Column(name = "user_input", columnDefinition = "TEXT")
    private String userInput;

    /** 系统响应文本 */
    @Column(name = "response_text", columnDefinition = "TEXT")
    private String responseText;

    // ======================== 时间戳 ========================

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
