package com.voicecal.voice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for voice processing.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "voicecal.voice")
public class VoiceConfig {

    private String defaultLanguage = "en-US";

    private SpeechRecognitionConfig recognition = new SpeechRecognitionConfig();

    private SpeechSynthesisConfig synthesis = new SpeechSynthesisConfig();

    @Data
    public static class SpeechRecognitionConfig {
        private boolean enabled = true;
        /** Provider: "google" or "sherpa" */
        private String provider = "sherpa";
        private int sampleRate = 16000;
        private boolean streamingEnabled = true;
    }

    @Data
    public static class SpeechSynthesisConfig {
        private boolean enabled = true;
        private String provider = "google";
        private String defaultVoice = "en-US-Neural2-F";
        private double defaultSpeed = 1.0;
    }
}