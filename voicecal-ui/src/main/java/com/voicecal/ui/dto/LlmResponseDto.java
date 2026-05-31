package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for LLM (Large Language Model) raw response information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmResponseDto {

    /** Intent identified by LLM (CREATE, DELETE, UPDATE, QUERY) */
    private String intent;

    /** Confidence score (0.0 - 1.0) */
    private Double confidence;

    /** Raw response text from LLM */
    private String rawResponse;
}
