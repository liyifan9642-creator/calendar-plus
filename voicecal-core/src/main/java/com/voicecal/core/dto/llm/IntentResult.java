package com.voicecal.core.dto.llm;

import com.voicecal.core.model.MessageMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 意图识别结果 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntentResult {

    /** 识别的意图：CREATE, DELETE, UPDATE, QUERY */
    private MessageMode intent;

    /** 识别置信度 0.0-1.0 */
    private double confidence;

    /** 提取的实体信息 */
    private Map<String, String> entities;

    /** 信息是否完整 */
    private boolean isComplete;

    /** 缺失的字段列表 */
    private List<String> missingFields;

    /** 补充说明 */
    private String message;

    /** LLM 原始响应 */
    private String rawResponse;
}
