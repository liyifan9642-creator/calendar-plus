package com.voicecal.voice.recognition;

import com.voicecal.voice.config.SherpaAsrConfig;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Manages the lifecycle of the Sherpa-ONNX streaming recognizer and its
 * underlying model resources.
 *
 * <p>This class loads the model once at application start-up and exposes
 * factory methods that {@link SherpaAsrService} calls for every recognition
 * session. The {@code OnlineRecognizer} instances produced by
 * {@link #createRecognizer()} <b>must</b> be closed by the caller when
 * the session ends.</p>
 */
@Slf4j
@Component
public class SherpaModelManager {

    private final SherpaAsrConfig config;
    private volatile boolean initialised = false;

    public SherpaModelManager(SherpaAsrConfig config) {
        this.config = config;
    }

    @PostConstruct
    public void init() {
        if (!config.isEnabled()) {
            log.info("Sherpa-ONNX ASR is disabled via configuration");
            return;
        }
        validateModelFiles();
        loadNativeLibrary();
        initialised = true;
        log.info("SherpaModelManager initialised successfully");
    }

    @PreDestroy
    public void shutdown() {
        initialised = false;
        log.info("SherpaModelManager shut down");
    }

    /**
     * Create a new {@code OnlineRecognizer} for a streaming session.
     *
     * <p>The returned object implements {@code AutoCloseable}; callers
     * <b>must</b> close it when the session ends to release native memory.</p>
     *
     * @return a fresh OnlineRecognizer
     * @throws IllegalStateException if the manager has not been initialised
     */
    public OnlineRecognizerHandle createRecognizer() {
        if (!initialised) {
            throw new IllegalStateException("SherpaModelManager is not initialised");
        }
        return OnlineRecognizerHandle.create(config);
    }

    public boolean isInitialised() {
        return initialised;
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    private void validateModelFiles() {
        Path dir = Paths.get(config.getModelDir());
        if (!Files.isDirectory(dir)) {
            throw new IllegalStateException(
                    "Sherpa model directory does not exist: " + dir.toAbsolutePath());
        }
        String[] required = {
                config.getEncoderModel(),
                config.getDecoderModel(),
                config.getJoinerModel(),
                config.getTokens()
        };
        for (String f : required) {
            Path p = dir.resolve(f);
            if (!Files.isRegularFile(p)) {
                throw new IllegalStateException(
                        "Required model file not found: " + p.toAbsolutePath());
            }
        }
        log.info("Sherpa model files validated in {}", dir.toAbsolutePath());
    }

    private void loadNativeLibrary() {
        try {
            // sherpa-onnx-java ships its native libs inside the JAR and
            // extracts them automatically via JNI_OnLoad. We just need to
            // trigger class-loading.
            Class.forName("com.k2fsa.sherpa.onnx.OnlineRecognizer");
            log.info("sherpa-onnx native library loaded");
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException(
                    "sherpa-onnx-java SDK not found on classpath. "
                            + "Add the sherpa-onnx-java dependency to pom.xml.", e);
        }
    }

    // ------------------------------------------------------------------
    // Wrapper that hides direct sherpa-onnx types behind a thin handle
    // so the rest of the project does not hard-depend on the JNI class.
    // ------------------------------------------------------------------

    /**
     * Lightweight wrapper around
     * {@code com.k2fsa.sherpa.onnx.OnlineRecognizer}.
     *
     * <p>This avoids a hard compile-time dependency on the native SDK in
     * every file while still allowing full streaming usage at runtime.</p>
     */
    public static class OnlineRecognizerHandle implements AutoCloseable {

        private final Object recognizer;       // com.k2fsa.sherpa.onnx.OnlineRecognizer
        private final Object onlineStream;     // com.k2fsa.sherpa.onnx.OnlineStream
        private volatile boolean closed = false;

        private OnlineRecognizerHandle(Object recognizer, Object onlineStream) {
            this.recognizer = recognizer;
            this.onlineStream = onlineStream;
        }

        /**
         * Build config, create the native recognizer and one stream.
         */
        static OnlineRecognizerHandle create(SherpaAsrConfig cfg) {
            try {
                // --- Build OnlineTransducerModelConfig ---
                Class<?> transCfgClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig");
                Object transCfg = transCfgClass
                        .getConstructor(String.class, String.class, String.class)
                        .newInstance(
                                Paths.get(cfg.getModelDir(), cfg.getEncoderModel()).toString(),
                                Paths.get(cfg.getModelDir(), cfg.getDecoderModel()).toString(),
                                Paths.get(cfg.getModelDir(), cfg.getJoinerModel()).toString());

                // --- Build OnlineModelConfig ---
                Class<?> modelCfgClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineModelConfig");
                Object modelCfg = modelCfgClass
                        .getConstructor(transCfgClass)
                        .newInstance(transCfg);

                // Set tokens
                Class<?> modelCfgBuilder = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineModelConfig");
                // tokens is a field on OnlineModelConfig
                setField(modelCfg, "tokens",
                        Paths.get(cfg.getModelDir(), cfg.getTokens()).toString());
                setField(modelCfg, "numThreads", cfg.getNumThreads());
                setField(modelCfg, "provider", "cpu");

                // --- Build OnlineRecognizerConfig ---
                Class<?> recCfgClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineRecognizerConfig");
                Object recCfg = recCfgClass.getConstructor().newInstance();
                setField(recCfg, "modelConfig", modelCfg);
                setField(recCfg, "sampleRate", cfg.getSampleRate());
                setField(recCfg, "enableEndpoint", true);
                // endpoint rule 1: silence > threshold
                setField(recCfg, "rule1MinTrailingSilence", cfg.getSilenceDurationMs() / 1000f);
                setField(recCfg, "rule2MinTrailingSilence", cfg.getSilenceDurationMs() / 1000f);
                setField(recCfg, "rule3MinUtteranceLength", 20.0f);

                // --- Create OnlineRecognizer ---
                Class<?> recClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineRecognizer");
                Object recognizer = recClass
                        .getMethod("create", recCfgClass)
                        .invoke(null, recCfg);

                // --- Create OnlineStream ---
                Object stream = recClass
                        .getMethod("createStream")
                        .invoke(recognizer);

                log.info("Sherpa OnlineRecognizer created (sampleRate={}, lang={})",
                        cfg.getSampleRate(), cfg.getLanguage());
                return new OnlineRecognizerHandle(recognizer, stream);

            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException(
                        "Failed to create Sherpa OnlineRecognizer", e);
            }
        }

        /**
         * Accept a chunk of audio.  Samples must be float, normalised to [-1, 1].
         */
        public void acceptWaveform(float[] samples) {
            checkNotClosed();
            try {
                Class<?> streamClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineStream");
                streamClass.getMethod("acceptWaveform", float[].class, int.class)
                        .invoke(onlineStream, samples, 16000);
            } catch (ReflectiveOperationException e) {
                throw new RuntimeException("acceptWaveform failed", e);
            }
        }

        /**
         * Check whether the recognizer has enough data to produce a result.
         */
        public boolean isReady() {
            checkNotClosed();
            try {
                Class<?> recClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineRecognizer");
                return (boolean) recClass
                        .getMethod("isReady", Class.forName(
                                "com.k2fsa.sherpa.onnx.OnlineStream"))
                        .invoke(recognizer, onlineStream);
            } catch (ReflectiveOperationException e) {
                throw new RuntimeException("isReady check failed", e);
            }
        }

        /**
         * Decode available frames and return the current (partial) text.
         */
        public String decode() {
            checkNotClosed();
            try {
                Class<?> recClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineRecognizer");
                Class<?> streamClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineStream");
                recClass.getMethod("decode", streamClass)
                        .invoke(recognizer, onlineStream);
                Object result = recClass
                        .getMethod("getResult", streamClass)
                        .invoke(recognizer, onlineStream);
                return (String) result.getClass().getMethod("getText").invoke(result);
            } catch (ReflectiveOperationException e) {
                throw new RuntimeException("decode failed", e);
            }
        }

        /**
         * Signal that no more audio will be fed (flush remaining).
         */
        public void inputFinished() {
            checkNotClosed();
            try {
                Class<?> streamClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineStream");
                streamClass.getMethod("inputFinished").invoke(onlineStream);
            } catch (ReflectiveOperationException e) {
                throw new RuntimeException("inputFinished failed", e);
            }
        }

        /**
         * Check whether the recognizer detects an endpoint (utterance boundary).
         */
        public boolean isEndpoint() {
            checkNotClosed();
            try {
                Class<?> recClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineRecognizer");
                return (boolean) recClass
                        .getMethod("isEndpoint", Class.forName(
                                "com.k2fsa.sherpa.onnx.OnlineStream"))
                        .invoke(recognizer, onlineStream);
            } catch (ReflectiveOperationException e) {
                throw new RuntimeException("isEndpoint check failed", e);
            }
        }

        /**
         * Reset the stream for the next utterance (after endpoint).
         */
        public void resetStream() {
            checkNotClosed();
            try {
                Class<?> recClass = Class.forName(
                        "com.k2fsa.sherpa.onnx.OnlineRecognizer");
                recClass.getMethod("reset", Class.forName(
                                "com.k2fsa.sherpa.onnx.OnlineStream"))
                        .invoke(recognizer, onlineStream);
            } catch (ReflectiveOperationException e) {
                throw new RuntimeException("resetStream failed", e);
            }
        }

        @Override
        public void close() {
            if (closed) return;
            closed = true;
            try {
                Class.forName("com.k2fsa.sherpa.onnx.OnlineStream")
                        .getMethod("release").invoke(onlineStream);
            } catch (Exception ignored) { }
            try {
                Class.forName("com.k2fsa.sherpa.onnx.OnlineRecognizer")
                        .getMethod("release").invoke(recognizer);
            } catch (Exception ignored) { }
            log.debug("OnlineRecognizerHandle closed");
        }

        private void checkNotClosed() {
            if (closed) throw new IllegalStateException("Handle is already closed");
        }

        private static void setField(Object obj, String field, Object value) {
            try {
                java.lang.reflect.Field f = obj.getClass().getDeclaredField(field);
                f.setAccessible(true);
                f.set(obj, value);
            } catch (NoSuchFieldException | IllegalAccessException e) {
                log.warn("Could not set field {} on {}: {}", field,
                        obj.getClass().getSimpleName(), e.getMessage());
            }
        }
    }
}
