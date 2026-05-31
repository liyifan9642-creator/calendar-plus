package com.voicecal.ui.controller;

import com.voicecal.core.service.VoiceOrchestrationService;
import com.voicecal.ui.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * REST controller for voice processing operations.
 * Provides endpoints for audio processing, text commands, session management, etc.
 */
@Slf4j
@Tag(name = "Voice", description = "Voice processing APIs")
@RestController
@RequestMapping("/api/voice")
@RequiredArgsConstructor
public class VoiceController {

    private final VoiceOrchestrationService voiceOrchestrationService;

    // ======================== Unified Process Endpoint ========================

    @Operation(summary = "Process voice or text input and return a Message object")
    @PostMapping("/process")
    public ResponseEntity<ProcessResponse> process(@RequestBody ProcessRequest request) {
        log.info("Received process request: inputType={}, sessionId={}", request.getInputType(), request.getSessionId());
        try {
            Map<String, Object> rawResponse;
            String inputType = request.getInputType();

            if ("VOICE".equalsIgnoreCase(inputType)) {
                // Decode Base64 audio and delegate to voice orchestration
                if (request.getAudio() == null || request.getAudio().isEmpty()) {
                    return ResponseEntity.badRequest().body(ProcessResponse.builder()
                            .success(false)
                            .responseText("音频数据不能为空")
                            .error(ErrorDto.builder()
                                    .code("INVALID_INPUT")
                                    .message("audio field is required when inputType=VOICE")
                                    .build())
                            .build());
                }
                byte[] audioBytes = Base64.getDecoder().decode(request.getAudio());
                rawResponse = voiceOrchestrationService.handleAudio(
                        new ByteArrayInputStream(audioBytes),
                        request.getSessionId(),
                        null,
                        request.getLanguage() != null ? request.getLanguage() : "zh-CN");
            } else if ("TEXT".equalsIgnoreCase(inputType)) {
                // Delegate to text orchestration
                if (request.getText() == null || request.getText().isEmpty()) {
                    return ResponseEntity.badRequest().body(ProcessResponse.builder()
                            .success(false)
                            .responseText("文本内容不能为空")
                            .error(ErrorDto.builder()
                                    .code("INVALID_INPUT")
                                    .message("text field is required when inputType=TEXT")
                                    .build())
                            .build());
                }
                rawResponse = voiceOrchestrationService.handleText(
                        request.getText(),
                        request.getSessionId(),
                        null,
                        request.getLanguage() != null ? request.getLanguage() : "zh-CN");
            } else {
                return ResponseEntity.badRequest().body(ProcessResponse.builder()
                        .success(false)
                        .responseText("无效的输入类型，请使用 VOICE 或 TEXT")
                        .error(ErrorDto.builder()
                                .code("INVALID_INPUT")
                                .message("inputType must be VOICE or TEXT")
                                .build())
                        .build());
            }

            // 直接从 Map 构建 ProcessResponse
            log.info("Raw response keys: {}", rawResponse.keySet());
            log.info("Raw response: {}", rawResponse);
            boolean success = rawResponse.containsKey("success") ? (Boolean) rawResponse.get("success") : true;
            String responseText = rawResponse.containsKey("responseText") ? (String) rawResponse.get("responseText") : "";

            // 构建 ContentDto
            ContentDto contentDto = null;
            if (rawResponse.containsKey("content") && rawResponse.get("content") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> contentMap = (Map<String, Object>) rawResponse.get("content");
                contentDto = ContentDto.builder()
                        .title(contentMap.containsKey("title") ? (String) contentMap.get("title") : null)
                        .date(contentMap.containsKey("date") ? (String) contentMap.get("date") : null)
                        .startTime(contentMap.containsKey("startTime") ? (String) contentMap.get("startTime") : null)
                        .endTime(contentMap.containsKey("endTime") ? (String) contentMap.get("endTime") : null)
                        .location(contentMap.containsKey("location") ? (String) contentMap.get("location") : null)
                        .description(contentMap.containsKey("description") ? (String) contentMap.get("description") : null)
                        .build();
            }

            MessageDto message = MessageDto.builder()
                    .id(rawResponse.containsKey("id") ? (String) rawResponse.get("id") : UUID.randomUUID().toString())
                    .mode(rawResponse.containsKey("mode") ? (String) rawResponse.get("mode") : "QUERY")
                    .status(rawResponse.containsKey("status") ? (String) rawResponse.get("status") : "CONFIRMED")
                    .content(contentDto)
                    .clarificationQuestion(rawResponse.containsKey("clarificationQuestion") ? (String) rawResponse.get("clarificationQuestion") : null)
                    .createdAt(rawResponse.containsKey("createdAt") ? (String) rawResponse.get("createdAt") : LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .updatedAt(rawResponse.containsKey("updatedAt") ? (String) rawResponse.get("updatedAt") : LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .build();

            ProcessResponse response = ProcessResponse.builder()
                    .success(success)
                    .message(message)
                    .responseText(responseText)
                    .build();

            log.info("Process response: mode={}, responseText={}", message.getMode(), responseText);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.error("Invalid input: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ProcessResponse.builder()
                    .success(false)
                    .responseText("输入数据格式错误")
                    .error(ErrorDto.builder()
                            .code("INVALID_INPUT")
                            .message(e.getMessage())
                            .build())
                    .build());
        } catch (Exception e) {
            log.error("Failed to process request: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ProcessResponse.builder()
                    .success(false)
                    .responseText("处理请求时发生内部错误，请稍后重试")
                    .error(ErrorDto.builder()
                            .code("INTERNAL_ERROR")
                            .message(e.getMessage())
                            .build())
                    .build());
        }
    }

    // ======================== Confirm Endpoint ========================

    @Operation(summary = "Confirm, cancel, or select a clarification option for a pending message")
    @PostMapping("/confirm")
    public ResponseEntity<ProcessResponse> confirm(@RequestBody ConfirmRequest request) {
        log.info("Received confirm request: messageId={}, action={}", request.getMessageId(), request.getAction());
        try {
            Map<String, Object> result;
            String action = request.getAction();

            if ("CONFIRM".equalsIgnoreCase(action)) {
                result = voiceOrchestrationService.confirmMessage(request.getMessageId(), null);
            } else if ("CANCEL".equalsIgnoreCase(action)) {
                result = voiceOrchestrationService.cancelMessage(request.getMessageId(), null);
            } else if ("SELECT_OPTION".equalsIgnoreCase(action)) {
                result = voiceOrchestrationService.selectOption(
                        request.getMessageId(), request.getOptionId(), null);
            } else {
                return ResponseEntity.badRequest().body(ProcessResponse.builder()
                        .success(false)
                        .responseText("无效的操作类型")
                        .error(ErrorDto.builder()
                                .code("INVALID_ACTION")
                                .message("action must be CONFIRM, CANCEL, or SELECT_OPTION")
                                .build())
                        .build());
            }

            // Convert result to ProcessResponse
            boolean success = result.containsKey("success") ? (Boolean) result.get("success") : true;
            String responseText = result.containsKey("responseText") ? (String) result.get("responseText") : "";

            MessageDto message = MessageDto.builder()
                    .id(request.getMessageId())
                    .status(success ? "CONFIRMED" : "FAILED")
                    .updatedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .build();

            return ResponseEntity.ok(ProcessResponse.builder()
                    .success(success)
                    .message(message)
                    .responseText(responseText)
                    .build());

        } catch (Exception e) {
            log.error("Failed to process confirm request: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ProcessResponse.builder()
                    .success(false)
                    .responseText("确认操作失败，请稍后重试")
                    .error(ErrorDto.builder()
                            .code("INTERNAL_ERROR")
                            .message(e.getMessage())
                            .build())
                    .build());
        }
    }

    // ======================== History Endpoint ========================

    @Operation(summary = "Get conversation history for a session")
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getHistory(
            @RequestParam String sessionId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        log.info("Received history request: sessionId={}, limit={}, offset={}", sessionId, limit, offset);
        try {
            List<Map<String, Object>> items = voiceOrchestrationService.getConversationHistory(
                    sessionId, limit, offset);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("total", items.size());
            response.put("items", items);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve history: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "errorCode", "INTERNAL_ERROR",
                    "errorMessage", "获取对话历史失败"
            ));
        }
    }

    // ======================== Old Endpoints (Commented Out) ========================

    /*
    @Operation(summary = "Process voice command from audio file")
    @PostMapping(value = "/process-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> processAudio(
            @RequestParam("audio") MultipartFile audio,
            @RequestParam(value = "sessionId", required = false) String sessionId,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestParam(value = "language", defaultValue = "zh-CN") String language) {
        log.info("Received audio file: {} bytes, sessionId={}, userId={}", audio.getSize(), sessionId, userId);
        try {
            Map<String, Object> response = voiceOrchestrationService.handleAudio(
                    audio.getInputStream(), sessionId, userId, language);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to process audio: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "errorCode", "AUDIO_READ_ERROR",
                    "errorMessage", "无法读取音频文件"
            ));
        }
    }
    */

    /*
    @Operation(summary = "Process text command directly")
    @PostMapping("/process-text")
    public ResponseEntity<Map<String, Object>> processText(
            @RequestParam("text") String text,
            @RequestParam(value = "sessionId", required = false) String sessionId,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestParam(value = "language", defaultValue = "zh-CN") String language) {
        log.info("Received text command: '{}', sessionId={}", text, sessionId);
        Map<String, Object> response = voiceOrchestrationService.handleText(text, sessionId, userId, language);
        return ResponseEntity.ok(response);
    }
    */

    // ======================== Health & Config ========================

    @Operation(summary = "Voice service health check")
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "activeSessions", 0
        ));
    }

    @Operation(summary = "Get supported voice commands")
    @GetMapping("/commands")
    public ResponseEntity<List<Map<String, Object>>> getCommands() {
        List<Map<String, Object>> commands = List.of(
                Map.of("intent", "CREATE_EVENT", "command", "创建事件",
                        "description", "创建新的日历事件",
                        "examples", List.of("添加明天下午两点的会议", "创建一个新事件")),
                Map.of("intent", "QUERY_EVENTS", "command", "查询事件",
                        "description", "查询指定日期的日程安排",
                        "examples", List.of("今天有什么安排", "这周的日程")),
                Map.of("intent", "DELETE_EVENT", "command", "删除事件",
                        "description", "删除指定的日历事件",
                        "examples", List.of("删除明天的会议", "取消下午的约会")),
                Map.of("intent", "UPDATE_EVENT", "command", "更新事件",
                        "description", "修改现有的日历事件",
                        "examples", List.of("把会议改到三点", "修改明天的会议地点")),
                Map.of("intent", "SEARCH_EVENTS", "command", "搜索事件",
                        "description", "搜索包含关键词的事件",
                        "examples", List.of("搜索关于项目的会议", "查找下周的出差")),
                Map.of("intent", "CHECK_AVAILABILITY", "command", "检查可用性",
                        "description", "检查指定时间段是否可用",
                        "examples", List.of("明天下午有空吗", "检查周三上午的时间")),
                Map.of("intent", "SET_REMINDER", "command", "设置提醒",
                        "description", "为事件设置提醒",
                        "examples", List.of("提前半小时提醒我", "设置明天的提醒")),
                Map.of("intent", "HELP", "command", "帮助",
                        "description", "获取语音命令帮助",
                        "examples", List.of("帮助", "你会做什么")),
                Map.of("intent", "CANCEL", "command", "取消",
                        "description", "取消当前操作",
                        "examples", List.of("取消", "算了"))
        );
        return ResponseEntity.ok(commands);
    }

    @Operation(summary = "Get user voice settings")
    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(Map.of(
                "language", "zh-CN",
                "speechRate", 1.0,
                "volume", 0.8,
                "autoPlayResponse", true
        ));
    }

    @Operation(summary = "Save user voice settings")
    @PutMapping("/settings")
    public ResponseEntity<Map<String, Object>> saveSettings(
            @RequestBody Map<String, Object> settings) {
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ======================== Old Confirm Endpoint (Commented Out) ========================

    /*
    @Operation(summary = "Confirm or cancel a pending operation")
    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirmAction(
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "操作已确认"
        ));
    }
    */
}
