package com.voicecal.nlu.entity;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts location entities from text.
 */
@Slf4j
@Component
public class LocationEntityExtractor implements EntityExtractor {

    private static final Pattern LOCATION_PATTERN = Pattern.compile(
            "\\b(?:at|in|@)\\s+([A-Z][a-zA-Z\\s]+(?:Room|Hall|Building|Office|Center|Centre|Park|Plaza|Street|Ave|Avenue|Blvd|Road|Rd)\\b[^,.]*)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern ROOM_PATTERN = Pattern.compile(
            "\\b(?:room|suite|office|floor)\\s*#?\\s*(\\d+[A-Za-z]?)\\b",
            Pattern.CASE_INSENSITIVE
    );

    @Override
    public Map<String, String> extract(String text) {
        Map<String, String> entities = new HashMap<>();

        if (text == null || text.isBlank()) {
            return entities;
        }

        // Extract location with keywords
        Matcher locationMatcher = LOCATION_PATTERN.matcher(text);
        if (locationMatcher.find()) {
            entities.put("location", locationMatcher.group(1).trim());
        }

        // Extract room numbers
        Matcher roomMatcher = ROOM_PATTERN.matcher(text);
        if (roomMatcher.find()) {
            entities.put("room", roomMatcher.group(1));
        }

        log.debug("Extracted location entities: {} from text: {}", entities, text);
        return entities;
    }
}