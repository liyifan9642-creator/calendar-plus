package com.voicecal.app.orchestrator;

import com.voicecal.core.dto.AsrResult;
import com.voicecal.core.dto.llm.CompletenessResult;
import com.voicecal.core.dto.llm.ConflictResult;
import com.voicecal.core.dto.llm.IntentResult;
import com.voicecal.core.exception.AsrServiceException;
import com.voicecal.core.exception.NluProcessingException;
import com.voicecal.core.exception.VoiceCalException;
import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.ConversationLog;
import com.voicecal.core.model.EventStatus;
import com.voicecal.core.model.Intent;
import com.voicecal.core.model.Message;
import com.voicecal.core.model.MessageMode;
import com.voicecal.core.model.MessageStatus;
import com.voicecal.core.model.VoiceCommand;
import com.voicecal.core.service.CalendarService;
import com.voicecal.core.service.ConversationLogService;
import com.voicecal.core.service.LlmService;
import com.voicecal.core.service.MessageService;
import com.voicecal.core.service.NluService;
import com.voicecal.core.service.VoiceOrchestrationService;
import com.voicecal.nlu.time.TimeParseResult;
import com.voicecal.nlu.time.TimeParserService;
import com.voicecal.voice.recognition.SpeechRecognitionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Voice processing orchestrator that coordinates the full ASR -> NLU -> Calendar -> TTS pipeline.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Coordinate speech recognition (ASR) to obtain text from audio</li>
 *   <li>Parse time expressions via TimeParserService</li>
 *   <li>Understand user intent via LangChain4j-based NLU</li>
 *   <li>Execute calendar operations via CalendarService</li>
 *   <li>Generate spoken responses via TTS</li>
 *   <li>Manage session state and conversation context</li>
 *   <li>Handle errors with exponential backoff retry</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VoiceOrchestrator implements VoiceOrchestrationService {

    // ======================== 原有依赖（保留） ========================
    private final SpeechRecognitionService speechRecognitionService;
    private final TimeParserService timeParserService;
    private final NluService nluService;
    private final CalendarService calendarService;
    private final SessionManager sessionManager;
    private final VoiceOrchestratorConfig config;

    // ======================== 新增依赖（LLM 处理流程） ========================
    private final LlmService llmService;
    private final ObjectMapper objectMapper;
    private final MessageService messageService;
    private final ConversationLogService conversationLogService;

    private static final DateTimeFormatter TIME_DISPLAY_FMT =
            DateTimeFormatter.ofPattern("yyyy年M月d日HH点mm分");

    // ======================== Public API ========================

    /**
     * Process a voice command from an audio input stream.
     * This is the primary entry point for audio-based interaction.
     *
     * @param audioStream the audio input containing the user's speech
     * @param sessionId   existing session ID, or null to create a new session
     * @param userId      the user identifier
     * @param language    the language code (e.g., "zh-CN")
     * @return the orchestrator response including TTS audio
     */
    public OrchestratorResponse processAudio(InputStream audioStream, String sessionId,
                                              String userId, String language) {
        log.info("=== VoiceOrchestrator: processAudio start ===");

        VoiceSession session = sessionManager.getOrCreateSession(sessionId, userId, language);
        session.beginTurn();

        OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder =
                OrchestratorResponse.ProcessingMetadata.builder();

        try {
            // Step 1: ASR - speech to text
            session.setState(VoiceSession.SessionState.LISTENING);
            String transcribedText = executeWithRetry("ASR", config.getMaxRetries(), () -> {
                long start = System.currentTimeMillis();
                String text = speechRecognitionService.recognize(audioStream, language);
                metaBuilder.asrDurationMs(System.currentTimeMillis() - start);
                return text;
            });

            if (transcribedText == null || transcribedText.isBlank()) {
                log.warn("ASR returned empty text");
                return buildErrorResponse(session, "ASR_EMPTY",
                        config.getTemplates().getAsrFailed(), metaBuilder);
            }

            log.info("ASR result: '{}'", transcribedText);

            // Create a VoiceCommand from the ASR result
            VoiceCommand command = VoiceCommand.builder()
                    .id(UUID.randomUUID())
                    .rawText(transcribedText)
                    .language(language)
                    .timestamp(LocalDateTime.now())
                    .build();

            // Continue with text-based processing
            return processVoiceCommand(command, session, metaBuilder);

        } catch (AsrServiceException e) {
            log.error("ASR failed after retries: {}", e.getMessage());
            return buildErrorResponse(session, "ASR_ERROR",
                    config.getTemplates().getAsrFailed(), metaBuilder);
        } catch (Exception e) {
            log.error("Unexpected error in processAudio: {}", e.getMessage(), e);
            return buildErrorResponse(session, "INTERNAL_ERROR",
                    config.getTemplates().getProcessingError(), metaBuilder);
        }
    }

    /**
     * Process an ASR result directly (for integration with streaming ASR).
     *
     * @param asrResult   the ASR recognition result
     * @param sessionId   existing session ID, or null to create a new session
     * @param userId      the user identifier
     * @param language    the language code
     * @return the orchestrator response
     */
    public OrchestratorResponse processAsrResult(AsrResult asrResult, String sessionId,
                                                  String userId, String language) {
        log.info("=== VoiceOrchestrator: processAsrResult ===");

        VoiceSession session = sessionManager.getOrCreateSession(sessionId, userId, language);
        session.beginTurn();

        OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder =
                OrchestratorResponse.ProcessingMetadata.builder();
        metaBuilder.asrConfidence(asrResult.getConfidence());

        if (asrResult.getText() == null || asrResult.getText().isBlank()) {
            return buildErrorResponse(session, "ASR_EMPTY",
                    config.getTemplates().getAsrFailed(), metaBuilder);
        }

        // Check ASR confidence
        if (asrResult.getConfidence() < config.getMinAsrConfidence()) {
            log.warn("ASR confidence {} below threshold {}",
                    asrResult.getConfidence(), config.getMinAsrConfidence());
            return buildErrorResponse(session, "ASR_LOW_CONFIDENCE",
                    config.getTemplates().getAsrFailed(), metaBuilder);
        }

        VoiceCommand command = VoiceCommand.builder()
                .id(UUID.randomUUID())
                .rawText(asrResult.getText())
                .confidence(asrResult.getConfidence())
                .language(language)
                .timestamp(LocalDateTime.now())
                .build();

        return processVoiceCommand(command, session, metaBuilder);
    }

    /**
     * Process a text command directly (for testing or text-based interaction).
     *
     * @param text      the user's text input
     * @param sessionId existing session ID, or null to create a new session
     * @param userId    the user identifier
     * @param language  the language code
     * @return the orchestrator response
     */
    public OrchestratorResponse processText(String text, String sessionId,
                                             String userId, String language) {
        log.info("=== VoiceOrchestrator: processText: '{}' ===", text);

        VoiceSession session = sessionManager.getOrCreateSession(sessionId, userId, language);
        session.beginTurn();

        OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder =
                OrchestratorResponse.ProcessingMetadata.builder();

        VoiceCommand command = VoiceCommand.builder()
                .id(UUID.randomUUID())
                .rawText(text)
                .language(language)
                .timestamp(LocalDateTime.now())
                .build();

        return processVoiceCommand(command, session, metaBuilder);
    }

    // ======================== Core Processing Pipeline ========================

    /**
     * Core processing pipeline: TimeParse -> NLU -> Calendar -> TTS.
     */
    private OrchestratorResponse processVoiceCommand(VoiceCommand command,
                                                       VoiceSession session,
                                                       OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        session.setState(VoiceSession.SessionState.PROCESSING);

        try {
            // Step 2: Time parsing
            TimeParseResult timeResult = parseTime(command.getRawText(), metaBuilder);
            if (timeResult != null && timeResult.isParsed()) {
                session.setLastTimeResult(timeResult);
                log.info("Time parsed: {} (confidence: {})",
                        timeResult.getDateTime(), timeResult.getConfidence());
            }

            // Step 3: NLU - intent recognition and entity extraction
            VoiceCommand enrichedCommand = executeWithRetry("NLU", config.getMaxRetries(), () -> {
                long start = System.currentTimeMillis();
                VoiceCommand result = nluService.processText(command.getRawText());
                metaBuilder.nluDurationMs(System.currentTimeMillis() - start);
                return result;
            });

            // Merge original command data
            enrichedCommand.setId(command.getId());
            enrichedCommand.setRawText(command.getRawText());
            enrichedCommand.setLanguage(command.getLanguage());
            enrichedCommand.setTimestamp(command.getTimestamp());

            // Merge time parse results into entities
            mergeTimeEntities(enrichedCommand, timeResult);

            // Merge session context entities
            if (config.isContextCarryoverEnabled()) {
                mergeSessionContext(enrichedCommand, session);
            }

            session.addCommand(enrichedCommand);
            metaBuilder.nluConfidence(enrichedCommand.getConfidence());

            log.info("NLU result - Intent: {}, Entities: {}",
                    enrichedCommand.getIntent(), enrichedCommand.getEntities());

            // Step 4: Handle confirmation flow
            if (session.hasPendingConfirmation()) {
                return handleConfirmationResponse(enrichedCommand, session, metaBuilder);
            }

            // Step 5: Check if confirmation is required for destructive operations
            if (config.isRequireConfirmationForDestructive()
                    && isDestructiveIntent(enrichedCommand.getIntent())) {
                return requestConfirmation(enrichedCommand, session, metaBuilder);
            }

            // Step 6: Execute calendar operation
            session.setState(VoiceSession.SessionState.EXECUTING);
            OrchestratorResponse response = executeCalendarOperation(
                    enrichedCommand, session, metaBuilder);

            // Update session state
            session.setState(VoiceSession.SessionState.COMPLETED);
            session.addResponse(response);
            session.mergeContextEntities(enrichedCommand.getEntities());

            log.info("=== VoiceOrchestrator: processVoiceCommand complete ===");
            return response;

        } catch (NluProcessingException e) {
            log.error("NLU processing failed: {}", e.getMessage());
            return buildErrorResponse(session, "NLU_ERROR",
                    config.getTemplates().getIntentNotUnderstood(), metaBuilder);
        } catch (VoiceCalException e) {
            log.error("VoiceCal error: {} [{}]", e.getMessage(), e.getErrorCode());
            return buildErrorResponse(session, e.getErrorCode(),
                    config.getTemplates().getProcessingError(), metaBuilder);
        } catch (Exception e) {
            log.error("Unexpected error in processing pipeline: {}", e.getMessage(), e);
            return buildErrorResponse(session, "INTERNAL_ERROR",
                    config.getTemplates().getProcessingError(), metaBuilder);
        }
    }

    // ======================== Time Parsing ========================

    /**
     * Parse time expressions from the input text.
     */
    private TimeParseResult parseTime(String text,
                                        OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        try {
            long start = System.currentTimeMillis();
            TimeParseResult result = timeParserService.parseFirst(text);
            metaBuilder.timeParseDurationMs(System.currentTimeMillis() - start);
            return result;
        } catch (Exception e) {
            log.warn("Time parsing failed, continuing without time context: {}", e.getMessage());
            metaBuilder.timeParseDurationMs(0);
            return null;
        }
    }

    /**
     * Merge time parse results into the command's entity map.
     */
    private void mergeTimeEntities(VoiceCommand command, TimeParseResult timeResult) {
        if (timeResult == null || !timeResult.isParsed()) {
            return;
        }

        // Always use a mutable copy — NLU may return an immutable Map
        Map<String, String> original = command.getEntities();
        Map<String, String> entities = new java.util.HashMap<>(
                original != null ? original : java.util.Collections.emptyMap());
        command.setEntities(entities);

        LocalDateTime dateTime = timeResult.getDateTime();
        String isoTime = dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        // Only set time entities if they weren't already extracted by NLU
        if (!entities.containsKey("start_time") && !entities.containsKey("date")) {
            entities.put("start_time", isoTime);
            entities.put("parsed_time", isoTime);
            entities.put("original_time_expression", timeResult.getOriginalExpression());
        }
    }

    /**
     * Merge session context entities into the command for context carryover.
     */
    private void mergeSessionContext(VoiceCommand command, VoiceSession session) {
        Map<String, String> sessionContext = session.getContextEntities();
        if (sessionContext.isEmpty()) {
            return;
        }

        Map<String, String> entities = command.getEntities();
        // Always use a mutable copy — NLU may return an immutable Map
        Map<String, String> mutableEntities = new java.util.HashMap<>(
                entities != null ? entities : java.util.Collections.emptyMap());

        // Session context provides defaults; command entities take precedence
        for (Map.Entry<String, String> entry : sessionContext.entrySet()) {
            mutableEntities.putIfAbsent(entry.getKey(), entry.getValue());
        }
        command.setEntities(mutableEntities);
    }

    // ======================== Calendar Operation Execution ========================

    /**
     * Execute the appropriate calendar operation based on the recognized intent.
     */
    private OrchestratorResponse executeCalendarOperation(VoiceCommand command,
                                                            VoiceSession session,
                                                            OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        Intent intent = command.getIntent();
        Map<String, String> entities = command.getEntities();

        if (intent == null) {
            intent = Intent.UNKNOWN;
        }

        log.info("Executing calendar operation for intent: {}", intent);

        switch (intent) {
            case CREATE_EVENT:
                return executeCreateEvent(command, session, entities, metaBuilder);
            case LIST_EVENTS:
            case SEARCH_EVENTS:
                return executeSearchEvents(command, session, entities, metaBuilder);
            case DELETE_EVENT:
                return executeDeleteEvent(command, session, entities, metaBuilder);
            case UPDATE_EVENT:
                return executeUpdateEvent(command, session, entities, metaBuilder);
            case CHECK_AVAILABILITY:
                return executeCheckAvailability(command, session, entities, metaBuilder);
            case SET_REMINDER:
                return executeSetReminder(command, session, entities, metaBuilder);
            default:
                return handleUnknownIntent(command, session, metaBuilder);
        }
    }

    /**
     * Execute a create event operation.
     */
    private OrchestratorResponse executeCreateEvent(VoiceCommand command,
                                                      VoiceSession session,
                                                      Map<String, String> entities,
                                                      OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        try {
            long start = System.currentTimeMillis();

            String title = entities.getOrDefault("title", "新日程");
            String startTimeStr = entities.get("start_time");
            String endTimeStr = entities.get("end_time");
            String location = entities.get("location");
            String description = entities.get("description");

            if (startTimeStr == null) {
                String responseText = "请告诉我日程的开始时间。";
                return OrchestratorResponse.success(session.getSessionId(), command,
                        responseText, null);
            }

            LocalDateTime startTime = LocalDateTime.parse(startTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            LocalDateTime endTime;

            if (endTimeStr != null && !endTimeStr.isBlank()) {
                endTime = LocalDateTime.parse(endTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } else {
                endTime = startTime.plusMinutes(config.getDefaultEventDurationMinutes());
            }

            CalendarEvent event = CalendarEvent.builder()
                    .title(title)
                    .startTime(startTime)
                    .endTime(endTime)
                    .location(location != null ? location : "")
                    .description(description != null ? description : "")
                    .status(EventStatus.ACTIVE)
                    .build();

            CalendarEvent created = calendarService.createEvent(event);

            metaBuilder.calendarDurationMs(System.currentTimeMillis() - start);

            String timeDisplay = created.getStartTime().format(TIME_DISPLAY_FMT);
            String responseText = config.getTemplates().getEventCreated()
                    .replace("{title}", created.getTitle())
                    .replace("{time}", timeDisplay);

            OrchestratorResponse response = OrchestratorResponse.success(
                    session.getSessionId(), command, responseText, null);
            response.setAffectedEvents(List.of(created));
            response.setMetadata(metaBuilder.build());
            return response;

        } catch (VoiceCalException e) {
            log.error("Failed to create event: {} [{}]", e.getMessage(), e.getErrorCode());
            return buildErrorResponse(session, e.getErrorCode(),
                    "创建日程失败：" + e.getMessage(), metaBuilder);
        } catch (Exception e) {
            log.error("Failed to create event: {}", e.getMessage(), e);
            return buildErrorResponse(session, "CREATE_EVENT_FAILED",
                    "创建日程失败：" + e.getMessage(), metaBuilder);
        }
    }

    /**
     * Execute a search/list events operation.
     */
    private OrchestratorResponse executeSearchEvents(VoiceCommand command,
                                                       VoiceSession session,
                                                       Map<String, String> entities,
                                                       OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        try {
            long start = System.currentTimeMillis();

            String query = entities.get("query");
            String startTimeStr = entities.get("start_time");
            String endTimeStr = entities.get("end_time");

            List<CalendarEvent> events;

            if (startTimeStr != null && endTimeStr != null) {
                LocalDateTime startTime = LocalDateTime.parse(startTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                LocalDateTime endTime = LocalDateTime.parse(endTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                events = calendarService.getEvents(startTime, endTime);
            } else if (query != null && !query.isBlank()) {
                events = calendarService.searchEvents(query);
            } else {
                // Default: search today's events
                LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
                LocalDateTime endOfDay = startOfDay.plusDays(1);
                events = calendarService.getEvents(startOfDay, endOfDay);
            }

            metaBuilder.calendarDurationMs(System.currentTimeMillis() - start);

            String responseText;
            if (events.isEmpty()) {
                responseText = config.getTemplates().getNoEventsFound();
            } else {
                StringBuilder sb = new StringBuilder();
                sb.append("找到").append(events.size()).append("个日程：");
                for (int i = 0; i < Math.min(events.size(), 5); i++) {
                    CalendarEvent e = events.get(i);
                    sb.append("\n").append(i + 1).append(". ")
                      .append(e.getTitle()).append("，")
                      .append(e.getStartTime().format(TIME_DISPLAY_FMT));
                }
                if (events.size() > 5) {
                    sb.append("\n还有").append(events.size() - 5).append("个日程。");
                }
                responseText = sb.toString();
            }

            OrchestratorResponse response = OrchestratorResponse.success(
                    session.getSessionId(), command, responseText, null);
            response.setAffectedEvents(events);
            response.setMetadata(metaBuilder.build());
            return response;

        } catch (Exception e) {
            log.error("Failed to search events: {}", e.getMessage(), e);
            return buildErrorResponse(session, "SEARCH_EVENTS_FAILED",
                    "查询日程失败：" + e.getMessage(), metaBuilder);
        }
    }

    /**
     * Execute a delete event operation.
     */
    private OrchestratorResponse executeDeleteEvent(VoiceCommand command,
                                                      VoiceSession session,
                                                      Map<String, String> entities,
                                                      OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        try {
            long start = System.currentTimeMillis();

            String eventIdStr = entities.get("event_id");
            if (eventIdStr == null || eventIdStr.isBlank()) {
                return OrchestratorResponse.success(session.getSessionId(), command,
                        "请告诉我您要删除哪个日程。", null);
            }

            UUID eventId = UUID.fromString(eventIdStr);
            CalendarEvent event = calendarService.getEvent(eventId);
            calendarService.deleteEvent(eventId);

            metaBuilder.calendarDurationMs(System.currentTimeMillis() - start);

            String responseText = config.getTemplates().getEventDeleted()
                    .replace("{title}", event.getTitle());

            OrchestratorResponse response = OrchestratorResponse.success(
                    session.getSessionId(), command, responseText, null);
            response.setAffectedEvents(List.of(event));
            response.setMetadata(metaBuilder.build());
            return response;

        } catch (Exception e) {
            log.error("Failed to delete event: {}", e.getMessage(), e);
            return buildErrorResponse(session, "DELETE_EVENT_FAILED",
                    "删除日程失败：" + e.getMessage(), metaBuilder);
        }
    }

    /**
     * Execute an update event operation.
     */
    private OrchestratorResponse executeUpdateEvent(VoiceCommand command,
                                                      VoiceSession session,
                                                      Map<String, String> entities,
                                                      OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        try {
            long start = System.currentTimeMillis();

            String eventIdStr = entities.get("event_id");
            if (eventIdStr == null || eventIdStr.isBlank()) {
                return OrchestratorResponse.success(session.getSessionId(), command,
                        "请告诉我您要更新哪个日程。", null);
            }

            UUID eventId = UUID.fromString(eventIdStr);
            CalendarEvent existing = calendarService.getEvent(eventId);

            // Apply updates from entities
            String newTitle = entities.get("title");
            String newStartTime = entities.get("start_time");
            String newEndTime = entities.get("end_time");
            String newLocation = entities.get("location");
            String newDescription = entities.get("description");

            if (newTitle != null && !newTitle.isBlank()) {
                existing.setTitle(newTitle);
            }
            if (newStartTime != null && !newStartTime.isBlank()) {
                existing.setStartTime(LocalDateTime.parse(newStartTime, DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            }
            if (newEndTime != null && !newEndTime.isBlank()) {
                existing.setEndTime(LocalDateTime.parse(newEndTime, DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            }
            if (newLocation != null) {
                existing.setLocation(newLocation);
            }
            if (newDescription != null) {
                existing.setDescription(newDescription);
            }

            CalendarEvent updated = calendarService.updateEvent(eventId, existing);

            metaBuilder.calendarDurationMs(System.currentTimeMillis() - start);

            String responseText = config.getTemplates().getEventUpdated()
                    .replace("{title}", updated.getTitle());

            OrchestratorResponse response = OrchestratorResponse.success(
                    session.getSessionId(), command, responseText, null);
            response.setAffectedEvents(List.of(updated));
            response.setMetadata(metaBuilder.build());
            return response;

        } catch (Exception e) {
            log.error("Failed to update event: {}", e.getMessage(), e);
            return buildErrorResponse(session, "UPDATE_EVENT_FAILED",
                    "更新日程失败：" + e.getMessage(), metaBuilder);
        }
    }

    /**
     * Execute a check availability operation.
     */
    private OrchestratorResponse executeCheckAvailability(VoiceCommand command,
                                                            VoiceSession session,
                                                            Map<String, String> entities,
                                                            OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        try {
            long start = System.currentTimeMillis();

            String startTimeStr = entities.get("start_time");
            String endTimeStr = entities.get("end_time");

            if (startTimeStr == null || endTimeStr == null) {
                return OrchestratorResponse.success(session.getSessionId(), command,
                        "请告诉我您要查询的时间段。", null);
            }

            LocalDateTime startTime = LocalDateTime.parse(startTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            LocalDateTime endTime = LocalDateTime.parse(endTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);

            boolean available = calendarService.isAvailable(startTime, endTime);

            metaBuilder.calendarDurationMs(System.currentTimeMillis() - start);

            String responseText = available
                    ? config.getTemplates().getAvailable()
                    : config.getTemplates().getNotAvailable();

            OrchestratorResponse response = OrchestratorResponse.success(
                    session.getSessionId(), command, responseText, null);
            response.setMetadata(metaBuilder.build());
            return response;

        } catch (Exception e) {
            log.error("Failed to check availability: {}", e.getMessage(), e);
            return buildErrorResponse(session, "CHECK_AVAILABILITY_FAILED",
                    "查询可用性失败：" + e.getMessage(), metaBuilder);
        }
    }

    /**
     * Execute a set reminder operation.
     */
    private OrchestratorResponse executeSetReminder(VoiceCommand command,
                                                      VoiceSession session,
                                                      Map<String, String> entities,
                                                      OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        // Reminder setting is delegated to the CalendarService through the NLU tool calling
        // For now, provide a text response indicating the reminder intent was recognized
        String responseText = "提醒功能已收到，正在处理中。";
        return OrchestratorResponse.success(session.getSessionId(), command, responseText, null);
    }

    /**
     * Handle unknown intent.
     */
    private OrchestratorResponse handleUnknownIntent(VoiceCommand command,
                                                       VoiceSession session,
                                                       OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        String responseText = config.getTemplates().getIntentNotUnderstood();
        return OrchestratorResponse.success(session.getSessionId(), command, responseText, null);
    }

    // ======================== Confirmation Flow ========================

    /**
     * Check if the intent requires user confirmation before execution.
     */
    private boolean isDestructiveIntent(Intent intent) {
        return intent == Intent.DELETE_EVENT || intent == Intent.UPDATE_EVENT;
    }

    /**
     * Request user confirmation for a destructive operation.
     */
    private OrchestratorResponse requestConfirmation(VoiceCommand command,
                                                       VoiceSession session,
                                                       OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        session.setPendingConfirmation(command.getIntent(), command.getEntities());

        String actionDescription = command.getIntent() == Intent.DELETE_EVENT ? "删除这个日程" : "更新这个日程";
        String responseText = config.getTemplates().getConfirmationRequired()
                .replace("{action}", actionDescription);

        OrchestratorResponse response = OrchestratorResponse.needsConfirmation(
                session.getSessionId(), command, responseText);
        response.setMetadata(metaBuilder.build());
        session.addResponse(response);
        return response;
    }

    /**
     * Handle the user's response to a confirmation request.
     */
    private OrchestratorResponse handleConfirmationResponse(VoiceCommand command,
                                                              VoiceSession session,
                                                              OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        String text = command.getRawText().toLowerCase();

        boolean confirmed = text.contains("确认") || text.contains("是") || text.contains("确定")
                || text.contains("yes") || text.contains("ok") || text.contains("confirm");

        if (confirmed) {
            log.info("User confirmed pending operation");
            VoiceSession.PendingConfirmation pending = session.getPendingConfirmation();
            session.clearPendingConfirmation();

            // Restore the original intent and entities
            command.setIntent(pending.getIntent());
            command.setEntities(pending.getEntities());

            // Execute the confirmed operation
            return executeCalendarOperation(command, session, metaBuilder);
        } else {
            log.info("User rejected pending operation");
            session.clearPendingConfirmation();
            String responseText = config.getTemplates().getConfirmationRejected();
            return OrchestratorResponse.success(session.getSessionId(), command, responseText, null);
        }
    }

    // ======================== Retry Mechanism ========================

    /**
     * Execute an operation with exponential backoff retry.
     *
     * @param operationName descriptive name for logging
     * @param maxAttempts   maximum number of attempts
     * @param operation     the operation to execute
     * @param <T>           the return type
     * @return the operation result
     * @throws Exception if all attempts fail
     */
    private <T> T executeWithRetry(String operationName, int maxAttempts,
                                     RetryableOperation<T> operation) throws Exception {
        Exception lastException = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return operation.execute();
            } catch (Exception e) {
                lastException = e;
                if (attempt < maxAttempts && isRetryable(e)) {
                    long delay = config.getBaseRetryDelayMs() * (1L << (attempt - 1));
                    log.warn("{} attempt {}/{} failed: {}. Retrying in {}ms...",
                            operationName, attempt, maxAttempts, e.getMessage(), delay);
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new VoiceCalException(
                                "Interrupted during retry for " + operationName, ie);
                    }
                } else {
                    log.error("{} attempt {}/{} failed: {}. No more retries.",
                            operationName, attempt, maxAttempts, e.getMessage());
                }
            }
        }

        throw lastException;
    }

    /**
     * Determine if an exception is retryable.
     * Network errors, timeouts, and transient service errors are retryable.
     * Business logic errors (validation, not found) are not.
     */
    private boolean isRetryable(Exception e) {
        if (e instanceof VoiceCalException vce) {
            String code = vce.getErrorCode();
            // Non-retryable business errors
            if ("EVENT_NOT_FOUND".equals(code) || "INVALID_TIME_RANGE".equals(code)
                    || "EVENT_CONFLICT".equals(code) || "INVALID_REPEAT_RULE".equals(code)) {
                return false;
            }
        }
        // Transient errors are retryable
        return e instanceof java.io.IOException
                || e instanceof java.net.SocketTimeoutException
                || e instanceof java.util.concurrent.TimeoutException
                || e instanceof AsrServiceException.ServiceUnavailableException;
    }

    // ======================== Helper Methods ========================

    /**
     * Build an error response.
     */
    private OrchestratorResponse buildErrorResponse(VoiceSession session,
                                                      String errorCode,
                                                      String errorMessage,
                                                      OrchestratorResponse.ProcessingMetadata.ProcessingMetadataBuilder metaBuilder) {
        session.setState(VoiceSession.SessionState.ERROR);

        OrchestratorResponse response = OrchestratorResponse.error(
                session.getSessionId(), errorCode, errorMessage);
        response.setMetadata(metaBuilder.build());

        session.addResponse(response);
        return response;
    }

    /**
     * Functional interface for retryable operations.
     */
    @FunctionalInterface
    private interface RetryableOperation<T> {
        T execute() throws Exception;
    }

    // ======================== VoiceOrchestrationService Implementation ========================

    @Override
    public Map<String, Object> handleAudio(InputStream audioStream, String sessionId, String userId, String language) {
        OrchestratorResponse response = processAudio(audioStream, sessionId, userId, language);
        return convertResponseToMap(response);
    }

    @Override
    public Map<String, Object> handleText(String text, String sessionId, String userId, String language) {
        log.info("handleText: text='{}', sessionId={}", text, sessionId);

        // 确保 sessionId 不为空
        if (sessionId == null || sessionId.isEmpty()) {
            sessionId = "session-" + UUID.randomUUID().toString().substring(0, 8);
        }

        // 使用新的 LLM 处理流程
        Message message = processWithLlm(text, sessionId, userId, language);

        // 保存 Message
        messageService.save(message);

        // 保存对话记录
        ConversationLog conversationLog = ConversationLog.builder()
                .sessionId(sessionId)
                .userId(userId)
                .inputType("TEXT")
                .userInput(text)
                .systemResponse(message.getResponseText())
                .intent(message.getMode() != null ? message.getMode().name() : null)
                .confidence(java.math.BigDecimal.valueOf(0.8))
                .build();
        conversationLogService.save(conversationLog);

        // 转换为 Map 返回
        return convertMessageToMap(message);
    }

    // ======================== 新增：LLM 处理流程 ========================

    /**
     * 使用 LLM 的新处理流程入口
     * 流程：意图识别 -> 信息完整性判断 -> 冲突检测 -> Message 生成
     *
     * @param userInput 用户输入文本
     * @param sessionId 会话ID
     * @param userId 用户ID
     * @param language 语言
     * @return 包含 Message 的响应
     */
    public Message processWithLlm(String userInput, String sessionId, String userId, String language) {
        log.info("=== VoiceOrchestrator: processWithLlm start === userInput='{}'", userInput);

        // 生成 Message ID
        String messageId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        // 创建初始 Message
        Message message = Message.builder()
                .id(messageId)
                .sessionId(sessionId)
                .userId(userId)
                .userInput(userInput)
                .status(MessageStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        try {
            // ======================== Step 1: 意图识别 ========================
            log.info("Step 1: LLM 意图识别");
            IntentResult intentResult = llmService.recognizeIntent(userInput, now);

            // 设置 Message 模式
            message.setMode(intentResult.getIntent());
            log.info("意图识别结果: mode={}, confidence={}, isComplete={}",
                    intentResult.getIntent(), intentResult.getConfidence(), intentResult.isComplete());

            // 保存 LLM 响应
            try {
                message.setLlmResponseJson(objectMapper.writeValueAsString(intentResult));
            } catch (Exception e) {
                log.warn("无法序列化 LLM 响应: {}", e.getMessage());
            }

            // 提取实体信息到 Message
            Map<String, String> entities = intentResult.getEntities();
            if (entities != null) {
                populateMessageFromEntities(message, entities);
            }

            // ======================== Step 2: 信息完整性判断 ========================
            log.info("Step 2: 信息完整性判断");

            // 对于 QUERY 意图，只要有日期就可以认为是完整的
            if (message.getMode() == MessageMode.QUERY) {
                if (message.getWeekStartDate() != null) {
                    log.info("QUERY 意图，有周范围信息，视为完整: weekStart={}", message.getWeekStartDate());
                } else if (message.getDate() != null) {
                    log.info("QUERY 意图，有日期信息，视为完整");
                } else {
                    // 查询今天的信息
                    message.setDate(LocalDate.now());
                    log.info("QUERY 意图，无日期信息，默认查询今天");
                }
            } else {
                // 对于 CREATE/UPDATE/DELETE，需要检查信息完整性
                if (!intentResult.isComplete()) {
                    log.info("信息不完整，缺失字段: {}", intentResult.getMissingFields());

                    // 二次确认完整性
                    CompletenessResult completenessResult = llmService.checkCompleteness(entities);

                    if (!completenessResult.isComplete()) {
                        // 信息不完整，需要用户补充
                        message.setStatus(MessageStatus.NEED_CLARIFICATION);
                        message.setClarificationQuestion(
                                completenessResult.getSuggestions() != null && !completenessResult.getSuggestions().isEmpty()
                                        ? completenessResult.getSuggestions()
                                        : buildMissingFieldsMessage(completenessResult.getMissingFields()));
                        log.info("需要用户补充信息: {}", message.getClarificationQuestion());
                        return message;
                    }
                }
            }

            // ======================== Step 3: 冲突检测（仅对 CREATE 意图） ========================
            if (message.getMode() == MessageMode.CREATE) {
                log.info("Step 3: 冲突检测");
                ConflictResult conflictResult = checkForConflicts(message, userInput);

                if (conflictResult != null && conflictResult.isNeedClarification()) {
                    // 存在冲突，需要用户澄清
                    message.setStatus(MessageStatus.NEED_CLARIFICATION);
                    message.setClarificationQuestion(conflictResult.getClarificationQuestion());
                    log.info("检测到冲突，需要用户澄清: {}", conflictResult.getClarificationQuestion());
                    return message;
                } else if (conflictResult != null && "REPLACE".equals(conflictResult.getAction())) {
                    // 用户想替换已有事件
                    message.setTargetEventId(conflictResult.getTargetEventId());
                    log.info("用户想替换事件: {}", conflictResult.getTargetEventId());
                }
            }

            // ======================== Step 4: 执行日历操作 ========================
            log.info("Step 4: 执行日历操作");
            message.setStatus(MessageStatus.CONFIRMED);

            // 执行实际的日历操作（创建/更新/删除事件）
            try {
                executeMessageOperation(message);
                log.info("日历操作执行成功: mode={}", message.getMode());
            } catch (Exception e) {
                log.error("日历操作执行失败: {}", e.getMessage(), e);
                message.setStatus(MessageStatus.FAILED);
                message.setResponseText("操作失败：" + e.getMessage());
                return message;
            }

            // 生成响应文本
            String responseText = generateResponseText(message);
            message.setResponseText(responseText);

            log.info("=== VoiceOrchestrator: processWithLlm complete === mode={}, status={}",
                    message.getMode(), message.getStatus());
            return message;

        } catch (Exception e) {
            log.error("processWithLlm 处理失败: {}", e.getMessage(), e);
            message.setStatus(MessageStatus.FAILED);
            message.setResponseText("处理失败：" + e.getMessage());
            return message;
        }
    }

    /**
     * 从实体信息填充 Message 字段
     */
    private void populateMessageFromEntities(Message message, Map<String, String> entities) {
        // 标题
        if (entities.containsKey("title")) {
            message.setTitle(entities.get("title"));
        }

        // 日期
        if (entities.containsKey("date")) {
            try {
                message.setDate(LocalDate.parse(entities.get("date")));
            } catch (Exception e) {
                log.warn("无法解析日期: {}", entities.get("date"));
            }
        }

        // 周范围查询（本周/这周）
        if (entities.containsKey("weekStart")) {
            try {
                message.setWeekStartDate(LocalDate.parse(entities.get("weekStart")));
            } catch (Exception e) {
                log.warn("无法解析周起始日期: {}", entities.get("weekStart"));
            }
        }

        // 开始时间
        if (entities.containsKey("startTime")) {
            try {
                message.setStartTime(LocalTime.parse(entities.get("startTime")));
            } catch (Exception e) {
                log.warn("无法解析开始时间: {}", entities.get("startTime"));
            }
        }

        // 结束时间
        if (entities.containsKey("endTime")) {
            try {
                message.setEndTime(LocalTime.parse(entities.get("endTime")));
            } catch (Exception e) {
                log.warn("无法解析结束时间: {}", entities.get("endTime"));
            }
        }

        // 地点
        if (entities.containsKey("location")) {
            message.setLocation(entities.get("location"));
        }

        // 描述
        if (entities.containsKey("description")) {
            message.setDescription(entities.get("description"));
        }

        // 目标事件ID（用于 UPDATE/DELETE）
        if (entities.containsKey("event_id")) {
            message.setTargetEventId(entities.get("event_id"));
        }
    }

    /**
     * 检查冲突
     * 当用户创建事件时，检查是否与已有事件时间冲突
     */
    private ConflictResult checkForConflicts(Message message, String userInput) {
        if (message.getDate() == null || message.getStartTime() == null) {
            return null;
        }

        // 构造新事件的时间范围
        LocalDateTime startTime = message.getDate().atTime(message.getStartTime());
        LocalDateTime endTime;
        if (message.getEndTime() != null) {
            endTime = message.getDate().atTime(message.getEndTime());
        } else {
            // 默认1小时
            endTime = startTime.plusHours(1);
        }

        // 查询已有事件
        List<CalendarEvent> existingEvents = calendarService.getEvents(startTime, endTime);

        if (existingEvents.isEmpty()) {
            log.info("无时间冲突");
            return null;
        }

        log.info("检测到 {} 个冲突事件", existingEvents.size());

        // 构造新事件对象
        CalendarEvent newEvent = CalendarEvent.builder()
                .title(message.getTitle() != null ? message.getTitle() : "新事件")
                .startTime(startTime)
                .endTime(endTime)
                .location(message.getLocation())
                .description(message.getDescription())
                .build();

        // 保存冲突信息到 Message
        try {
            message.setConflictsJson(objectMapper.writeValueAsString(existingEvents));
        } catch (Exception e) {
            log.warn("无法序列化冲突信息: {}", e.getMessage());
        }

        // 调用 LLM 判断冲突处理方式
        return llmService.resolveConflict(userInput, newEvent, existingEvents);
    }

    /**
     * 构建缺失字段提示信息
     */
    private String buildMissingFieldsMessage(List<String> missingFields) {
        if (missingFields == null || missingFields.isEmpty()) {
            return "请补充完整信息。";
        }

        StringBuilder sb = new StringBuilder("请补充以下信息：");
        for (String field : missingFields) {
            switch (field) {
                case "title":
                    sb.append("\n- 事件标题");
                    break;
                case "date":
                    sb.append("\n- 日期");
                    break;
                case "startTime":
                    sb.append("\n- 开始时间");
                    break;
                case "endTime":
                    sb.append("\n- 结束时间");
                    break;
                default:
                    sb.append("\n- ").append(field);
            }
        }
        return sb.toString();
    }

    /**
     * 生成响应文本
     */
    private String generateResponseText(Message message) {
        switch (message.getMode()) {
            case CREATE:
                if (message.getTitle() != null && message.getDate() != null && message.getStartTime() != null) {
                    return String.format("好的，已为您创建%s的%s。",
                            message.getDate().format(DateTimeFormatter.ofPattern("yyyy年M月d日")),
                            message.getTitle());
                }
                return "好的，已为您创建事件。";

            case DELETE:
                if (message.getTitle() != null) {
                    return String.format("好的，已为您删除%s。", message.getTitle());
                }
                return "好的，已为您删除事件。";

            case UPDATE:
                if (message.getTitle() != null) {
                    return String.format("好的，已为您更新%s。", message.getTitle());
                }
                return "好的，已为您更新事件。";

            case QUERY:
                // 周范围查询
                if (message.getWeekStartDate() != null) {
                    return generateWeekQueryResponseText(message.getWeekStartDate());
                }
                // 查询事件并生成响应
                return generateQueryResponseText(message);

            default:
                return "好的，已处理您的请求。";
        }
    }

    /**
     * 生成查询响应文本
     */
    private String generateQueryResponseText(Message message) {
        LocalDate queryDate = message.getDate() != null ? message.getDate() : LocalDate.now();
        LocalDateTime startOfDay = queryDate.atStartOfDay();
        LocalDateTime endOfDay = queryDate.atTime(23, 59, 59);

        try {
            List<CalendarEvent> events = calendarService.getEvents(startOfDay, endOfDay);

            if (events.isEmpty()) {
                return String.format("%s没有安排。",
                        queryDate.format(DateTimeFormatter.ofPattern("yyyy年M月d日")));
            }

            StringBuilder sb = new StringBuilder();
            sb.append(String.format("%s有%d个安排：\n",
                    queryDate.format(DateTimeFormatter.ofPattern("yyyy年M月d日")),
                    events.size()));

            for (int i = 0; i < events.size(); i++) {
                CalendarEvent event = events.get(i);
                sb.append(String.format("%d. %s (%s-%s)",
                        i + 1,
                        event.getTitle(),
                        event.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")),
                        event.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm"))));
                if (event.getLocation() != null && !event.getLocation().isEmpty()) {
                    sb.append(String.format(" @%s", event.getLocation()));
                }
                if (i < events.size() - 1) {
                    sb.append("\n");
                }
            }

            return sb.toString();
        } catch (Exception e) {
            log.error("查询事件失败: {}", e.getMessage(), e);
            return "查询日程时出现错误，请稍后重试。";
        }
    }

    /**
     * 生成周范围查询响应文本
     */
    private String generateWeekQueryResponseText(LocalDate weekStart) {
        try {
            Map<LocalDate, List<CalendarEvent>> weekEvents = calendarService.getEventsByWeek(weekStart);

            // 统计本周总事件数
            int totalEvents = weekEvents.values().stream().mapToInt(List::size).sum();

            if (totalEvents == 0) {
                return String.format("%s至%s这一周没有安排。",
                        weekStart.format(DateTimeFormatter.ofPattern("M月d日")),
                        weekStart.plusDays(6).format(DateTimeFormatter.ofPattern("M月d日")));
            }

            StringBuilder sb = new StringBuilder();
            sb.append(String.format("%s至%s这一周共有%d个安排：\n",
                    weekStart.format(DateTimeFormatter.ofPattern("M月d日")),
                    weekStart.plusDays(6).format(DateTimeFormatter.ofPattern("M月d日")),
                    totalEvents));

            String[] dayNames = {"周一", "周二", "周三", "周四", "周五", "周六", "周日"};
            for (int i = 0; i < 7; i++) {
                LocalDate date = weekStart.plusDays(i);
                List<CalendarEvent> dayEvents = weekEvents.getOrDefault(date, List.of());
                if (!dayEvents.isEmpty()) {
                    sb.append(String.format("\n【%s %s】\n",
                            dayNames[i],
                            date.format(DateTimeFormatter.ofPattern("M月d日"))));
                    for (int j = 0; j < dayEvents.size(); j++) {
                        CalendarEvent event = dayEvents.get(j);
                        sb.append(String.format("  %d. %s (%s-%s)",
                                j + 1,
                                event.getTitle(),
                                event.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")),
                                event.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm"))));
                        if (event.getLocation() != null && !event.getLocation().isEmpty()) {
                            sb.append(String.format(" @%s", event.getLocation()));
                        }
                        sb.append("\n");
                    }
                }
            }

            return sb.toString().trim();
        } catch (Exception e) {
            log.error("查询周事件失败: {}", e.getMessage(), e);
            return "查询周日程时出现错误，请稍后重试。";
        }
    }

    private Map<String, Object> convertResponseToMap(OrchestratorResponse response) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("responseId", response.getResponseId());
        map.put("sessionId", response.getSessionId());
        map.put("intent", response.getIntent() != null ? response.getIntent().name() : "UNKNOWN");
        map.put("entities", response.getEntities() != null ? response.getEntities() : Map.of());
        map.put("responseText", response.getResponseText());
        map.put("success", response.isSuccess());
        map.put("requiresConfirmation", response.isRequiresConfirmation());
        if (response.getAffectedEvents() != null) {
            map.put("affectedEvents", response.getAffectedEvents().stream()
                    .map(e -> Map.of(
                            "id", e.getId().toString(),
                            "title", e.getTitle(),
                            "startTime", e.getStartTime().toString(),
                            "endTime", e.getEndTime().toString()))
                    .toList());
        }
        if (response.getErrorCode() != null) {
            map.put("errorCode", response.getErrorCode());
        }
        if (response.getErrorMessage() != null) {
            map.put("errorMessage", response.getErrorMessage());
        }
        if (response.getMetadata() != null) {
            Map<String, Object> meta = new java.util.HashMap<>();
            meta.put("asrConfidence", response.getMetadata().getAsrConfidence());
            meta.put("nluConfidence", response.getMetadata().getNluConfidence());
            meta.put("totalDurationMs", response.getMetadata().getTotalDurationMs());
            map.put("metadata", meta);
        }
        map.put("timestamp", response.getTimestamp() != null ? response.getTimestamp().toString() : null);
        return map;
    }

    // ======================== VoiceOrchestrationService 新增方法实现 ========================

    @Override
    public Map<String, Object> confirmMessage(String messageId, String sessionId) {
        log.info("Confirming message: messageId={}, sessionId={}", messageId, sessionId);

        try {
            // 查找 Message
            Message message = messageService.findById(messageId)
                    .orElseThrow(() -> new RuntimeException("Message not found: " + messageId));

            // 检查状态
            if (message.getStatus() != MessageStatus.PENDING
                    && message.getStatus() != MessageStatus.NEED_CLARIFICATION) {
                throw new RuntimeException("Message cannot be confirmed, current status: " + message.getStatus());
            }

            // 执行日历操作
            executeMessageOperation(message);

            // 更新状态
            message.setStatus(MessageStatus.EXECUTED);
            message.setUpdatedAt(LocalDateTime.now());
            messageService.update(message);

            // 返回结果
            Map<String, Object> result = convertMessageToMap(message);
            result.put("success", true);
            result.put("responseText", generateResponseText(message));
            return result;

        } catch (Exception e) {
            log.error("Failed to confirm message: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new java.util.HashMap<>();
            errorResult.put("success", false);
            errorResult.put("error", Map.of("code", "CONFIRM_FAILED", "message", e.getMessage()));
            return errorResult;
        }
    }

    @Override
    public Map<String, Object> cancelMessage(String messageId, String sessionId) {
        log.info("Cancelling message: messageId={}, sessionId={}", messageId, sessionId);

        try {
            Message message = messageService.findById(messageId)
                    .orElseThrow(() -> new RuntimeException("Message not found: " + messageId));

            message.setStatus(MessageStatus.FAILED);
            message.setUpdatedAt(LocalDateTime.now());
            message.setResponseText("操作已取消。");
            messageService.update(message);

            Map<String, Object> result = convertMessageToMap(message);
            result.put("success", true);
            result.put("responseText", "操作已取消。");
            return result;

        } catch (Exception e) {
            log.error("Failed to cancel message: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new java.util.HashMap<>();
            errorResult.put("success", false);
            errorResult.put("error", Map.of("code", "CANCEL_FAILED", "message", e.getMessage()));
            return errorResult;
        }
    }

    @Override
    public Map<String, Object> selectOption(String messageId, String optionId, String sessionId) {
        log.info("Selecting option: messageId={}, optionId={}, sessionId={}", messageId, optionId, sessionId);

        try {
            Message message = messageService.findById(messageId)
                    .orElseThrow(() -> new RuntimeException("Message not found: " + messageId));

            // 根据选项更新 Message
            // TODO: 解析选项并更新 Message 内容

            message.setStatus(MessageStatus.CONFIRMED);
            message.setUpdatedAt(LocalDateTime.now());
            messageService.update(message);

            Map<String, Object> result = convertMessageToMap(message);
            result.put("success", true);
            result.put("responseText", "好的，已按您的选择处理。");
            return result;

        } catch (Exception e) {
            log.error("Failed to select option: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new java.util.HashMap<>();
            errorResult.put("success", false);
            errorResult.put("error", Map.of("code", "SELECT_FAILED", "message", e.getMessage()));
            return errorResult;
        }
    }

    @Override
    public Map<String, Object> getMessageById(String messageId) {
        log.info("Getting message by ID: {}", messageId);

        return messageService.findById(messageId)
                .map(this::convertMessageToMap)
                .orElseThrow(() -> new RuntimeException("Message not found: " + messageId));
    }

    @Override
    public List<Map<String, Object>> getConversationHistory(String sessionId, int limit, int offset) {
        log.info("Getting conversation history: sessionId={}, limit={}, offset={}", sessionId, limit, offset);

        return conversationLogService.findBySessionId(sessionId, limit, offset)
                .stream()
                .map(log -> {
                    Map<String, Object> item = new java.util.HashMap<>();
                    item.put("id", log.getId());
                    item.put("timestamp", log.getCreatedAt().toString());
                    item.put("userInput", log.getUserInput());
                    item.put("systemResponse", log.getSystemResponse());
                    return item;
                })
                .toList();
    }

    /**
     * 执行 Message 对应的日历操作
     */
    private void executeMessageOperation(Message message) {
        switch (message.getMode()) {
            case CREATE:
                CalendarEvent newEvent = CalendarEvent.builder()
                        .title(message.getTitle())
                        .startTime(message.getDate().atTime(message.getStartTime()))
                        .endTime(message.getEndTime() != null
                                ? message.getDate().atTime(message.getEndTime())
                                : message.getDate().atTime(message.getStartTime()).plusHours(1))
                        .location(message.getLocation())
                        .description(message.getDescription())
                        .status(EventStatus.ACTIVE)
                        .build();
                calendarService.createEvent(newEvent);
                log.info("Created event: {}", newEvent.getTitle());
                break;

            case DELETE:
                if (message.getTargetEventId() != null) {
                    calendarService.deleteEvent(java.util.UUID.fromString(message.getTargetEventId()));
                    log.info("Deleted event: {}", message.getTargetEventId());
                }
                break;

            case UPDATE:
                if (message.getTargetEventId() != null) {
                    CalendarEvent existingEvent = calendarService.getEvent(
                            java.util.UUID.fromString(message.getTargetEventId()));
                    if (message.getTitle() != null) {
                        existingEvent.setTitle(message.getTitle());
                    }
                    if (message.getDate() != null && message.getStartTime() != null) {
                        existingEvent.setStartTime(message.getDate().atTime(message.getStartTime()));
                    }
                    if (message.getDate() != null && message.getEndTime() != null) {
                        existingEvent.setEndTime(message.getDate().atTime(message.getEndTime()));
                    }
                    if (message.getLocation() != null) {
                        existingEvent.setLocation(message.getLocation());
                    }
                    calendarService.updateEvent(
                            java.util.UUID.fromString(message.getTargetEventId()), existingEvent);
                    log.info("Updated event: {}", message.getTargetEventId());
                }
                break;

            case QUERY:
                // 查询操作不需要执行日历操作
                break;
        }
    }

    /**
     * 将 Message 转换为 Map
     */
    private Map<String, Object> convertMessageToMap(Message message) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", message.getId());
        map.put("mode", message.getMode() != null ? message.getMode().name() : null);
        map.put("status", message.getStatus() != null ? message.getStatus().name() : null);

        // 内容
        Map<String, Object> content = new java.util.HashMap<>();
        content.put("title", message.getTitle());
        content.put("date", message.getDate() != null ? message.getDate().toString() : null);
        content.put("startTime", message.getStartTime() != null ? message.getStartTime().toString() : null);
        content.put("endTime", message.getEndTime() != null ? message.getEndTime().toString() : null);
        content.put("location", message.getLocation());
        content.put("description", message.getDescription());
        map.put("content", content);

        map.put("targetEventId", message.getTargetEventId());
        map.put("clarificationQuestion", message.getClarificationQuestion());
        map.put("responseText", message.getResponseText());
        map.put("createdAt", message.getCreatedAt() != null ? message.getCreatedAt().toString() : null);
        map.put("updatedAt", message.getUpdatedAt() != null ? message.getUpdatedAt().toString() : null);

        return map;
    }
}
