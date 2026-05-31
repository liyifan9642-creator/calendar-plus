package com.voicecal.voice.recognition;

import com.voicecal.core.dto.AsrCallback;
import com.voicecal.core.dto.AsrResult;
import com.voicecal.core.model.AudioStream;
import com.voicecal.core.service.AsrService;
import com.voicecal.voice.config.VoiceConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Bridges the Sherpa-ONNX ASR engine to the existing
 * {@link SpeechRecognitionService} interface so it can be used by
 * {@link com.voicecal.voice.processing.VoiceProcessingServiceImpl}.
 *
 * <p>Activated when {@code voicecal.voice.recognition.provider=sherpa}.</p>
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "voicecal.voice.recognition.provider", havingValue = "sherpa")
public class SherpaSpeechRecognitionService implements SpeechRecognitionService {

    private final AsrService asrService;
    private final VoiceConfig voiceConfig;

    public SherpaSpeechRecognitionService(AsrService asrService, VoiceConfig voiceConfig) {
        this.asrService = asrService;
        this.voiceConfig = voiceConfig;
    }

    @Override
    public String recognize(InputStream audioStream, String language) {
        log.info("Sherpa batch recognition, language={}", language);
        AudioStream stream = new AudioStream(audioStream,
                AudioStream.AudioFormat.PCM, voiceConfig.getRecognition().getSampleRate(), 1);

        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> resultText = new AtomicReference<>("");
        AtomicReference<String> errorHolder = new AtomicReference<>();

        asrService.startRecognition(stream, new AsrCallback() {
            @Override
            public void onResult(AsrResult result) {
                resultText.set(result.getText());
                latch.countDown();
            }

            @Override
            public void onPartialResult(AsrResult partialResult) {
                // For batch mode we only care about the final result
            }

            @Override
            public void onError(String errorCode, String errorMessage) {
                errorHolder.set(errorMessage);
                latch.countDown();
            }

            @Override
            public void onRecognitionStart() {
                log.debug("Sherpa recognition started");
            }

            @Override
            public void onRecognitionEnd() {
                latch.countDown();
            }
        });

        try {
            if (!latch.await(30, TimeUnit.SECONDS)) {
                asrService.stopRecognition();
                throw new RuntimeException("Sherpa recognition timed out");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            asrService.stopRecognition();
            throw new RuntimeException("Recognition interrupted", e);
        }

        if (errorHolder.get() != null) {
            throw new RuntimeException("Sherpa recognition failed: " + errorHolder.get());
        }

        String text = resultText.get();
        log.info("Sherpa recognition result: '{}'", text);
        return text;
    }

    @Override
    public void recognizeStreaming(InputStream audioStream, String language, RecognitionCallback callback) {
        log.info("Sherpa streaming recognition, language={}", language);
        AudioStream stream = new AudioStream(audioStream,
                AudioStream.AudioFormat.PCM, voiceConfig.getRecognition().getSampleRate(), 1);

        asrService.startRecognition(stream, new AsrCallback() {
            @Override
            public void onResult(AsrResult result) {
                callback.onFinalResult(result.getText());
            }

            @Override
            public void onPartialResult(AsrResult partialResult) {
                callback.onPartialResult(partialResult.getText());
            }

            @Override
            public void onError(String errorCode, String errorMessage) {
                callback.onError(new RuntimeException(errorCode + ": " + errorMessage));
            }

            @Override
            public void onRecognitionStart() {
                log.debug("Sherpa streaming recognition started");
            }

            @Override
            public void onRecognitionEnd() {
                log.debug("Sherpa streaming recognition ended");
            }
        });
    }
}
