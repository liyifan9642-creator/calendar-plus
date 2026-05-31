package com.voicecal.app.orchestrator;

import com.voicecal.core.dto.AsrResult;
import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.EventStatus;
import com.voicecal.core.model.Intent;
import com.voicecal.core.model.VoiceCommand;
import com.voicecal.core.service.CalendarService;
import com.voicecal.core.service.NluService;
import com.voicecal.nlu.time.TimeParseResult;
import com.voicecal.nlu.time.TimeParserService;
import com.voicecal.voice.recognition.SpeechRecognitionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for VoiceOrchestrator.
 */
@ExtendWith(MockitoExtension.class)
class VoiceOrchestratorTest {

    @Mock
    private SpeechRecognitionService speechRecognitionService;

    @Mock
    private TimeParserService timeParserService;

    @Mock
    private NluService nluService;

    @Mock
    private CalendarService calendarService;

    @Mock
    private SessionManager sessionManager;

    @InjectMocks
    private VoiceOrchestrator orchestrator;

    private VoiceOrchestratorConfig config;
    private VoiceSession testSession;

    @BeforeEach
    void setUp() {
        config = new VoiceOrchestratorConfig();
        config.setMaxRetries(2);
        config.setBaseRetryDelayMs(100);
        config.setMinAsrConfidence(0.6);

        VoiceOrchestratorConfig.ResponseTemplates templates = new VoiceOrchestratorConfig.ResponseTemplates();
        config.setTemplates(templates);

        try {
            var field = VoiceOrchestrator.class.getDeclaredField("config");
            field.setAccessible(true);
            field.set(orchestrator, config);
        } catch (Exception e) {
            fail("Failed to set config: " + e.getMessage());
        }

        testSession = new VoiceSession("test-session-1");
        testSession.setUserId("test-user");
        testSession.setLanguage("zh-CN");
    }

    @Nested
    @DisplayName("processAudio tests")
    class ProcessAudioTests {

        @Test
        @DisplayName("Should process audio and create event successfully")
        void processAudio_createEvent_success() {
            InputStream audioStream = new ByteArrayInputStream(new byte[100]);
            when(sessionManager.getOrCreateSession(any(), any(), any())).thenReturn(testSession);
            when(speechRecognitionService.recognize(any(), eq("zh-CN")))
                    .thenReturn("明天下午两点创建一个会议");
            when(timeParserService.parseFirst(anyString()))
                    .thenReturn(TimeParseResult.builder()
                            .dateTime(LocalDateTime.now().plusDays(1).withHour(14).withMinute(0))
                            .originalExpression("明天下午两点")
                            .confidence(0.85)
                            .build());
            when(nluService.processText(anyString()))
                    .thenReturn(VoiceCommand.builder()
                            .intent(Intent.CREATE_EVENT)
                            .entities(Map.of("title", "会议", "start_time",
                                    LocalDateTime.now().plusDays(1).withHour(14).withMinute(0).toString()))
                            .confidence(0.9)
                            .build());
            when(calendarService.createEvent(any()))
                    .thenReturn(CalendarEvent.builder()
                            .id(UUID.randomUUID())
                            .title("会议")
                            .startTime(LocalDateTime.now().plusDays(1).withHour(14).withMinute(0))
                            .endTime(LocalDateTime.now().plusDays(1).withHour(15).withMinute(0))
                            .status(EventStatus.ACTIVE)
                            .build());

            OrchestratorResponse response = orchestrator.processAudio(audioStream, null, "test-user", "zh-CN");

            assertTrue(response.isSuccess());
            assertNotNull(response.getResponseText());
            assertEquals(Intent.CREATE_EVENT, response.getIntent());
        }

        @Test
        @DisplayName("Should handle ASR empty result")
        void processAudio_asrEmpty_returnsError() {
            InputStream audioStream = new ByteArrayInputStream(new byte[100]);
            when(sessionManager.getOrCreateSession(any(), any(), any())).thenReturn(testSession);
            when(speechRecognitionService.recognize(any(), eq("zh-CN"))).thenReturn("");

            OrchestratorResponse response = orchestrator.processAudio(audioStream, null, "test-user", "zh-CN");

            assertFalse(response.isSuccess());
            assertEquals("ASR_EMPTY", response.getErrorCode());
        }
    }

    @Nested
    @DisplayName("processText tests")
    class ProcessTextTests {

        @Test
        @DisplayName("Should process text and search events")
        void processText_searchEvents_success() {
            when(sessionManager.getOrCreateSession(any(), any(), any())).thenReturn(testSession);
            when(timeParserService.parseFirst(anyString()))
                    .thenReturn(TimeParseResult.builder().build());
            when(nluService.processText("查看明天的日程"))
                    .thenReturn(VoiceCommand.builder()
                            .intent(Intent.LIST_EVENTS)
                            .entities(Map.of("start_time",
                                    LocalDateTime.now().plusDays(1).toLocalDate().atStartOfDay().toString()))
                            .confidence(0.9)
                            .build());
            when(calendarService.getEvents(any(), any())).thenReturn(List.of());

            OrchestratorResponse response = orchestrator.processText("查看明天的日程", null, "test-user", "zh-CN");

            assertTrue(response.isSuccess());
            assertEquals(Intent.LIST_EVENTS, response.getIntent());
        }

        @Test
        @DisplayName("Should require confirmation for delete operations")
        void processText_deleteEvent_requiresConfirmation() {
            when(sessionManager.getOrCreateSession(any(), any(), any())).thenReturn(testSession);
            when(timeParserService.parseFirst(anyString()))
                    .thenReturn(TimeParseResult.builder().build());
            when(nluService.processText("删除明天的会议"))
                    .thenReturn(VoiceCommand.builder()
                            .intent(Intent.DELETE_EVENT)
                            .entities(Map.of("event_id", UUID.randomUUID().toString()))
                            .confidence(0.9)
                            .build());

            OrchestratorResponse response = orchestrator.processText("删除明天的会议", null, "test-user", "zh-CN");

            assertTrue(response.isSuccess());
            assertTrue(response.isRequiresConfirmation());
        }
    }
}
