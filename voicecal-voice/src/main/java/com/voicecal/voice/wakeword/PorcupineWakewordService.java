package com.voicecal.voice.wakeword;

import com.voicecal.voice.config.WakewordConfig;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import ai.picovoice.porcupine.*;
import ai.picovoice.porcupine.Porcupine;

import javax.sound.sampled.*;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Wakeword detection service backed by the Picovoice Porcupine engine.
 *
 * <p>This service runs a low-power background thread that continuously reads
 * microphone audio frames and feeds them to Porcupine for keyword detection.
 * When a wakeword is detected all registered {@link WakewordListener}s are
 * notified.
 *
 * <p>The service is conditionally enabled via the
 * {@code voicecal.voice.wakeword.enabled} property (default: true).
 *
 * <h3>Usage</h3>
 * <pre>{@code
 * @Autowired
 * private WakewordService wakewordService;
 *
 * @PostConstruct
 * public void init() {
 *     wakewordService.addListener(new WakewordListener() {
 *         public void onWakewordDetected(int idx, String keyword) {
 *             // launch voice command pipeline
 *         }
 *         public void onError(Exception e) { ... }
 *     });
 *     wakewordService.startListening();
 * }
 * }</pre>
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "voicecal.voice.wakeword.enabled", havingValue = "true", matchIfMissing = true)
public class PorcupineWakewordService implements WakewordService {

    private final WakewordConfig config;
    private final List<WakewordListener> listeners = new CopyOnWriteArrayList<>();
    private final AtomicBoolean listening = new AtomicBoolean(false);

    private Porcupine porcupine;
    private TargetDataLine microphone;
    private Thread listenerThread;

    public PorcupineWakewordService(WakewordConfig config) {
        this.config = config;
    }

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    @PostConstruct
    public void init() {
        if (!config.isEnabled()) {
            log.info("Wakeword detection is disabled by configuration");
            return;
        }
        try {
            porcupine = buildPorcupine();
            log.info("Porcupine wakeword engine initialised – keywords: {}, sensitivities: {}",
                    config.getKeywords(), config.getSensitivities());
        } catch (PorcupineException e) {
            log.error("Failed to initialise Porcupine engine", e);
            throw new IllegalStateException("Cannot start wakeword service", e);
        }
    }

    @PreDestroy
    public void destroy() {
        stopListening();
        releasePorcupine();
    }

    // ------------------------------------------------------------------
    // WakewordService
    // ------------------------------------------------------------------

    @Override
    public void startListening() {
        if (!config.isEnabled()) {
            log.warn("Wakeword detection is disabled – ignoring startListening()");
            return;
        }
        if (listening.getAndSet(true)) {
            log.debug("Already listening for wakeword");
            return;
        }

        try {
            openMicrophone();
        } catch (LineUnavailableException e) {
            listening.set(false);
            notifyError(e);
            throw new IllegalStateException("Cannot open microphone", e);
        }

        listenerThread = new Thread(this::listenLoop, "wakeword-listener");
        listenerThread.setDaemon(true);
        listenerThread.start();
        log.info("Wakeword listening started");
    }

    @Override
    public void stopListening() {
        if (!listening.getAndSet(false)) {
            return;
        }
        log.info("Stopping wakeword listening");

        if (listenerThread != null) {
            listenerThread.interrupt();
            try {
                listenerThread.join(3000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            listenerThread = null;
        }

        closeMicrophone();
        log.info("Wakeword listening stopped");
    }

    @Override
    public boolean isListening() {
        return listening.get();
    }

    @Override
    public void addListener(WakewordListener listener) {
        if (listener != null) {
            listeners.add(listener);
        }
    }

    @Override
    public void removeListener(WakewordListener listener) {
        listeners.remove(listener);
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    /**
     * Main audio-processing loop. Reads frames from the microphone and
     * passes them to Porcupine. Runs in a daemon thread so it will not
     * prevent JVM shutdown.
     */
    private void listenLoop() {
        final int frameLength = porcupine.getFrameLength();
        final int bytesPerFrame = frameLength * 2; // 16-bit PCM = 2 bytes/sample
        final byte[] buffer = new byte[bytesPerFrame];

        log.debug("Listen loop started – frameLength={}, bytesPerFrame={}", frameLength, bytesPerFrame);

        while (listening.get() && !Thread.currentThread().isInterrupted()) {
            try {
                int bytesRead = microphone.read(buffer, 0, buffer.length);
                if (bytesRead < buffer.length) {
                    log.warn("Incomplete audio frame read: {}/{} bytes", bytesRead, buffer.length);
                    continue;
                }

                // Convert byte array to short array (little-endian 16-bit PCM)
                short[] pcm = new short[frameLength];
                for (int i = 0; i < frameLength; i++) {
                    pcm[i] = (short) ((buffer[i * 2] & 0xFF) | (buffer[i * 2 + 1] << 8));
                }

                int keywordIndex = porcupine.process(pcm);
                if (keywordIndex >= 0) {
                    String detected = getKeywordLabel(keywordIndex);
                    log.info("Wakeword detected: '{}' (index={})", detected, keywordIndex);
                    notifyDetected(keywordIndex, detected);
                }
            } catch (Exception e) {
                if (listening.get()) {
                    log.error("Error in wakeword listen loop", e);
                    notifyError(e);
                }
            }
        }

        log.debug("Listen loop exited");
    }

    /**
     * Build the Porcupine instance from configuration.
     */
    private Porcupine buildPorcupine() throws PorcupineException {
        List<String> keywords = config.getKeywords();
        List<Float> sensitivities = config.getSensitivities();

        // Pad sensitivities list to match keywords size
        float[] sens = new float[keywords.size()];
        for (int i = 0; i < sens.length; i++) {
            sens[i] = (i < sensitivities.size()) ? sensitivities.get(i) : sensitivities.get(sensitivities.size() - 1);
        }

        Porcupine.Builder builder = new Porcupine.Builder()
                .setAccessKey(config.getAccessKey())
                .setSensitivities(sens);

        // Model path (optional)
        String modelPath = config.getModelPath();
        if (modelPath != null && !modelPath.isBlank()) {
            builder.setModelPath(modelPath);
        }

        // Library path (optional)
        String libraryPath = config.getLibraryPath();
        if (libraryPath != null && !libraryPath.isBlank()) {
            builder.setLibraryPath(libraryPath);
        }

        // Keywords – each entry is either a built-in keyword name or a path to a .ppn file
        // Porcupine 3.x API: setKeywordPaths(String[]) for .ppn files, setBuiltInKeywords(BuiltInKeyword[]) for built-in
        List<String> keywordPaths = new java.util.ArrayList<>();
        List<Porcupine.BuiltInKeyword> builtInKeywords = new java.util.ArrayList<>();
        for (String kw : keywords) {
            if (kw.endsWith(".ppn")) {
                keywordPaths.add(kw);
            } else {
                builtInKeywords.add(Porcupine.BuiltInKeyword.valueOf(kw));
            }
        }
        if (!keywordPaths.isEmpty()) {
            builder.setKeywordPaths(keywordPaths.toArray(new String[0]));
        }
        if (!builtInKeywords.isEmpty()) {
            builder.setBuiltInKeywords(builtInKeywords.toArray(new Porcupine.BuiltInKeyword[0]));
        }

        return builder.build();
    }

    /**
     * Return a human-readable label for the detected keyword index.
     */
    private String getKeywordLabel(int index) {
        List<String> keywords = config.getKeywords();
        if (index >= 0 && index < keywords.size()) {
            return keywords.get(index);
        }
        return "unknown-" + index;
    }

    /**
     * Open the system microphone for 16-bit mono PCM at the configured sample rate.
     */
    private void openMicrophone() throws LineUnavailableException {
        AudioFormat format = new AudioFormat(
                config.getSampleRate(), 16, 1, true, false);
        DataLine.Info info = new DataLine.Info(TargetDataLine.class, format);

        if (!AudioSystem.isLineSupported(info)) {
            throw new LineUnavailableException(
                    "Microphone line not supported for format: " + format);
        }

        microphone = (TargetDataLine) AudioSystem.getLine(info);
        microphone.open(format);
        microphone.start();
        log.debug("Microphone opened – sampleRate={}, frameLength={}",
                config.getSampleRate(), config.getFrameLength());
    }

    /**
     * Close and release the microphone.
     */
    private void closeMicrophone() {
        if (microphone != null) {
            microphone.stop();
            microphone.close();
            microphone = null;
        }
    }

    /**
     * Release Porcupine native resources.
     */
    private void releasePorcupine() {
        if (porcupine != null) {
            try {
                porcupine.delete();
            } catch (Exception e) {
                log.warn("Error releasing Porcupine resources", e);
            }
            porcupine = null;
        }
    }

    /**
     * Notify all listeners of a wakeword detection.
     */
    private void notifyDetected(int keywordIndex, String keyword) {
        for (WakewordListener listener : listeners) {
            try {
                listener.onWakewordDetected(keywordIndex, keyword);
            } catch (Exception e) {
                log.error("WakewordListener threw exception in onWakewordDetected", e);
            }
        }
    }

    /**
     * Notify all listeners of an error.
     */
    private void notifyError(Exception error) {
        for (WakewordListener listener : listeners) {
            try {
                listener.onError(error);
            } catch (Exception e) {
                log.error("WakewordListener threw exception in onError", e);
            }
        }
    }
}
