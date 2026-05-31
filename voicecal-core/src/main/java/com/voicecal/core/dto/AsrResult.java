package com.voicecal.core.dto;

/**
 * ASR识别结果DTO
 */
public class AsrResult {

    private String text;
    private double confidence;
    private boolean isFinal;
    private long timestamp;

    public AsrResult() {
    }

    public AsrResult(String text, double confidence, boolean isFinal) {
        this.text = text;
        this.confidence = confidence;
        this.isFinal = isFinal;
        this.timestamp = System.currentTimeMillis();
    }

    // Getters and Setters
    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public boolean isFinal() {
        return isFinal;
    }

    public void setFinal(boolean isFinal) {
        this.isFinal = isFinal;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "AsrResult{" +
                "text='" + text + '\'' +
                ", confidence=" + confidence +
                ", isFinal=" + isFinal +
                '}';
    }
}
