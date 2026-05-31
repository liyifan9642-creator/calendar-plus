package com.voicecal.core.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Represents a processed voice command with extracted intent and entities.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceCommand {

    private UUID id;

    private String rawText;

    private String processedText;

    private Intent intent;

    private Map<String, String> entities;

    private Double confidence;

    private String language;

    private LocalDateTime timestamp;
}