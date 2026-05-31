package com.voicecal.ui.javafx.model;

/**
 * Enumeration of voice recognition UI states.
 */
public enum VoiceState {

    IDLE("待命", "idle"),
    LISTENING("聆听中", "listening"),
    PROCESSING("处理中", "processing"),
    COMPLETED("完成", "completed"),
    ERROR("错误", "error");

    private final String displayName;
    private final String cssClass;

    VoiceState(String displayName, String cssClass) {
        this.displayName = displayName;
        this.cssClass = cssClass;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getCssClass() {
        return cssClass;
    }
}
