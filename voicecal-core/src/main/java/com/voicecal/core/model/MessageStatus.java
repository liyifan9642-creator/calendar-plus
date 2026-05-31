package com.voicecal.core.model;

/**
 * 消息状态枚举 - 表示消息的处理状态
 */
public enum MessageStatus {
    /** 待确认 - 等待用户确认 */
    PENDING,
    /** 已确认 - 用户已确认，等待执行 */
    CONFIRMED,
    /** 已执行 - 操作已成功执行 */
    EXECUTED,
    /** 失败 - 操作执行失败 */
    FAILED,
    /** 需要澄清 - 需要用户提供更多信息 */
    NEED_CLARIFICATION
}
