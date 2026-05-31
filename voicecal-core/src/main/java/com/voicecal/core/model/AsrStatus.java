package com.voicecal.core.model;

import java.time.LocalDateTime;

/**
 * ASR状态模型
 */
public class AsrStatus {

    private RecognitionState state;
    private String currentText;
    private double confidence;
    private LocalDateTime lastUpdated;
    private String errorMessage;

    public AsrStatus() {
        this.state = RecognitionState.IDLE;
        this.lastUpdated = LocalDateTime.now();
    }

    public AsrStatus(RecognitionState state) {
        this();
        this.state = state;
    }

    // Getters and Setters
    public RecognitionState getState() {
        return state;
    }

    public void setState(RecognitionState state) {
        this.state = state;
    }

    public String getCurrentText() {
        return currentText;
    }

    public void setCurrentText(String currentText) {
        this.currentText = currentText;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public boolean isActive() {
        return state == RecognitionState.LISTENING || state == RecognitionState.PROCESSING;
    }

    /**
     * 识别状态枚举
     */
    public enum RecognitionState {
        IDLE,
        LISTENING,
        PROCESSING,
        COMPLETED,
        ERROR
    }
}
