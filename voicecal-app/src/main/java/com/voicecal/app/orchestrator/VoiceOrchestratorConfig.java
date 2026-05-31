package com.voicecal.app.orchestrator;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for the VoiceOrchestrator.
 * All values can be overridden via application.yml/properties.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "voicecal.orchestrator")
public class VoiceOrchestratorConfig {

    /**
     * Maximum number of retry attempts for transient failures.
     */
    private int maxRetries = 3;

    /**
     * Base delay between retries in milliseconds.
     * Actual delay = baseRetryDelayMs * 2^(attempt-1) (exponential backoff).
     */
    private long baseRetryDelayMs = 500;

    /**
     * Minimum ASR confidence threshold below which the result is considered unreliable.
     */
    private double minAsrConfidence = 0.6;

    /**
     * Whether to require user confirmation for destructive operations (delete, update).
     */
    private boolean requireConfirmationForDestructive = true;

    /**
     * Default language for voice processing.
     */
    private String defaultLanguage = "zh-CN";

    /**
     * Whether to enable session context carryover between turns.
     */
    private boolean contextCarryoverEnabled = true;

    /**
     * Default event duration in minutes when only start time is provided.
     */
    private int defaultEventDurationMinutes = 60;

    /**
     * Response text templates for common scenarios.
     */
    private ResponseTemplates templates = new ResponseTemplates();

    @Data
    public static class ResponseTemplates {
        private String confirmationRequired = "您确定要{action}吗？请回复确认或取消。";
        private String eventCreated = "已为您创建日程：{title}，时间是{time}。";
        private String eventDeleted = "已删除日程：{title}。";
        private String eventUpdated = "已更新日程：{title}。";
        private String eventsFound = "找到{count}个日程：{events}。";
        private String noEventsFound = "在指定时间段内没有找到日程。";
        private String intentNotUnderstood = "抱歉，我没有理解您的意思，请再说一次。";
        private String processingError = "处理过程中出现了问题，请稍后重试。";
        private String asrFailed = "抱歉，我没有听清您说的话，请再说一次。";
        private String confirmationAccepted = "好的，已确认。";
        private String confirmationRejected = "好的，已取消操作。";
        private String available = "该时间段您有空。";
        private String notAvailable = "该时间段您已有其他安排。";
    }
}
