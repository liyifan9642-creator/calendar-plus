package com.voicecal.core.service;

import com.voicecal.core.model.Intent;
import com.voicecal.core.model.VoiceCommand;

import java.util.Map;

/**
 * Core interface for Natural Language Understanding operations.
 */
public interface NluService {

    /**
     * Parse intent from text.
     *
     * @param text the input text
     * @return the recognized intent
     */
    Intent parseIntent(String text);

    /**
     * Extract entities from text.
     *
     * @param text the input text
     * @return map of entity type to entity value
     */
    Map<String, String> extractEntities(String text);

    /**
     * Process text into a complete voice command with intent and entities.
     *
     * @param text the input text
     * @return the parsed voice command
     */
    VoiceCommand processText(String text);
}