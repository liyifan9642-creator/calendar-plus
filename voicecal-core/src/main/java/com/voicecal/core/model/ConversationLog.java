package com.voicecal.core.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 对话历史记录实体 - 存储用户与系统的对话记录
 */
@Entity
@Table(name = "conversation_log", indexes = {
    @Index(name = "idx_conv_session_id", columnList = "session_id"),
    @Index(name = "idx_conv_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationLog {

    @Id
    private String id;

    /** 会话ID */
    @Column(name = "session_id", nullable = false)
    private String sessionId;

    /** 用户ID */
    @Column(name = "user_id")
    private String userId;

    // ======================== 用户输入 ========================

    /** 输入方式：VOICE, TEXT */
    @Column(name = "input_type", nullable = false, length = 10)
    private String inputType;

    /** 用户输入文本 */
    @Column(name = "user_input", nullable = false, columnDefinition = "TEXT")
    private String userInput;

    // ======================== 系统响应 ========================

    /** 系统响应文本 */
    @Column(name = "system_response", columnDefinition = "TEXT")
    private String systemResponse;

    /** Message对象（JSON格式） */
    @Column(name = "message_json", columnDefinition = "TEXT")
    private String messageJson;

    // ======================== 元数据 ========================

    /** 识别的意图 */
    @Column(name = "intent", length = 20)
    private String intent;

    /** 意图识别置信度 */
    @Column(name = "confidence", precision = 3, scale = 2)
    private BigDecimal confidence;

    /** 处理耗时（毫秒） */
    @Column(name = "processing_time_ms")
    private Integer processingTimeMs;

    // ======================== 时间戳 ========================

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
