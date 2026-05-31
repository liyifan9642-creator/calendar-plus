package com.voicecal.voice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuration properties for wakeword (keyword) detection via Porcupine.
 *
 * <p>Example application.yml:
 * <pre>
 * voicecal:
 *   voice:
 *     wakeword:
 *       enabled: true
 *       access-key: "${PORCUPINE_ACCESS_KEY}"
 *       keywords:
 *         - "日历助手"
 *       sensitivities:
 *         - 0.5
 *       model-path: ""
 *       library-path: ""
 * </pre>
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "voicecal.voice.wakeword")
public class WakewordConfig {

    /**
     * Whether wakeword detection is enabled.
     */
    private boolean enabled = true;

    /**
     * Picovoice access key (required by Porcupine SDK).
     * Obtain from https://console.picovoice.ai/
     */
    private String accessKey = "";

    /**
     * List of wakeword keywords to detect.
     * Each entry can be a built-in keyword name (e.g. "jarvis", "hey google")
     * or an absolute path to a custom .ppn keyword file.
     * Defaults to the Chinese keyword "日历助手" (Calendar Assistant).
     */
    private List<String> keywords = List.of("日历助手");

    /**
     * Sensitivity for each keyword (0.0 - 1.0).
     * If fewer values than keywords, the last value is reused.
     * Higher values increase the detection rate but also the false-positive rate.
     */
    private List<Float> sensitivities = List.of(0.5f);

    /**
     * Absolute path to a custom Porcupine model file (.pv).
     * Leave empty to use the default model.
     */
    private String modelPath = "";

    /**
     * Absolute path to the Porcupine native library.
     * Leave empty to use the bundled library.
     */
    private String libraryPath = "";

    /**
     * Audio sample rate expected by Porcupine (Hz).
     * Porcupine requires 16000 Hz; do not change unless using a custom model.
     */
    private int sampleRate = 16000;

    /**
     * Number of audio samples per frame required by Porcupine.
     * This value depends on the model and should normally not be changed.
     */
    private int frameLength = 512;
}
