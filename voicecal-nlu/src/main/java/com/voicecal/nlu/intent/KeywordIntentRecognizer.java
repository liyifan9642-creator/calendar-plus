package com.voicecal.nlu.intent;

import com.voicecal.core.model.Intent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Keyword-based intent recognizer implementation.
 * Uses keyword matching for intent classification.
 */
@Slf4j
@Component
public class KeywordIntentRecognizer implements IntentRecognizer {

    private static final Map<Intent, List<String>> INTENT_KEYWORDS = new HashMap<>();

    static {
        INTENT_KEYWORDS.put(Intent.CREATE_EVENT, List.of(
                "create", "add", "schedule", "new", "make", "set up", "book", "plan"
        ));
        INTENT_KEYWORDS.put(Intent.UPDATE_EVENT, List.of(
                "update", "change", "modify", "edit", "reschedule", "move"
        ));
        INTENT_KEYWORDS.put(Intent.DELETE_EVENT, List.of(
                "delete", "remove", "cancel", "drop"
        ));
        INTENT_KEYWORDS.put(Intent.LIST_EVENTS, List.of(
                "list", "show", "display", "what's on", "what do i have", "my events", "my schedule"
        ));
        INTENT_KEYWORDS.put(Intent.SEARCH_EVENTS, List.of(
                "search", "find", "look for", "when is", "where is"
        ));
        INTENT_KEYWORDS.put(Intent.CHECK_AVAILABILITY, List.of(
                "available", "free", "busy", "availability", "open", "conflict"
        ));
        INTENT_KEYWORDS.put(Intent.SET_REMINDER, List.of(
                "remind", "reminder", "alert", "notify", "remember"
        ));
        INTENT_KEYWORDS.put(Intent.CANCEL_REMINDER, List.of(
                "cancel reminder", "stop reminding", "remove reminder", "no more alerts"
        ));
    }

    private double lastConfidence = 0.0;

    @Override
    public Intent recognize(String text) {
        if (text == null || text.isBlank()) {
            lastConfidence = 0.0;
            return Intent.UNKNOWN;
        }

        String lowerText = text.toLowerCase();
        Intent bestMatch = Intent.UNKNOWN;
        int bestScore = 0;

        for (Map.Entry<Intent, List<String>> entry : INTENT_KEYWORDS.entrySet()) {
            for (String keyword : entry.getValue()) {
                if (lowerText.contains(keyword)) {
                    int score = keyword.length();
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = entry.getKey();
                    }
                }
            }
        }

        // Calculate confidence based on match quality
        lastConfidence = bestMatch == Intent.UNKNOWN ? 0.0 : Math.min(0.5 + (bestScore * 0.05), 1.0);

        log.debug("Recognized intent: {} with confidence: {} for text: {}",
                bestMatch, lastConfidence, text);

        return bestMatch;
    }

    @Override
    public double getConfidence() {
        return lastConfidence;
    }
}