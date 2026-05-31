package com.voicecal.voice.wakeword;

/**
 * Interface for wakeword (hotword / keyword) detection services.
 * Provides lifecycle methods to start and stop background listening,
 * and to register listeners for wakeword events.
 */
public interface WakewordService {

    /**
     * Start listening for the configured wakeword.
     * Begins capturing microphone audio and running keyword detection
     * in a background thread. This method is idempotent; calling it
     * when already listening has no effect.
     */
    void startListening();

    /**
     * Stop listening and release microphone resources.
     * Safe to call even if not currently listening.
     */
    void stopListening();

    /**
     * Check whether the service is currently listening.
     *
     * @return true if actively listening for the wakeword
     */
    boolean isListening();

    /**
     * Register a listener that will be notified when the wakeword
     * is detected or when an error occurs.
     *
     * @param listener the listener to add
     */
    void addListener(WakewordListener listener);

    /**
     * Remove a previously registered listener.
     *
     * @param listener the listener to remove
     */
    void removeListener(WakewordListener listener);
}
