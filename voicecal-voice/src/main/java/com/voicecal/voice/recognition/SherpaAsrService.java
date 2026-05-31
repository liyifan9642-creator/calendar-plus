package com.voicecal.voice.recognition;

import com.voicecal.core.dto.AsrCallback;
import com.voicecal.core.dto.AsrResult;
import com.voicecal.core.model.AsrStatus;
import com.voicecal.core.model.AsrStatus.RecognitionState;
import com.voicecal.core.model.AudioStream;
import com.voicecal.core.service.AsrService;
import com.voicecal.voice.audio.AudioPreprocessor;
import com.voicecal.voice.config.SherpaAsrConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Sherpa-ONNX based ASR service that implements the core {@link AsrService}
 * contract.
 *
 * <h3>Features</h3>
 * <ul>
 *     <li>Streaming recognition via Sherpa-ONNX OnlineRecognizer</li>
 *     <li>Real-time partial results pushed through {@link AsrCallback}</li>
 *     <li>Audio preprocessing: noise reduction + automatic gain control</li>
 *     <li>Endpoint detection for automatic utterance segmentation</li>
 *     <li>16 kHz mono PCM input</li>
 *     <li>Chinese Mandarin + English bilingual model support</li>
 * </ul>
 *
 * <h3>Usage</h3>
 * <pre>{@code
 *   @Autowired private AsrService asrService;
 *
 *   asrService.startRecognition(audioStream, new AsrCallback() { ... });
 *   // ... partial results arrive via onPartialResult()
 *   // ... final result arrives via onResult()
 *   asrService.stopRecognition();
 * }</pre>
 */
@Slf4j
@Service
@ConditionalOnBean(SherpaModelManager.class)
public class SherpaAsrService implements AsrService {

    private static final int READ_BUFFER_SAMPLES = 1600; // 100 ms at 16 kHz
    private static final int READ_BUFFER_BYTES = READ_BUFFER_SAMPLES * 2; // 16-bit = 2 bytes/sample

    private final SherpaAsrConfig config;
    private final SherpaModelManager modelManager;
    private final AudioPreprocessor preprocessor;

    private final AtomicReference<RecognitionState> state =
            new AtomicReference<>(RecognitionState.IDLE);
    private volatile ExecutorService executor;
    private volatile Thread recognitionThread;
    private volatile boolean stopRequested = false;

    public SherpaAsrService(SherpaAsrConfig config, SherpaModelManager modelManager) {
        this.config = config;
        this.modelManager = modelManager;
        this.preprocessor = new AudioPreprocessor(config);
        log.info("SherpaAsrService created");
    }

    // -----------------------------------------------------------------
    // AsrService implementation
    // -----------------------------------------------------------------

    @Override
    public void startRecognition(AudioStream stream, AsrCallback callback) {
        if (state.get() == RecognitionState.LISTENING || state.get() == RecognitionState.PROCESSING) {
            throw new IllegalStateException("Recognition is already in progress; call stopRecognition() first");
        }

        if (!modelManager.isInitialised()) {
            callback.onError("SERVICE_UNAVAILABLE", "Sherpa model manager is not initialised");
            return;
        }

        stopRequested = false;
        state.set(RecognitionState.LISTENING);
        preprocessor.reset();

        executor = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "sherpa-asr-worker");
            t.setDaemon(true);
            return t;
        });

        executor.submit(() -> runRecognitionLoop(stream, callback));
        log.info("Recognition started");
    }

    @Override
    public void stopRecognition() {
        stopRequested = true;
        log.info("Stop requested");
        // The worker thread will observe stopRequested and exit.
    }

    @Override
    public AsrStatus getStatus() {
        AsrStatus status = new AsrStatus(state.get());
        status.setLastUpdated(java.time.LocalDateTime.now());
        return status;
    }

    // -----------------------------------------------------------------
    // Recognition loop
    // -----------------------------------------------------------------

    private void runRecognitionLoop(AudioStream stream, AsrCallback callback) {
        SherpaModelManager.OnlineRecognizerHandle handle = null;
        try {
            handle = modelManager.createRecognizer();
            callback.onRecognitionStart();

            InputStream audioIn = stream.getInputStream();
            byte[] buffer = new byte[READ_BUFFER_BYTES];
            long silenceStart = -1;
            long totalAudioMs = 0;

            while (!stopRequested) {
                int bytesRead = readFully(audioIn, buffer);
                if (bytesRead <= 0) {
                    // End of stream
                    log.debug("End of audio stream reached");
                    break;
                }

                // Adjust if odd byte count
                if (bytesRead < buffer.length) {
                    byte[] trimmed = new byte[bytesRead];
                    System.arraycopy(buffer, 0, trimmed, 0, bytesRead);
                    buffer = trimmed;
                }

                // --- Audio preprocessing ---
                float[] samples = preprocessor.processToFloat(buffer);
                if (samples.length == 0) continue;

                // --- Volume callback ---
                float rms = AudioPreprocessor.computeRms(buffer);
                try {
                    callback.onVolumeChanged(rms);
                } catch (Exception ignored) { }

                // --- Feed audio to recognizer ---
                handle.acceptWaveform(samples);

                // --- Decode loop: consume all available frames ---
                while (handle.isReady() && !stopRequested) {
                    handle.decode();
                }

                // --- Get current partial text ---
                String partialText = handle.decode(); // get latest result
                if (partialText != null && !partialText.isEmpty()) {
                    state.set(RecognitionState.PROCESSING);
                    AsrResult partial = new AsrResult(partialText, 0.0, false);
                    try {
                        callback.onPartialResult(partial);
                    } catch (Exception e) {
                        log.warn("Error in onPartialResult callback", e);
                    }
                }

                // --- Endpoint detection ---
                if (handle.isEndpoint()) {
                    String finalText = partialText != null ? partialText : "";
                    log.info("Endpoint detected, text: '{}'", finalText);

                    if (!finalText.isEmpty()) {
                        AsrResult result = new AsrResult(finalText, 1.0, true);
                        try {
                            callback.onResult(result);
                        } catch (Exception e) {
                            log.warn("Error in onResult callback", e);
                        }
                    }

                    // Reset for next utterance
                    handle.resetStream();
                    silenceStart = -1;
                    state.set(RecognitionState.LISTENING);
                } else {
                    // --- Silence-based endpoint ---
                    totalAudioMs += READ_BUFFER_SAMPLES * 1000L / config.getSampleRate();
                    if (rms < config.getSilenceThreshold()) {
                        if (silenceStart < 0) {
                            silenceStart = System.currentTimeMillis();
                        } else if (System.currentTimeMillis() - silenceStart > config.getSilenceDurationMs()) {
                            log.info("Silence endpoint detected after {} ms",
                                    System.currentTimeMillis() - silenceStart);
                            // Force endpoint
                            if (partialText != null && !partialText.isEmpty()) {
                                AsrResult result = new AsrResult(partialText, 1.0, true);
                                try {
                                    callback.onResult(result);
                                } catch (Exception e) {
                                    log.warn("Error in onResult callback", e);
                                }
                            }
                            handle.resetStream();
                            silenceStart = -1;
                            state.set(RecognitionState.LISTENING);
                        }
                    } else {
                        silenceStart = -1;
                    }
                }

                // --- Max duration guard ---
                if (totalAudioMs > config.getMaxRecordingDurationMs()) {
                    log.warn("Max recording duration reached ({} ms)", totalAudioMs);
                    break;
                }
            }

            // --- Flush: signal end-of-input ---
            handle.inputFinished();
            while (handle.isReady()) {
                handle.decode();
            }
            String finalText = handle.decode();
            if (finalText != null && !finalText.isEmpty()) {
                AsrResult result = new AsrResult(finalText, 1.0, true);
                try {
                    callback.onResult(result);
                } catch (Exception e) {
                    log.warn("Error in final onResult callback", e);
                }
            }

            state.set(RecognitionState.COMPLETED);
            callback.onRecognitionEnd();
            log.info("Recognition completed normally");

        } catch (Exception e) {
            log.error("Recognition error", e);
            state.set(RecognitionState.ERROR);
            try {
                callback.onError("RECOGNITION_FAILED", e.getMessage());
            } catch (Exception ignored) { }
        } finally {
            if (handle != null) {
                handle.close();
            }
            if (executor != null) {
                executor.shutdown();
                executor = null;
            }
            recognitionThread = null;
        }
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    /**
     * Read exactly {@code buf.length} bytes (or fewer at end-of-stream).
     */
    private int readFully(InputStream in, byte[] buf) throws IOException {
        int totalRead = 0;
        while (totalRead < buf.length) {
            int n = in.read(buf, totalRead, buf.length - totalRead);
            if (n < 0) break;
            totalRead += n;
        }
        return totalRead;
    }
}
