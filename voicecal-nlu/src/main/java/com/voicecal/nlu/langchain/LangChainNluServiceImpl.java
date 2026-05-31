package com.voicecal.nlu.langchain;

import com.voicecal.core.model.Intent;
import com.voicecal.core.model.VoiceCommand;
import com.voicecal.core.service.NluService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * LLM-powered NLU service implementation using LangChain4j.
 * Delegates natural language understanding to the VoiceCalAssistant AI Service,
 * which can invoke calendar tools via function calling.
 *
 * This service acts as a bridge: it processes user text through the LLM assistant
 * and returns a structured VoiceCommand, while also executing any calendar operations
 * the LLM decides to perform via tool calls.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "voicecal.nlu.langchain.provider", havingValue = "openai", matchIfMissing = true)
public class LangChainNluServiceImpl implements NluService {

    private final VoiceCalAssistant voiceCalAssistant;

    @Override
    public Intent parseIntent(String text) {
        log.info("LangChain NLU: parsing intent from text: {}", text);

        // Send to LLM with a specific instruction to classify intent only
        String response = voiceCalAssistant.chat(
                "Classify the intent of this message into one of: " +
                "CREATE_EVENT, UPDATE_EVENT, DELETE_EVENT, LIST_EVENTS, SEARCH_EVENTS, " +
                "CHECK_AVAILABILITY, SET_REMINDER, CANCEL_REMINDER, UNKNOWN. " +
                "Reply with ONLY the intent name, nothing else. Message: " + text
        );

        Intent intent = parseIntentFromResponse(response.trim());
        log.info("LangChain NLU: recognized intent: {}", intent);
        return intent;
    }

    @Override
    public Map<String, String> extractEntities(String text) {
        log.info("LangChain NLU: extracting entities from text: {}", text);

        // Send to LLM with a specific instruction to extract entities
        String response = voiceCalAssistant.chat(
                "Extract calendar entities from this message. Return them as key=value pairs, " +
                "one per line. Keys should be: title, date, time, start_time, end_time, location, " +
                "description, attendees, duration. Only include entities that are present. " +
                "Message: " + text
        );

        Map<String, String> entities = parseEntitiesFromResponse(response);
        log.info("LangChain NLU: extracted entities: {}", entities);
        return entities;
    }

    @Override
    public VoiceCommand processText(String text) {
        log.info("LangChain NLU: processing text through LLM: {}", text);

        // Use the assistant for full processing
        String response = voiceCalAssistant.chat(text);

        log.info("LangChain NLU: LLM response: {}", response);

        // Parse intent and entities from the original text for structured output
        Intent intent = parseIntent(text);
        Map<String, String> entities = extractEntities(text);

        VoiceCommand command = VoiceCommand.builder()
                .id(UUID.randomUUID())
                .rawText(text)
                .processedText(response)
                .intent(intent)
                .entities(entities)
                .confidence(0.85) // LLM-based recognition has high baseline confidence
                .timestamp(LocalDateTime.now())
                .build();

        log.info("LangChain NLU: VoiceCommand - intent={}, entities={}", intent, entities);
        return command;
    }

    /**
     * Parse an Intent enum from the LLM's text response.
     */
    private Intent parseIntentFromResponse(String response) {
        if (response == null || response.isBlank()) {
            return Intent.UNKNOWN;
        }

        String normalized = response.toUpperCase().trim()
                .replaceAll("[^A-Z_]", "");

        try {
            return Intent.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            // Try partial matching
            for (Intent intent : Intent.values()) {
                if (normalized.contains(intent.name())) {
                    return intent;
                }
            }
            return Intent.UNKNOWN;
        }
    }

    /**
     * Parse key=value entity pairs from the LLM's text response.
     */
    private Map<String, String> parseEntitiesFromResponse(String response) {
        Map<String, String> entities = new HashMap<>();

        if (response == null || response.isBlank()) {
            return entities;
        }

        String[] lines = response.split("\n");
        for (String line : lines) {
            line = line.trim();
            int eqIndex = line.indexOf('=');
            if (eqIndex > 0) {
                String key = line.substring(0, eqIndex).trim().toLowerCase();
                String value = line.substring(eqIndex + 1).trim();
                if (!value.isEmpty() && !value.equalsIgnoreCase("null") && !value.equalsIgnoreCase("N/A")) {
                    entities.put(key, value);
                }
            }
        }

        return entities;
    }
}
