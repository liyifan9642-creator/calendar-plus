package com.voicecal.nlu.llm;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.voicecal.core.dto.llm.CompletenessResult;
import com.voicecal.core.dto.llm.ConflictResult;
import com.voicecal.core.dto.llm.IntentResult;
import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.MessageMode;
import com.voicecal.core.service.LlmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * LLM 服务实现 - 直接使用 HTTP 调用 LLM API
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LlmServiceImpl implements LlmService {

    private final ObjectMapper objectMapper;

    @Value("${langchain4j.open-ai.chat-model.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Value("${langchain4j.open-ai.chat-model.api-key}")
    private String apiKey;

    @Value("${langchain4j.open-ai.chat-model.model-name:gpt-4o-mini}")
    private String modelName;

    @Value("${langchain4j.open-ai.chat-model.temperature:0.3}")
    private double temperature;

    @Value("${langchain4j.open-ai.chat-model.max-tokens:1024}")
    private int maxTokens;

    // ======================== Prompts ========================

    private static final String INTENT_RECOGNITION_SYSTEM_PROMPT =
        "You are a calendar assistant intent recognition module. "
        + "Analyze the user's input and return ONLY a JSON object, no other text.\n\n"
        + "Return format:\n"
        + "{\"intent\":\"CREATE\",\"confidence\":0.95,\"entities\":{\"title\":\"meeting\",\"date\":\"2026-06-01\",\"startTime\":\"15:00\",\"endTime\":\"17:00\"},\"isComplete\":true,\"missingFields\":[],\"message\":\"\"}\n\n"
        + "Rules:\n"
        + "1. intent must be one of: CREATE, DELETE, UPDATE, QUERY\n"
        + "2. isComplete indicates if info is complete (needs specific time and event content)\n"
        + "3. missingFields lists missing fields (possible values: title, date, startTime, endTime)\n"
        + "4. If user says 'cancel', 'delete', 'remove', intent is DELETE\n"
        + "5. If user says 'change', 'move', 'postpone', intent is UPDATE\n"
        + "6. If user asks 'what', 'when', 'schedule', intent is QUERY\n"
        + "7. If user says 'create', 'add', 'schedule a meeting', intent is CREATE\n"
        + "8. confidence is 0.0-1.0 float\n"
        + "9. For QUERY intent, isComplete can be true if date exists\n"
        + "10. Return ONLY the JSON object, nothing else";

    private static final String COMPLETENESS_CHECK_SYSTEM_PROMPT =
        "Check if the calendar event information is complete. Return ONLY a JSON object.\n\n"
        + "Completeness requirements:\n"
        + "1. Must have specific date (YYYY-MM-DD format)\n"
        + "2. Must have specific time (HH:mm format) or time range (startTime-endTime)\n"
        + "3. Must have event content/title\n\n"
        + "Return format:\n"
        + "{\"isComplete\":true,\"missingFields\":[],\"suggestions\":\"\"}";

    private static final String CONFLICT_RESOLUTION_SYSTEM_PROMPT =
        "User wants to create a new event but it conflicts with existing events. "
        + "Determine the user's real intention. Return ONLY a JSON object.\n\n"
        + "Possible cases:\n"
        + "1. User wants to add a new event (coexist with existing) - action: CREATE_NEW\n"
        + "2. User wants to replace existing event with new one - action: REPLACE\n"
        + "3. User wants to modify existing event's time - action: MODIFY\n\n"
        + "Return format:\n"
        + "{\"action\":\"CREATE_NEW\",\"targetEventId\":\"\",\"needClarification\":false,\"clarificationQuestion\":\"\"}";

    // ======================== 意图识别 ========================

    @Override
    public IntentResult recognizeIntent(String userInput, LocalDateTime currentTime) {
        log.info("LLM 意图识别: userInput='{}', currentTime={}", userInput, currentTime);

        try {
            String userMessage = String.format("User input: %s\nCurrent time: %s",
                userInput,
                currentTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

            String response = callLlm(INTENT_RECOGNITION_SYSTEM_PROMPT, userMessage);
            log.info("LLM 意图识别原始响应: {}", response);

            if (response == null || response.trim().isEmpty()) {
                log.warn("LLM 返回空响应");
                return IntentResult.builder()
                        .intent(MessageMode.QUERY)
                        .confidence(0.0)
                        .entities(new HashMap<>())
                        .isComplete(false)
                        .missingFields(List.of("title", "date", "startTime"))
                        .message("LLM 返回空响应")
                        .rawResponse("EMPTY")
                        .build();
            }

            // 解析 JSON 响应
            Map<String, Object> resultMap = parseJsonResponse(response);

            // 解析 intent
            String intentStr = (String) resultMap.getOrDefault("intent", "QUERY");
            MessageMode intent;
            try {
                intent = MessageMode.valueOf(intentStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("无法解析 intent: {}, 默认使用 QUERY", intentStr);
                intent = MessageMode.QUERY;
            }

            // 解析 confidence
            double confidence = 0.8;
            Object confidenceObj = resultMap.get("confidence");
            if (confidenceObj instanceof Number) {
                confidence = ((Number) confidenceObj).doubleValue();
            }

            // 解析 entities
            @SuppressWarnings("unchecked")
            Map<String, String> entities = (Map<String, String>) resultMap.getOrDefault("entities", new HashMap<>());

            // 解析 isComplete
            boolean isComplete = Boolean.TRUE.equals(resultMap.get("isComplete"));

            // 解析 missingFields
            @SuppressWarnings("unchecked")
            List<String> missingFields = (List<String>) resultMap.getOrDefault("missingFields", new ArrayList<>());

            // 解析 message
            String message = (String) resultMap.getOrDefault("message", "");

            return IntentResult.builder()
                    .intent(intent)
                    .confidence(confidence)
                    .entities(entities)
                    .isComplete(isComplete)
                    .missingFields(missingFields)
                    .message(message)
                    .rawResponse(response)
                    .build();

        } catch (Exception e) {
            log.error("LLM 意图识别失败: {}", e.getMessage(), e);
            return IntentResult.builder()
                    .intent(MessageMode.QUERY)
                    .confidence(0.0)
                    .entities(new HashMap<>())
                    .isComplete(false)
                    .missingFields(List.of("title", "date", "startTime"))
                    .message("无法识别意图，请重新输入")
                    .rawResponse("ERROR: " + e.getMessage())
                    .build();
        }
    }

    // ======================== 信息完整性判断 ========================

    @Override
    public CompletenessResult checkCompleteness(Map<String, String> entities) {
        log.info("LLM 信息完整性判断: entities={}", entities);

        try {
            String entitiesJson = objectMapper.writeValueAsString(entities);
            String userMessage = "Event information: " + entitiesJson;

            String response = callLlm(COMPLETENESS_CHECK_SYSTEM_PROMPT, userMessage);
            log.info("LLM 完整性判断原始响应: {}", response);

            Map<String, Object> resultMap = parseJsonResponse(response);

            boolean isComplete = Boolean.TRUE.equals(resultMap.get("isComplete"));

            @SuppressWarnings("unchecked")
            List<String> missingFields = (List<String>) resultMap.getOrDefault("missingFields", new ArrayList<>());

            String suggestions = (String) resultMap.getOrDefault("suggestions", "");

            return CompletenessResult.builder()
                    .isComplete(isComplete)
                    .missingFields(missingFields)
                    .suggestions(suggestions)
                    .rawResponse(response)
                    .build();

        } catch (Exception e) {
            log.error("LLM 完整性判断失败: {}", e.getMessage(), e);
            return CompletenessResult.builder()
                    .isComplete(false)
                    .missingFields(List.of("title", "date", "startTime"))
                    .suggestions("无法判断信息完整性，请补充完整信息")
                    .rawResponse("ERROR: " + e.getMessage())
                    .build();
        }
    }

    // ======================== 冲突判断 ========================

    @Override
    public ConflictResult resolveConflict(String userInput, CalendarEvent newEvent, List<CalendarEvent> existingEvents) {
        log.info("LLM 冲突判断: userInput='{}', newEvent={}, existingEvents.size={}",
            userInput, newEvent.getTitle(), existingEvents.size());

        try {
            StringBuilder existingEventsStr = new StringBuilder();
            for (int i = 0; i < existingEvents.size(); i++) {
                CalendarEvent e = existingEvents.get(i);
                existingEventsStr.append(String.format("\n%d. ID: %s, Title: %s, Time: %s - %s",
                    i + 1, e.getId(), e.getTitle(),
                    e.getStartTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")),
                    e.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm"))));
            }

            String userMessage = String.format(
                "New event: title=%s, time=%s - %s\nExisting events:%s\nUser input: %s",
                newEvent.getTitle(),
                newEvent.getStartTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")),
                newEvent.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm")),
                existingEventsStr.toString(),
                userInput);

            String response = callLlm(CONFLICT_RESOLUTION_SYSTEM_PROMPT, userMessage);
            log.info("LLM 冲突判断原始响应: {}", response);

            Map<String, Object> resultMap = parseJsonResponse(response);

            String action = (String) resultMap.getOrDefault("action", "CREATE_NEW");
            String targetEventId = (String) resultMap.getOrDefault("targetEventId", "");
            boolean needClarification = Boolean.TRUE.equals(resultMap.get("needClarification"));
            String clarificationQuestion = (String) resultMap.getOrDefault("clarificationQuestion", "");

            return ConflictResult.builder()
                    .action(action)
                    .targetEventId(targetEventId)
                    .needClarification(needClarification)
                    .clarificationQuestion(clarificationQuestion)
                    .rawResponse(response)
                    .build();

        } catch (Exception e) {
            log.error("LLM 冲突判断失败: {}", e.getMessage(), e);
            return ConflictResult.builder()
                    .action("CREATE_NEW")
                    .targetEventId("")
                    .needClarification(true)
                    .clarificationQuestion("检测到时间冲突，请问您想如何处理？")
                    .rawResponse("ERROR: " + e.getMessage())
                    .build();
        }
    }

    // ======================== 辅助方法 ========================

    /**
     * 调用 LLM API
     */
    private String callLlm(String systemPrompt, String userMessage) {
        log.info("调用 LLM: userMessage={}", userMessage);

        try {
            HttpClient client = HttpClient.newHttpClient();

            // 构建请求体
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", modelName);
            requestBody.put("temperature", temperature);
            requestBody.put("max_tokens", maxTokens);

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            messages.add(Map.of("role", "user", "content", userMessage));
            requestBody.put("messages", messages);

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            log.debug("LLM 请求体: {}", jsonBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            log.info("LLM HTTP 响应状态: {}", response.statusCode());
            log.debug("LLM HTTP 响应体: {}", response.body());

            if (response.statusCode() != 200) {
                log.error("LLM API 调用失败: status={}, body={}", response.statusCode(), response.body());
                return "";
            }

            // 解析响应
            JsonNode rootNode = objectMapper.readTree(response.body());
            JsonNode choicesNode = rootNode.get("choices");
            if (choicesNode != null && choicesNode.isArray() && choicesNode.size() > 0) {
                JsonNode messageNode = choicesNode.get(0).get("message");
                if (messageNode != null) {
                    String content = messageNode.get("content").asText();
                    log.info("LLM 响应内容: {}", content);
                    return content;
                }
            }

            log.warn("LLM 响应格式异常: {}", response.body());
            return "";

        } catch (Exception e) {
            log.error("LLM 调用异常: {}", e.getMessage(), e);
            return "";
        }
    }

    /**
     * 解析 JSON 响应
     */
    private Map<String, Object> parseJsonResponse(String response) throws JsonProcessingException {
        String jsonStr = response.trim();
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7);
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.substring(3);
        }
        if (jsonStr.endsWith("```")) {
            jsonStr = jsonStr.substring(0, jsonStr.length() - 3);
        }
        jsonStr = jsonStr.trim();

        return objectMapper.readValue(jsonStr, new TypeReference<Map<String, Object>>() {});
    }
}
