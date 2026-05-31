package com.voicecal.nlu.time;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Result of parsing a Chinese natural language time expression.
 * Contains the resolved LocalDateTime along with metadata about the parse.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeParseResult {

    /**
     * The resolved date and time. May be null if parsing failed.
     */
    private LocalDateTime dateTime;

    /**
     * The original text expression that was parsed (e.g. "明天下午两点").
     */
    private String originalExpression;

    /**
     * The normalized time string produced by the parser (e.g. "2024-01-02 14:00:00").
     */
    private String normalizedTime;

    /**
     * Whether the parsed time represents an all-day event (no specific hour/minute).
     */
    private boolean allDay;

    /**
     * Whether the time expression was ambiguous and required disambiguation.
     * For example, "下午两点" could be interpreted as 02:00 or 14:00.
     */
    private boolean wasAmbiguous;

    /**
     * The disambiguation note if the time was ambiguous.
     */
    private String disambiguationNote;

    /**
     * Confidence score of the parse result (0.0 to 1.0).
     */
    private double confidence;

    /**
     * Whether parsing was successful.
     */
    public boolean isParsed() {
        return dateTime != null;
    }
}
