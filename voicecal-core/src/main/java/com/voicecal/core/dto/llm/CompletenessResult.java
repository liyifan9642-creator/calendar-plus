package com.voicecal.core.dto.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 信息完整性判断结果 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompletenessResult {

    /** 信息是否完整 */
    private boolean isComplete;

    /** 缺失的字段列表 */
    private List<String> missingFields;

    /** 建议用户补充的内容 */
    private String suggestions;

    /** LLM 原始响应 */
    private String rawResponse;
}
