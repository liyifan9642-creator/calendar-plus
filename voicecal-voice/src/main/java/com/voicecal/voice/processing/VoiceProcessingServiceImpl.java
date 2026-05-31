package com.voicecal.voice.processing;

import com.voicecal.core.model.VoiceCommand;
import com.voicecal.core.service.NluService;
import com.voicecal.core.service.VoiceProcessingService;
import com.voicecal.voice.recognition.SpeechRecognitionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;

/**
 * Implementation of VoiceProcessingService that coordinates speech recognition
 * and NLU processing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VoiceProcessingServiceImpl implements VoiceProcessingService {

    private final SpeechRecognitionService speechRecognitionService;
    private final NluService nluService;

    @Override
    public String speechToText(InputStream audioStream, String language) {
        log.info("Converting speech to text in language: {}", language);
        return speechRecognitionService.recognize(audioStream, language);
    }

    @Override
    public byte[] textToSpeech(String text, String language) {
        log.warn("TTS not implemented - returning empty audio");
        return new byte[0];
    }

    @Override
    public VoiceCommand processVoiceCommand(InputStream audioStream, String language) {
        log.info("Processing voice command in language: {}", language);

        // Step 1: Convert speech to text
        String transcribedText = speechToText(audioStream, language);
        log.debug("Transcribed text: {}", transcribedText);

        // Step 2: Process text through NLU
        VoiceCommand command = nluService.processText(transcribedText);
        command.setLanguage(language);

        log.info("Processed voice command - Intent: {}, Confidence: {}",
                command.getIntent(), command.getConfidence());

        return command;
    }
}