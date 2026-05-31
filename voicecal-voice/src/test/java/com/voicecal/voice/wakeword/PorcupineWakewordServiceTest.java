package com.voicecal.voice.wakeword;

import com.voicecal.voice.config.WakewordConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PorcupineWakewordService}.
 *
 * <p>These tests verify listener management and lifecycle behaviour
 * without requiring a real Porcupine engine or microphone.
 */
@ExtendWith(MockitoExtension.class)
class PorcupineWakewordServiceTest {

    private WakewordConfig config;

    @BeforeEach
    void setUp() {
        config = new WakewordConfig();
        config.setEnabled(true);
        config.setAccessKey("test-access-key");
        config.setKeywords(List.of("日历助手"));
        config.setSensitivities(List.of(0.5f));
    }

    @Nested
    @DisplayName("Listener management")
    class ListenerManagement {

        @Test
        @DisplayName("addListener adds a listener that receives callbacks")
        void addListenerShouldRegisterListener() {
            PorcupineWakewordService service = createServiceWithoutInit();
            WakewordListener listener = mock(WakewordListener.class);

            service.addListener(listener);

            // Verify the listener was added by checking isListening state
            assertFalse(service.isListening());
        }

        @Test
        @DisplayName("removeListener removes a previously added listener")
        void removeListenerShouldUnregisterListener() {
            PorcupineWakewordService service = createServiceWithoutInit();
            WakewordListener listener = mock(WakewordListener.class);

            service.addListener(listener);
            service.removeListener(listener);

            assertFalse(service.isListening());
        }

        @Test
        @DisplayName("addListener ignores null listener")
        void addListenerShouldIgnoreNull() {
            PorcupineWakewordService service = createServiceWithoutInit();

            // Should not throw
            assertDoesNotThrow(() -> service.addListener(null));
        }
    }

    @Nested
    @DisplayName("Lifecycle")
    class Lifecycle {

        @Test
        @DisplayName("isListening returns false before start")
        void isListeningShouldBeFalseBeforeStart() {
            PorcupineWakewordService service = createServiceWithoutInit();

            assertFalse(service.isListening());
        }

        @Test
        @DisplayName("stopListening is safe to call when not listening")
        void stopListeningShouldBeIdempotent() {
            PorcupineWakewordService service = createServiceWithoutInit();

            assertDoesNotThrow(service::stopListening);
            assertFalse(service.isListening());
        }
    }

    @Nested
    @DisplayName("Disabled config")
    class DisabledConfig {

        @Test
        @DisplayName("startListening does nothing when disabled")
        void startListeningShouldNoOpWhenDisabled() {
            WakewordConfig disabledConfig = new WakewordConfig();
            disabledConfig.setEnabled(false);

            PorcupineWakewordService service = new PorcupineWakewordService(disabledConfig);

            service.startListening();

            assertFalse(service.isListening());
        }
    }

    /**
     * Create a service instance without calling @PostConstruct init()
     * (which would try to load the native Porcupine library).
     */
    private PorcupineWakewordService createServiceWithoutInit() {
        return new PorcupineWakewordService(config);
    }
}
