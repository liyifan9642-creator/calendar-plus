package com.voicecal.voice.recognition;

import java.io.InputStream;

/**
 * Interface for speech recognition operations.
 */
public interface SpeechRecognitionService {

    /**
     * Convert speech audio to text.
     *
     * @param audioStream the audio input stream
     * @param language    the language code (e.g., "en-US")
     * @return the transcribed text
     */
    String recognize(InputStream audioStream, String language);

    /**
     * Stream recognition for real-time transcription.
     *
     * @param audioStream the audio input stream
     * @param language    the language code
     * @param callback    the callback for partial results
     */
    void recognizeStreaming(InputStream audioStream, String language, RecognitionCallback callback);

    /**
     * Callback interface for streaming recognition results.
     */
    interface RecognitionCallback {
        void onPartialResult(String text);
        void onFinalResult(String text);
        void onError(Exception e);
    }
}