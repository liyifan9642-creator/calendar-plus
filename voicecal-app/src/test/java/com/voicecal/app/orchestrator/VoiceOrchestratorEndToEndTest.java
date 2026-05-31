package com.voicecal.app.orchestrator;

import com.voicecal.core.dto.AsrResult;
import com.voicecal.core.exception.VoiceCalException;
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

@ExtendWith(MockitoExtension.class)
@DisplayName("VoiceOrchestrator End-to-End Integration Tests")
class VoiceOrchestratorEndToEndTest {

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

    private static final LocalDateTime TOMORROW_14_00 =
            LocalDateTime.now().plusDays(1).withHour(14).withMinute(0).withSecond(0).withNano(0);
    private static final LocalDateTime TOMORROW_15_00 = TOMORROW_14_00.plusHours(1);
    private static final LocalDateTime TOMORROW_10_00 =
            LocalDateTime.now().plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0);
    private static final LocalDateTime TOMORROW_11_00 = TOMORROW_10_00.plusHours(1);
    private static final LocalDateTime TODAY_START = LocalDateTime.now().toLocalDate().atStartOfDay();
    private static final LocalDateTime TODAY_END = TODAY_START.plusDays(1);

    @BeforeEach
    void setUp() {
        config = new VoiceOrchestratorConfig();
        config.setMaxRetries(2);
        config.setBaseRetryDelayMs(50);
        config.setMinAsrConfidence(0.6);
        config.setRequireConfirmationForDestructive(true);
        config.setContextCarryoverEnabled(true);
        config.setDefaultEventDurationMinutes(60);

        VoiceOrchestratorConfig.ResponseTemplates templates = new VoiceOrchestratorConfig.ResponseTemplates();
        config.setTemplates(templates);

        try {
            var field = VoiceOrchestrator.class.getDeclaredField("config");
            field.setAccessible(true);
            field.set(orchestrator, config);
        } catch (Exception e) {
            fail("Failed to inject config: " + e.getMessage());
        }

        testSession = new VoiceSession("e2e-test-session");
        testSession.setUserId("e2e-test-user");
        testSession.setLanguage("zh-CN");
    }

    private void stubSessionManager() {
        when(sessionManager.getOrCreateSession(any(), any(), any())).thenReturn(testSession);
    }

    private void stubTimeParser(String inputText, TimeParseResult result) {
        when(timeParserService.parseFirst(eq(inputText))).thenReturn(result);
    }

    private void stubNlu(String inputText, Intent intent, Map<String, String> entities) {
        when(nluService.processText(eq(inputText))).thenReturn(VoiceCommand.builder()
                .id(UUID.randomUUID())
                .rawText(inputText)
                .intent(intent)
                .entities(entities != null ? new HashMap<>(entities) : new HashMap<>())
                .confidence(0.9)
                .timestamp(LocalDateTime.now())
                .build());
    }

    private InputStream dummyAudio() {
        return new ByteArrayInputStream(new byte[256]);
    }

    private TimeParseResult timeResult(LocalDateTime dateTime, String expression, double confidence) {
        return TimeParseResult.builder()
                .dateTime(dateTime)
                .originalExpression(expression)
                .normalizedTime(dateTime.toString())
                .allDay(false)
                .wasAmbiguous(false)
                .confidence(confidence)
                .build();
    }

    private CalendarEvent buildEvent(UUID id, String title, LocalDateTime start, LocalDateTime end) {
        return CalendarEvent.builder()
                .id(id)
                .title(title)
                .startTime(start)
                .endTime(end)
                .location("")
                .description("")
                .status(EventStatus.ACTIVE)
                .build();
    }

    @Nested
    @DisplayName("Voice Add Event")
    class VoiceAddEventTests {

        @Test
        @DisplayName("Should create event from audio input")
        void addEvent_fromAudio_success() {
            stubSessionManager();
            when(speechRecognitionService.recognize(any(), eq("zh-CN"))).thenReturn("明天下午两点开团队会议");
            stubTimeParser("明天下午两点开团队会议", timeResult(TOMORROW_14_00, "明天下午两点", 0.85));
            stubNlu("明天下午两点开团队会议", Intent.CREATE_EVENT,
                    Map.of("title", "团队会议", "start_time", TOMORROW_14_00.toString()));
            when(calendarService.createEvent(any())).thenReturn(
                    buildEvent(UUID.randomUUID(), "团队会议", TOMORROW_14_00, TOMORROW_15_00));

            OrchestratorResponse response = orchestrator.processAudio(dummyAudio(), null, "test", "zh-CN");

            assertTrue(response.isSuccess());
            assertEquals(Intent.CREATE_EVENT, response.getIntent());
        }

        @Test
        @DisplayName("Should create event from text input")
        void addEvent_fromText_success() {
            stubSessionManager();
            stubTimeParser("明天下午两点开会", timeResult(TOMORROW_14_00, "明天下午两点", 0.85));
            stubNlu("明天下午两点开会", Intent.CREATE_EVENT,
                    Map.of("title", "会", "start_time", TOMORROW_14_00.toString()));
            when(calendarService.createEvent(any())).thenReturn(
                    buildEvent(UUID.randomUUID(), "会", TOMORROW_14_00, TOMORROW_15_00));

            OrchestratorResponse response = orchestrator.processText("明天下午两点开会", null, "test", "zh-CN");

            assertTrue(response.isSuccess());
            assertEquals(Intent.CREATE_EVENT, response.getIntent());
        }
    }

    @Nested
    @DisplayName("Voice Query Schedule")
    class VoiceQueryScheduleTests {

        @Test
        @DisplayName("Should query events from audio")
        void querySchedule_fromAudio_success() {
            stubSessionManager();
            when(speechRecognitionService.recognize(any(), eq("zh-CN"))).thenReturn("查看明天的日程");
            stubTimeParser("查看明天的日程", timeResult(TOMORROW_10_00, "明天", 0.90));
            stubNlu("查看明天的日程", Intent.LIST_EVENTS,
                    Map.of("start_time", TOMORROW_10_00.toLocalDate().atStartOfDay().toString()));
            when(calendarService.getEvents(any(), any())).thenReturn(List.of());

            OrchestratorResponse response = orchestrator.processAudio(dummyAudio(), null, "test", "zh-CN");

            assertTrue(response.isSuccess());
            assertEquals(Intent.LIST_EVENTS, response.getIntent());
        }

        @Test
        @DisplayName("Should return empty list message when no events")
        void querySchedule_noEvents_returnsMessage() {
            stubSessionManager();
            stubTimeParser("查看今天的日程", timeResult(TODAY_START, "今天", 0.90));
            stubNlu("查看今天的日程", Intent.LIST_EVENTS,
                    Map.of("start_time", TODAY_START.toString(), "end_time", TODAY_END.toString()));
            when(calendarService.getEvents(any(), any())).thenReturn(List.of());

            OrchestratorResponse response = orchestrator.processText("查看今天的日程", null, "test", "zh-CN");

            assertTrue(response.isSuccess());
            assertTrue(response.getAffectedEvents().isEmpty());
        }
    }

    @Nested
    @DisplayName("Voice Delete Event")
    class VoiceDeleteEventTests {

        @Test
        @DisplayName("Should require confirmation for delete")
        void deleteEvent_requiresConfirmation() {
            stubSessionManager();
            stubTimeParser("删除明天的会议", timeResult(TOMORROW_14_00, "明天", 0.80));
            stubNlu("删除明天的会议", Intent.DELETE_EVENT,
                    Map.of("event_id", UUID.randomUUID().toString()));

            OrchestratorResponse response = orchestrator.processText("删除明天的会议", null, "test", "zh-CN");

            assertTrue(response.isSuccess());
            assertTrue(response.isRequiresConfirmation());
        }
    }

    @Nested
    @DisplayName("Error Handling")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should return error for empty ASR")
        void asrEmpty_returnsError() {
            stubSessionManager();
            when(speechRecognitionService.recognize(any(), eq("zh-CN"))).thenReturn("");

            OrchestratorResponse response = orchestrator.processAudio(dummyAudio(), null, "test", "zh-CN");

            assertFalse(response.isSuccess());
            assertEquals("ASR_EMPTY", response.getErrorCode());
        }

        @Test
        @DisplayName("Should return error for low confidence ASR")
        void asrLowConfidence_returnsError() {
            stubSessionManager();
            AsrResult asrResult = new AsrResult("模糊文本", 0.3, true);

            OrchestratorResponse response = orchestrator.processAsrResult(asrResult, null, "test", "zh-CN");

            assertFalse(response.isSuccess());
            assertEquals("ASR_LOW_CONFIDENCE", response.getErrorCode());
        }

        @Test
        @DisplayName("Should handle unknown intent")
        void unknownIntent_returnsHelp() {
            stubSessionManager();
            stubTimeParser("随便聊聊", new TimeParseResult());
            stubNlu("随便聊聊", Intent.UNKNOWN, new HashMap<>());

            OrchestratorResponse response = orchestrator.processText("随便聊聊", null, "test", "zh-CN");

            assertTrue(response.isSuccess());
            assertEquals(Intent.UNKNOWN, response.getIntent());
        }
    }
}
