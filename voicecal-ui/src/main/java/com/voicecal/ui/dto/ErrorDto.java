package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for error information in API responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorDto {

    /** Error code (e.g., ASR_FAILED, LLM_TIMEOUT, EVENT_NOT_FOUND) */
    private String code;

    /** User-friendly error message */
    private String message;
}
