package com.voicecal.core.model;

/**
 * 消息模式枚举 - 表示用户意图的操作类型
 */
public enum MessageMode {
    /** 创建事件 */
    CREATE,
    /** 删除事件 */
    DELETE,
    /** 更新事件 */
    UPDATE,
    /** 查询事件 */
    QUERY
}
