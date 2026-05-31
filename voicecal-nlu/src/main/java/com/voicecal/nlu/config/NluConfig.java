package com.voicecal.nlu.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for NLU processing.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "voicecal.nlu")
public class NluConfig {

    private String defaultLanguage = "en";

    private boolean useMachineLearning = false;

    private double confidenceThreshold = 0.6;

    private IntentConfig intent = new IntentConfig();

    private EntityConfig entity = new EntityConfig();

    private TimeParserConfig timeParser = new TimeParserConfig();

    @Data
    public static class IntentConfig {
        private String recognizerType = "keyword";
        private boolean cachingEnabled = true;
    }

    @Data
    public static class EntityConfig {
        private boolean dateTimeExtractionEnabled = true;
        private boolean locationExtractionEnabled = true;
        private boolean attendeeExtractionEnabled = true;
    }

    @Data
    public static class TimeParserConfig {
        /**
         * Whether to prefer future dates when the expression is ambiguous.
         * For example, "周一" on a Monday could mean today or next Monday.
         */
        private boolean preferFuture = true;

        /**
         * Confidence threshold below which results are discarded.
         */
        private double confidenceThreshold = 0.5;

        /**
         * Whether to enable the fallback regex parser when Time-NLP fails.
         */
        private boolean fallbackEnabled = true;

        /**
         * Default AM/PM resolution when expression is ambiguous
         * (e.g., "两点" without 上午/下午). Options: "pm" (default), "am", "context".
         */
        private String ambiguousTimeResolution = "pm";
    }
}