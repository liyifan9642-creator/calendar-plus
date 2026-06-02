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
        "你是一个日历助手意图识别模块。"
        + "分析用户输入，只返回 JSON 对象，不要返回其他内容。\n\n"
        + "返回格式：\n"
        + "{\"intent\":\"CREATE\",\"confidence\":0.95,\"entities\":{\"title\":\"meeting\",\"date\":\"2026-06-01\",\"startTime\":\"15:00\",\"endTime\":\"17:00\"},\"isComplete\":true,\"missingFields\":[],\"message\":\"\"}\n\n"
        + "规则：\n"
        + "1. intent 必须是以下之一：CREATE, DELETE, UPDATE, QUERY\n"
        + "2. isComplete 表示信息是否完整（需要具体时间和事件内容）\n"
        + "3. missingFields 列出缺失字段（可能的值：title, date, startTime, endTime）\n"
        + "4. 如果用户说'取消'、'删除'、'去掉'，intent 为 DELETE\n"
        + "5. 如果用户说'改'、'修改'、'推迟'，intent 为 UPDATE\n"
        + "6. 如果用户问'什么'、'什么时候'、'行程'、'安排'，intent 为 QUERY\n"
        + "7. 如果用户说'创建'、'添加'、'安排一个会议'，intent 为 CREATE\n"
        + "8. confidence 是 0.0-1.0 的浮点数\n"
        + "9. 对于 QUERY 意图，如果有日期信息则 isComplete 为 true\n"
        + "10. 周范围查询处理：当用户提到'本周'、'这周'、'这一周'、'本周行程'等周范围查询时，"
        + "在 entities 中返回 weekStart 字段（本周一的日期，格式 YYYY-MM-DD），不要返回 date 字段\n"
        + "11. 只返回 JSON 对象，不要返回其他内容";

    private static final String COMPLETENESS_CHECK_SYSTEM_PROMPT =
        "检查日历事件信息是否完整。只返回 JSON 对象，不要返回其他内容。\n\n"
        + "完整性要求：\n"
        + "1. 必须有具体日期（YYYY-MM-DD 格式）\n"
        + "2. 必须有具体时间（HH:mm 格式）或时间范围（startTime-endTime）\n"
        + "3. 必须有事件内容/标题\n\n"
        + "返回格式：\n"
        + "{\"isComplete\":true,\"missingFields\":[],\"suggestions\":\"\"}\n\n"
        + "重要：suggestions 字段必须使用中文提示用户补充缺失信息。";

    private static final String CONFLICT_RESOLUTION_SYSTEM_PROMPT =
        "用户想创建一个新事件，但与已有事件冲突。"
        + "判断用户的真实意图。只返回 JSON 对象，不要返回其他内容。\n\n"
        + "可能的情况：\n"
        + "1. 用户想添加新事件（与已有事件共存）- action: CREATE_NEW\n"
        + "2. 用户想用新事件替换已有事件 - action: REPLACE\n"
        + "3. 用户想修改已有事件的时间 - action: MODIFY\n\n"
        + "返回格式：\n"
        + "{\"action\":\"CREATE_NEW\",\"targetEventId\":\"\",\"needClarification\":false,\"clarificationQuestion\":\"\"}\n\n"
        + "重要：clarificationQuestion 字段必须使用中文提问。";

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
