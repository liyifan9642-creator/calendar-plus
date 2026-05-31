package com.voicecal.nlu.parser;

import com.voicecal.core.model.Intent;
import com.voicecal.core.model.VoiceCommand;
import com.voicecal.core.service.NluService;
import com.voicecal.nlu.entity.EntityExtractor;
import com.voicecal.nlu.intent.IntentRecognizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementation of NluService that coordinates intent recognition and entity extraction.
 * Acts as a fallback when LangChain4j is not enabled.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "voicecal.nlu.langchain.provider", havingValue = "none", matchIfMissing = false)
public class NluServiceImpl implements NluService {

    private final IntentRecognizer intentRecognizer;
    private final List<EntityExtractor> entityExtractors;

    @Override
    public Intent parseIntent(String text) {
        log.info("Parsing intent from text: {}", text);
        return intentRecognizer.recognize(text);
    }

    @Override
    public Map<String, String> extractEntities(String text) {
        log.info("Extracting entities from text: {}", text);
        Map<String, String> allEntities = new HashMap<>();

        for (EntityExtractor extractor : entityExtractors) {
            Map<String, String> entities = extractor.extract(text);
            allEntities.putAll(entities);
        }

        return allEntities;
    }

    @Override
    public VoiceCommand processText(String text) {
        log.info("Processing text through NLU: {}", text);

        Intent intent = parseIntent(text);
        Map<String, String> entities = extractEntities(text);
        double confidence = intentRecognizer.getConfidence();

        VoiceCommand command = VoiceCommand.builder()
                .id(UUID.randomUUID())
                .rawText(text)
                .processedText(text.trim())
                .intent(intent)
                .entities(entities)
                .confidence(confidence)
                .timestamp(LocalDateTime.now())
                .build();

        log.info("NLU result - Intent: {}, Entities: {}, Confidence: {}",
                intent, entities, confidence);

        return command;
    }
}