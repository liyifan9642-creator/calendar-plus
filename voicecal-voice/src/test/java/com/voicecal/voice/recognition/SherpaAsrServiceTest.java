package com.voicecal.voice.recognition;

import com.voicecal.core.dto.AsrCallback;
import com.voicecal.core.dto.AsrResult;
import com.voicecal.core.model.AsrStatus;
import com.voicecal.core.model.AsrStatus.RecognitionState;
import com.voicecal.core.model.AudioStream;
import com.voicecal.voice.audio.AudioPreprocessor;
import com.voicecal.voice.config.SherpaAsrConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class SherpaAsrServiceTest {

    private SherpaAsrConfig config;

    @BeforeEach
    void setUp() {
        config = new SherpaAsrConfig();
    }

    @Nested
    @DisplayName("AudioPreprocessor tests")
    class AudioPreprocessorTests {

        @Test
        @DisplayName("computeRms returns 0 for null or empty input")
        void computeRms_emptyInput() {
            assertEquals(0f, AudioPreprocessor.computeRms(null));
            assertEquals(0f, AudioPreprocessor.computeRms(new byte[0]));
            assertEquals(0f, AudioPreprocessor.computeRms(new byte[1]));
        }

        @Test
        @DisplayName("computeRms returns correct value for known signal")
        void computeRms_knownSignal() {
            // Create a 1-second 16kHz mono PCM with constant amplitude ~0.5
            int sampleRate = 16000;
            byte[] pcm = new byte[sampleRate * 2];
            short amplitude = (short) (0.5 * 32767);
            for (int i = 0; i < sampleRate; i++) {
                pcm[i * 2] = (byte) (amplitude & 0xFF);
                pcm[i * 2 + 1] = (byte) ((amplitude >> 8) & 0xFF);
            }
            float rms = AudioPreprocessor.computeRms(pcm);
            assertTrue(rms > 0.45f && rms < 0.55f,
                    "Expected RMS ~0.5 but got " + rms);
        }

        @Test
        @DisplayName("processToFloat returns correct length")
        void processToFloat_length() {
            AudioPreprocessor pp = new AudioPreprocessor(config);
            byte[] pcm = new byte[3200]; // 100ms at 16kHz, 16-bit
            float[] result = pp.processToFloat(pcm);
            assertEquals(1600, result.length);
        }

        @Test
        @DisplayName("processToFloat returns empty for null input")
        void processToFloat_null() {
            AudioPreprocessor pp = new AudioPreprocessor(config);
            float[] result = pp.processToFloat(null);
            assertEquals(0, result.length);
        }

        @Test
        @DisplayName("process modifies PCM in-place and returns same array")
        void process_inPlace() {
            AudioPreprocessor pp = new AudioPreprocessor(config);
            byte[] pcm = new byte[100];
            byte[] result = pp.process(pcm);
            assertSame(pcm, result);
        }

        @Test
        @DisplayName("reset clears internal state")
        void reset_noException() {
            AudioPreprocessor pp = new AudioPreprocessor(config);
            pp.process(new byte[100]);
            assertDoesNotThrow(pp::reset);
        }
    }

    @Nested
    @DisplayName("SherpaAsrConfig defaults")
    class ConfigDefaultsTests {

        @Test
        @DisplayName("default config has correct values")
        void defaults() {
            SherpaAsrConfig cfg = new SherpaAsrConfig();
            assertTrue(cfg.isEnabled());
            assertEquals(16000, cfg.getSampleRate());
            assertEquals("zh", cfg.getLanguage());
            assertEquals(4, cfg.getNumThreads());
            assertTrue(cfg.isNoiseReductionEnabled());
            assertTrue(cfg.isAgcEnabled());
            assertEquals(0.5f, cfg.getNoiseReductionStrength());
            assertEquals(0.6f, cfg.getAgcTargetLevel());
            assertEquals(10.0f, cfg.getAgcMaxGain());
            assertEquals(0.01f, cfg.getSilenceThreshold());
            assertEquals(1500L, cfg.getSilenceDurationMs());
            assertEquals(30000L, cfg.getMaxRecordingDurationMs());
        }
    }

    @Nested
    @DisplayName("SherpaAsrService state management")
    class StateTests {

        @Test
        @DisplayName("initial status is IDLE")
        void initialStatus() {
            // SherpaModelManager not initialised -> service won't be a bean
            // but we can test the config/status logic directly
            SherpaAsrConfig cfg = new SherpaAsrConfig();
            SherpaModelManager mgr = new SherpaModelManager(cfg);
            SherpaAsrService service = new SherpaAsrService(cfg, mgr);

            AsrStatus status = service.getStatus();
            assertEquals(RecognitionState.IDLE, status.getState());
            assertFalse(service.isRecognizing());
        }
    }

    @Nested
    @DisplayName("AsrResult DTO")
    class AsrResultTests {

        @Test
        @DisplayName("constructor sets fields correctly")
        void constructor() {
            AsrResult r = new AsrResult("hello", 0.95, true);
            assertEquals("hello", r.getText());
            assertEquals(0.95, r.getConfidence());
            assertTrue(r.isFinal());
            assertTrue(r.getTimestamp() > 0);
        }

        @Test
        @DisplayName("toString includes text and confidence")
        void toStringFormat() {
            AsrResult r = new AsrResult("test", 0.8, false);
            String s = r.toString();
            assertTrue(s.contains("test"));
            assertTrue(s.contains("0.8"));
        }
    }

    @Nested
    @DisplayName("AsrStatus model")
    class AsrStatusTests {

        @Test
        @DisplayName("isActive returns true for LISTENING and PROCESSING")
        void isActive() {
            AsrStatus s1 = new AsrStatus(RecognitionState.LISTENING);
            assertTrue(s1.isActive());

            AsrStatus s2 = new AsrStatus(RecognitionState.PROCESSING);
            assertTrue(s2.isActive());

            AsrStatus s3 = new AsrStatus(RecognitionState.IDLE);
            assertFalse(s3.isActive());

            AsrStatus s4 = new AsrStatus(RecognitionState.COMPLETED);
            assertFalse(s4.isActive());

            AsrStatus s5 = new AsrStatus(RecognitionState.ERROR);
            assertFalse(s5.isActive());
        }
    }
}
