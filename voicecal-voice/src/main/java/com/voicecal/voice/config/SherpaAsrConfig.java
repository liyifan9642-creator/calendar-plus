package com.voicecal.voice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Sherpa-ONNX ASR configuration properties.
 *
 * <p>Maps to {@code voicecal.asr.sherpa.*} in application YAML.</p>
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "voicecal.asr.sherpa")
public class SherpaAsrConfig {

    /** Whether Sherpa-ONNX ASR is enabled. */
    private boolean enabled = true;

    /** Path to the offline/streaming transducer model directory. */
    private String modelDir = "models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20";

    /** Encoder ONNX model filename inside modelDir. */
    private String encoderModel = "encoder-epoch-99-avg-1.int8.onnx";

    /** Decoder ONNX model filename inside modelDir. */
    private String decoderModel = "decoder-epoch-99-avg-1.onnx";

    /** Joiner ONNX model filename inside modelDir. */
    private String joinerModel = "joiner-epoch-99-avg-1.int8.onnx";

    /** Tokens filename inside modelDir. */
    private String tokens = "tokens.txt";

    /** Number of threads used by the Sherpa-ONNX runtime. */
    private int numThreads = 4;

    /** Audio sample rate expected by the model (Hz). */
    private int sampleRate = 16000;

    /** Language hint for the recognizer (e.g. "zh", "en"). */
    private String language = "zh";

    /** Whether to enable hot-words / context phrases. */
    private boolean hotwordsEnabled = false;

    /** Semicolon-delimited hot-words, e.g. "打开日历;创建会议". */
    private String hotwords = "";

    /** Hot-words score bonus. */
    private float hotwordsScore = 1.5f;

    /** Audio preprocessing: enable noise reduction. */
    private boolean noiseReductionEnabled = true;

    /** Noise reduction strength (0.0 - 1.0). */
    private float noiseReductionStrength = 0.5f;

    /** Audio preprocessing: enable automatic gain control. */
    private boolean agcEnabled = true;

    /** Target RMS level for AGC (0.0 - 1.0). */
    private float agcTargetLevel = 0.6f;

    /** Maximum gain factor for AGC. */
    private float agcMaxGain = 10.0f;

    /** Silence threshold for VAD-based endpoint detection (RMS). */
    private float silenceThreshold = 0.01f;

    /** Duration of silence (ms) that triggers end-of-utterance. */
    private long silenceDurationMs = 1500;

    /** Maximum recording duration (ms) before forced stop. */
    private long maxRecordingDurationMs = 30000;
}
