package com.voicecal.nlu.intent;

import com.voicecal.core.model.Intent;

/**
 * Interface for intent recognition from text.
 */
public interface IntentRecognizer {

    /**
     * Recognize the intent from input text.
     *
     * @param text the input text
     * @return the recognized intent
     */
    Intent recognize(String text);

    /**
     * Get the confidence score for the last recognition.
     *
     * @return the confidence score (0.0 to 1.0)
     */
    double getConfidence();
}