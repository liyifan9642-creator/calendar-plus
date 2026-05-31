package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for the unified /api/voice/process and /api/voice/confirm endpoints.
 * Contains the parsed Message object and system response text.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessResponse {

    /** Whether the operation was successful */
    private boolean success;

    /** The parsed Message object */
    private MessageDto message;

    /** System response text (for display or TTS) */
    private String responseText;

    /** Clarification options (when status=NEED_CLARIFICATION) */
    private List<ClarificationOptionDto> options;

    /** Error information (when success=false) */
    private ErrorDto error;
}
