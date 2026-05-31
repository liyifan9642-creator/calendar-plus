package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for the unified /api/voice/process endpoint.
 * Supports both voice (audio) and text input modes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessRequest {

    /** Input type: VOICE or TEXT */
    private String inputType;

    /** Text input (required when inputType=TEXT) */
    private String text;

    /** Audio data encoded as Base64 (required when inputType=VOICE) */
    private String audio;

    /** Session ID for multi-turn conversations */
    private String sessionId;

    /** Language code (e.g., zh-CN, en-US) */
    private String language;
}
