package com.voicecal.core.service;

import com.voicecal.core.dto.llm.CompletenessResult;
import com.voicecal.core.dto.llm.ConflictResult;
import com.voicecal.core.dto.llm.IntentResult;
import com.voicecal.core.model.CalendarEvent;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * LLM 服务接口 - 提供基于大语言模型的自然语言理解能力
 * 
 * <p>职责：
 * <ul>
 *   <li>意图识别：分析用户输入，识别 CREATE/DELETE/UPDATE/QUERY 意图</li>
 *   <li>信息完整性判断：检查提取的实体信息是否完整</li>
 *   <li>冲突判断：当新事件与已有事件时间冲突时，判断用户真实意图</li>
 * </ul>
 */
public interface LlmService {

    /**
     * 意图识别
     * 
     * @param userInput 用户输入文本
     * @param currentTime 当前时间（用于相对时间解析）
     * @return 意图识别结果
     */
    IntentResult recognizeIntent(String userInput, LocalDateTime currentTime);

    /**
     * 信息完整性判断
     * 
     * @param entities 提取的实体信息
     * @return 完整性判断结果
     */
    CompletenessResult checkCompleteness(Map<String, String> entities);

    /**
     * 冲突判断
     * 当用户创建的事件与已有事件时间冲突时，调用此方法判断用户的真实意图
     * 
     * @param userInput 用户原始输入
     * @param newEvent 新事件信息
     * @param existingEvents 已存在的事件列表（时间冲突的）
     * @return 冲突判断结果
     */
    ConflictResult resolveConflict(String userInput, CalendarEvent newEvent, List<CalendarEvent> existingEvents);
}
