package com.voicecal.nlu.entity;

import com.voicecal.nlu.time.TimeParseResult;
import com.voicecal.nlu.time.TimeParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts date and time entities from text.
 * Combines regex-based extraction for standard formats with Time-NLP
 * powered parsing for Chinese natural language time expressions.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DateTimeEntityExtractor implements EntityExtractor {

    private static final DateTimeFormatter ISO_FORMATTER =
            DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final TimeParserService timeParserService;

    private static final Pattern DATE_PATTERN = Pattern.compile(
            "\\b(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4}|\\d{1,2}-\\d{1,2}-\\d{4})\\b"
    );

    private static final Pattern TIME_PATTERN = Pattern.compile(
            "\\b(\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s*[AaPp][Mm])?)\\b"
    );

    private static final Pattern RELATIVE_DATE_PATTERN = Pattern.compile(
            "\\b(today|tomorrow|next\\s+\\w+|this\\s+\\w+|in\\s+\\d+\\s+\\w+)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern DURATION_PATTERN = Pattern.compile(
            "\\b(\\d+)\\s*(hour|hours|minute|minutes|day|days|week|weeks)\\b",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Pattern to detect if text contains Chinese characters (for routing to Time-NLP).
     */
    private static final Pattern CHINESE_CHAR_PATTERN = Pattern.compile(
            "[\\u4e00-\\u9fff]"
    );

    @Override
    public Map<String, String> extract(String text) {
        Map<String, String> entities = new HashMap<>();

        if (text == null || text.isBlank()) {
            return entities;
        }

        // First, try Chinese time parsing via TimeParserService
        if (containsChinese(text)) {
            extractChineseTime(text, entities);
        }

        // Also extract explicit English-format dates
        Matcher dateMatcher = DATE_PATTERN.matcher(text);
        if (dateMatcher.find()) {
            entities.putIfAbsent("date", dateMatcher.group(1));
        }

        // Extract times (English format)
        Matcher timeMatcher = TIME_PATTERN.matcher(text);
        if (timeMatcher.find()) {
            entities.putIfAbsent("time", timeMatcher.group(1));
        }

        // Extract relative dates (English)
        Matcher relativeMatcher = RELATIVE_DATE_PATTERN.matcher(text);
        if (relativeMatcher.find()) {
            entities.putIfAbsent("relative_date", relativeMatcher.group(1));
        }

        // Extract duration
        Matcher durationMatcher = DURATION_PATTERN.matcher(text);
        if (durationMatcher.find()) {
            entities.putIfAbsent("duration",
                    durationMatcher.group(1) + " " + durationMatcher.group(2));
        }

        log.debug("Extracted entities: {} from text: {}", entities, text);
        return entities;
    }

    /**
     * Extract time entities from Chinese text using TimeParserService.
     */
    private void extractChineseTime(String text, Map<String, String> entities) {
        try {
            List<TimeParseResult> results = timeParserService.parse(text);
            if (results.isEmpty()) {
                return;
            }

            TimeParseResult primary = results.get(0);
            if (primary.isParsed()) {
                LocalDateTime dateTime = primary.getDateTime();
                entities.put("datetime", dateTime.format(ISO_FORMATTER));
                entities.put("date", dateTime.toLocalDate().toString());
                entities.put("time", dateTime.toLocalTime().toString());
                entities.put("original_time_expression", primary.getOriginalExpression());

                if (primary.isAllDay()) {
                    entities.put("all_day", "true");
                }

                if (primary.isWasAmbiguous()) {
                    entities.put("time_ambiguous", "true");
                    if (primary.getDisambiguationNote() != null) {
                        entities.put("disambiguation", primary.getDisambiguationNote());
                    }
                }

                log.debug("Chinese time parsed: {} -> {}", primary.getOriginalExpression(),
                        dateTime);
            }

            // If multiple time expressions found, store them all
            if (results.size() > 1) {
                StringBuilder sb = new StringBuilder();
                for (int i = 1; i < results.size(); i++) {
                    TimeParseResult r = results.get(i);
                    if (r.isParsed()) {
                        if (sb.length() > 0) sb.append(";");
                        sb.append(r.getOriginalExpression())
                          .append("=")
                          .append(r.getDateTime().format(ISO_FORMATTER));
                    }
                }
                if (sb.length() > 0) {
                    entities.put("additional_times", sb.toString());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract Chinese time from '{}': {}", text, e.getMessage());
        }
    }

    /**
     * Check if the text contains any Chinese characters.
     */
    private boolean containsChinese(String text) {
        return CHINESE_CHAR_PATTERN.matcher(text).find();
    }
}
