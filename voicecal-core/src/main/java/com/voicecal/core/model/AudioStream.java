package com.voicecal.core.model;

import java.io.InputStream;

/**
 * 音频流模型
 */
public class AudioStream {

    private InputStream inputStream;
    private AudioFormat format;
    private int sampleRate;
    private int channels;

    public AudioStream() {
        this.format = AudioFormat.PCM;
        this.sampleRate = 16000;
        this.channels = 1;
    }

    public AudioStream(InputStream inputStream) {
        this();
        this.inputStream = inputStream;
    }

    public AudioStream(InputStream inputStream, AudioFormat format, int sampleRate, int channels) {
        this.inputStream = inputStream;
        this.format = format;
        this.sampleRate = sampleRate;
        this.channels = channels;
    }

    // Getters and Setters
    public InputStream getInputStream() {
        return inputStream;
    }

    public void setInputStream(InputStream inputStream) {
        this.inputStream = inputStream;
    }

    public AudioFormat getFormat() {
        return format;
    }

    public void setFormat(AudioFormat format) {
        this.format = format;
    }

    public int getSampleRate() {
        return sampleRate;
    }

    public void setSampleRate(int sampleRate) {
        this.sampleRate = sampleRate;
    }

    public int getChannels() {
        return channels;
    }

    public void setChannels(int channels) {
        this.channels = channels;
    }

    /**
     * 音频格式枚举
     */
    public enum AudioFormat {
        PCM,
        WAV,
        MP3,
        OGG,
        OPUS
    }
}
