package com.voicecal.core.dto.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 冲突判断结果 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictResult {

    /** 处理动作：CREATE_NEW, REPLACE, MODIFY */
    private String action;

    /** 目标事件ID（替换或修改时指定） */
    private String targetEventId;

    /** 是否需要用户澄清 */
    private boolean needClarification;

    /** 澄清问题 */
    private String clarificationQuestion;

    /** LLM 原始响应 */
    private String rawResponse;
}
