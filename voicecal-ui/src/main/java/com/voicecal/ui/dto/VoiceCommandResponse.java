package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO for voice command responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceCommandResponse {

    private String commandId;
    private String rawText;
    private String intent;
    private Map<String, String> entities;
    private Double confidence;
    private String message;
}