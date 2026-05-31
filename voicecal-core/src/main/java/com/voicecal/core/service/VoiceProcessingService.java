package com.voicecal.core.service;

import com.voicecal.core.model.VoiceCommand;

import java.io.InputStream;

/**
 * Core interface for voice processing operations.
 */
public interface VoiceProcessingService {

    /**
     * Convert speech audio to text.
     *
     * @param audioStream the audio input stream
     * @param language    the language code (e.g., "en-US")
     * @return the transcribed text
     */
    String speechToText(InputStream audioStream, String language);

    /**
     * Convert text to speech audio.
     *
     * @param text     the text to synthesize
     * @param language the language code
     * @return the audio data as byte array
     */
    byte[] textToSpeech(String text, String language);

    /**
     * Process a complete voice command from audio input.
     *
     * @param audioStream the audio input stream
     * @param language    the language code
     * @return the parsed voice command
     */
    VoiceCommand processVoiceCommand(InputStream audioStream, String language);
}