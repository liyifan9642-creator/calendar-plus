package com.voicecal.nlu.entity;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts attendee entities from text.
 */
@Slf4j
@Component
public class AttendeeEntityExtractor implements EntityExtractor {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b"
    );

    private static final Pattern WITH_PATTERN = Pattern.compile(
            "\\b(?:with|and)\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\b"
    );

    @Override
    public Map<String, String> extract(String text) {
        Map<String, String> entities = new HashMap<>();

        if (text == null || text.isBlank()) {
            return entities;
        }

        // Extract email addresses
        List<String> emails = new ArrayList<>();
        Matcher emailMatcher = EMAIL_PATTERN.matcher(text);
        while (emailMatcher.find()) {
            emails.add(emailMatcher.group());
        }
        if (!emails.isEmpty()) {
            entities.put("attendees_email", String.join(",", emails));
        }

        // Extract names after "with" or "and"
        List<String> names = new ArrayList<>();
        Matcher nameMatcher = WITH_PATTERN.matcher(text);
        while (nameMatcher.find()) {
            names.add(nameMatcher.group(1));
        }
        if (!names.isEmpty()) {
            entities.put("attendees_name", String.join(",", names));
        }

        log.debug("Extracted attendee entities: {} from text: {}", entities, text);
        return entities;
    }
}