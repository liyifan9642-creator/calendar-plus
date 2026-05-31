package com.voicecal.voice.audio;

import com.voicecal.voice.config.SherpaAsrConfig;
import lombok.extern.slf4j.Slf4j;

/**
 * Audio preprocessing pipeline for ASR input.
 *
 * <p>Applies noise reduction and automatic gain control (AGC) to raw 16-bit
 * PCM audio before feeding it to the Sherpa-ONNX recognizer.</p>
 */
@Slf4j
public class AudioPreprocessor {

    private final boolean noiseReductionEnabled;
    private final float noiseReductionStrength;
    private final boolean agcEnabled;
    private final float agcTargetLevel;
    private final float agcMaxGain;

    /* ---- noise-reduction state ---- */
    private float previousSample = 0f;
    private float noiseFloor = 0f;
    private static final float NOISE_FLOOR_ALPHA = 0.01f;

    /* ---- AGC state ---- */
    private float currentGain = 1.0f;
    private static final float AGC_SMOOTHING = 0.002f;

    public AudioPreprocessor(SherpaAsrConfig config) {
        this.noiseReductionEnabled = config.isNoiseReductionEnabled();
        this.noiseReductionStrength = clamp(config.getNoiseReductionStrength(), 0f, 1f);
        this.agcEnabled = config.isAgcEnabled();
        this.agcTargetLevel = clamp(config.getAgcTargetLevel(), 0f, 1f);
        this.agcMaxGain = Math.max(1f, config.getAgcMaxGain());
        log.debug("AudioPreprocessor initialised: NR={} (strength={}), AGC={} (target={}, maxGain={})",
                noiseReductionEnabled, noiseReductionStrength,
                agcEnabled, agcTargetLevel, agcMaxGain);
    }

    /**
     * Process a chunk of raw 16-bit PCM (little-endian) audio in-place.
     *
     * @param pcm16 raw PCM bytes (modified in-place)
     * @return the same array after processing
     */
    public byte[] process(byte[] pcm16) {
        if (pcm16 == null || pcm16.length < 2) {
            return pcm16;
        }

        int sampleCount = pcm16.length / 2;
        for (int i = 0; i < sampleCount; i++) {
            int idx = i * 2;
            // little-endian 16-bit signed -> float [-1, 1]
            float sample = (short) ((pcm16[idx] & 0xFF) | (pcm16[idx + 1] << 8)) / 32768f;

            if (noiseReductionEnabled) {
                sample = applyNoiseReduction(sample);
            }
            if (agcEnabled) {
                sample = applyAgc(sample);
            }

            // float -> 16-bit little-endian
            short out = (short) (clamp(sample, -1f, 1f) * 32767f);
            pcm16[idx] = (byte) (out & 0xFF);
            pcm16[idx + 1] = (byte) ((out >> 8) & 0xFF);
        }
        return pcm16;
    }

    /**
     * Process and return a new float array (normalised to [-1, 1]) suitable
     * for {@code OnlineRecognizer.acceptWaveform()}.
     */
    public float[] processToFloat(byte[] pcm16) {
        if (pcm16 == null || pcm16.length < 2) {
            return new float[0];
        }
        int sampleCount = pcm16.length / 2;
        float[] out = new float[sampleCount];
        for (int i = 0; i < sampleCount; i++) {
            int idx = i * 2;
            float sample = (short) ((pcm16[idx] & 0xFF) | (pcm16[idx + 1] << 8)) / 32768f;
            if (noiseReductionEnabled) {
                sample = applyNoiseReduction(sample);
            }
            if (agcEnabled) {
                sample = applyAgc(sample);
            }
            out[i] = clamp(sample, -1f, 1f);
        }
        return out;
    }

    /**
     * Compute the RMS level of a PCM16 chunk (0.0 - 1.0).
     */
    public static float computeRms(byte[] pcm16) {
        if (pcm16 == null || pcm16.length < 2) return 0f;
        long sum = 0;
        int count = pcm16.length / 2;
        for (int i = 0; i < count; i++) {
            int idx = i * 2;
            short s = (short) ((pcm16[idx] & 0xFF) | (pcm16[idx + 1] << 8));
            sum += (long) s * s;
        }
        return (float) Math.sqrt((double) sum / count) / 32768f;
    }

    /**
     * Reset internal state (e.g. between recognition sessions).
     */
    public void reset() {
        previousSample = 0f;
        noiseFloor = 0f;
        currentGain = 1.0f;
    }

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    /**
     * Simple spectral-subtraction-style noise gate combined with a
     * first-order high-pass filter to suppress low-frequency hum.
     */
    private float applyNoiseReduction(float sample) {
        // High-pass filter (removes DC offset / low-freq rumble)
        float alpha = 0.97f;
        float highPassed = sample - previousSample + alpha * previousSample;
        previousSample = sample;

        // Update noise floor estimate (slow-moving average of abs signal)
        noiseFloor += NOISE_FLOOR_ALPHA * (Math.abs(highPassed) - noiseFloor);

        // Noise gate: if signal is close to noise floor, attenuate
        float magnitude = Math.abs(highPassed);
        float gateFactor = 1.0f;
        if (magnitude < noiseFloor * 2.0f) {
            float ratio = magnitude / Math.max(noiseFloor * 2.0f, 1e-10f);
            gateFactor = ratio * ratio; // quadratic soft knee
        }

        return highPassed * (1f - noiseReductionStrength + noiseReductionStrength * gateFactor);
    }

    /**
     * Automatic gain control: adjusts gain so that the long-term RMS
     * approaches {@code agcTargetLevel}.
     */
    private float applyAgc(float sample) {
        float abs = Math.abs(sample);
        if (abs > 1e-6f) {
            float desiredGain = agcTargetLevel / abs;
            desiredGain = Math.min(desiredGain, agcMaxGain);
            // Smoothly move toward desired gain
            currentGain += AGC_SMOOTHING * (desiredGain - currentGain);
        }
        return sample * currentGain;
    }

    private static float clamp(float v, float min, float max) {
        return Math.max(min, Math.min(max, v));
    }
}
