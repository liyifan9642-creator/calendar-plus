package com.voicecal.voice.wakeword;

/**
 * Callback interface for wakeword detection events.
 * Implementations receive notifications when a wakeword is detected
 * or when the wakeword engine encounters an error.
 */
public interface WakewordListener {

    /**
     * Called when a wakeword is detected.
     *
     * @param keywordIndex the index of the detected keyword in the keyword list
     * @param keyword      the detected keyword string
     */
    void onWakewordDetected(int keywordIndex, String keyword);

    /**
     * Called when the wakeword engine encounters an error.
     *
     * @param error the exception that occurred
     */
    void onError(Exception error);
}
