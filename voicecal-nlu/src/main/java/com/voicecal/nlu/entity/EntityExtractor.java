package com.voicecal.nlu.entity;

import java.util.Map;

/**
 * Interface for entity extraction from text.
 */
public interface EntityExtractor {

    /**
     * Extract entities from input text.
     *
     * @param text the input text
     * @return map of entity type to entity value
     */
    Map<String, String> extract(String text);
}