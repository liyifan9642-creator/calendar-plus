package com.voicecal.voice.audio;

import com.voicecal.core.model.AudioStream;
import lombok.extern.slf4j.Slf4j;

import javax.sound.sampled.*;
import java.io.InputStream;

/**
 * Captures audio from the system microphone using {@code javax.sound.sampled}.
 *
 * <p>Produces an {@link AudioStream} configured for 16 kHz, 16-bit, mono PCM --
 * the format expected by the Sherpa-ONNX streaming recognizer.</p>
 *
 * <h3>Usage</h3>
 * <pre>{@code
 *   MicrophoneCapture mic = new MicrophoneCapture();
 *   if (mic.isAvailable()) {
 *       AudioStream stream = mic.startCapture();
 *       // feed stream to AsrService ...
 *       mic.stopCapture();
 *   }
 * }</pre>
 */
@Slf4j
public class MicrophoneCapture {

    private static final AudioFormat TARGET_FORMAT =
            new AudioFormat(16000f, 16, 1, true, false); // 16 kHz, 16-bit, mono, signed, little-endian

    private TargetDataLine line;
    private volatile boolean capturing = false;

    /**
     * Check whether a microphone is available on this system.
     */
    public boolean isAvailable() {
        try {
            DataLine.Info info = new DataLine.Info(TargetDataLine.class, TARGET_FORMAT);
            return AudioSystem.isLineSupported(info);
        } catch (Exception e) {
            log.warn("Microphone availability check failed", e);
            return false;
        }
    }

    /**
     * Start capturing audio from the default microphone.
     *
     * @return an AudioStream backed by the live microphone input
     * @throws LineUnavailableException if the microphone line cannot be opened
     */
    public AudioStream startCapture() throws LineUnavailableException {
        if (capturing) {
            throw new IllegalStateException("Already capturing");
        }

        DataLine.Info info = new DataLine.Info(TargetDataLine.class, TARGET_FORMAT);
        line = (TargetDataLine) AudioSystem.getLine(info);
        line.open(TARGET_FORMAT, line.getBufferSize() > 0 ? line.getBufferSize() : 16000);
        line.start();
        capturing = true;

        InputStream micStream = new InputStream() {
            @Override
            public int read() {
                // Not efficient; bulk read() below is the primary path
                byte[] single = new byte[1];
                int n = read(single, 0, 1);
                return n <= 0 ? -1 : (single[0] & 0xFF);
            }

            @Override
            public int read(byte[] b, int off, int len) {
                if (!capturing || line == null) return -1;
                return line.read(b, off, len);
            }

            @Override
            public void close() {
                stopCapture();
            }
        };

        log.info("Microphone capture started ({} Hz, {}-bit, mono)",
                (int) TARGET_FORMAT.getSampleRate(),
                TARGET_FORMAT.getSampleSizeInBits());
        return new AudioStream(micStream, AudioStream.AudioFormat.PCM, 16000, 1);
    }

    /**
     * Stop capturing and release the microphone line.
     */
    public void stopCapture() {
        capturing = false;
        if (line != null) {
            line.stop();
            line.close();
            line = null;
            log.info("Microphone capture stopped");
        }
    }

    /**
     * Return a list of available audio input (microphone) info strings
     * for diagnostics.
     */
    public static String[] listAvailableMicrophones() {
        Mixer.Info[] mixers = AudioSystem.getMixerInfo();
        java.util.List<String> names = new java.util.ArrayList<>();
        for (Mixer.Info mi : mixers) {
            Mixer mixer = AudioSystem.getMixer(mi);
            Line.Info[] lines = mixer.getTargetLineInfo();
            if (lines.length > 0) {
                names.add(mi.getName() + " - " + mi.getDescription());
            }
        }
        return names.toArray(new String[0]);
    }
}
