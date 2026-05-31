package com.voicecal.ui.javafx.widget;

import com.voicecal.ui.javafx.model.VoiceState;
import javafx.animation.AnimationTimer;
import javafx.beans.property.ObjectProperty;
import javafx.beans.property.SimpleObjectProperty;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.effect.GaussianBlur;
import javafx.scene.paint.Color;
import javafx.scene.paint.CycleMethod;
import javafx.scene.paint.LinearGradient;
import javafx.scene.paint.Stop;

import java.util.Random;

/**
 * Custom canvas widget that renders a voice waveform visualization.
 * Animates differently depending on the current VoiceState.
 */
public class VoiceWaveformCanvas extends Canvas {

    private static final int BAR_COUNT = 64;
    private static final double BAR_GAP = 2.0;
    private static final double MIN_BAR_HEIGHT = 4.0;
    private static final double IDLE_AMPLITUDE = 0.15;
    private static final double LISTENING_AMPLITUDE = 0.85;
    private static final double PROCESSING_AMPLITUDE = 0.55;

    private final ObjectProperty<VoiceState> voiceState = new SimpleObjectProperty<>(VoiceState.IDLE);

    private final double[] barHeights = new double[BAR_COUNT];
    private final double[] targetHeights = new double[BAR_COUNT];
    private final Random random = new Random();

    // Color palettes for different states
    private static final Color IDLE_COLOR_START = Color.web("#94a3b8");
    private static final Color IDLE_COLOR_END = Color.web("#64748b");
    private static final Color LISTENING_COLOR_START = Color.web("#22d3ee");
    private static final Color LISTENING_COLOR_END = Color.web("#3b82f6");
    private static final Color PROCESSING_COLOR_START = Color.web("#a78bfa");
    private static final Color PROCESSING_COLOR_END = Color.web("#8b5cf6");
    private static final Color ERROR_COLOR_START = Color.web("#f87171");
    private static final Color ERROR_COLOR_END = Color.web("#ef4444");
    private static final Color COMPLETED_COLOR_START = Color.web("#34d399");
    private static final Color COMPLETED_COLOR_END = Color.web("#10b981");

    private final AnimationTimer animationTimer;
    private long lastUpdate = 0;
    private double phase = 0;

    public VoiceWaveformCanvas() {
        super();

        // Initialize bar heights
        for (int i = 0; i < BAR_COUNT; i++) {
            barHeights[i] = MIN_BAR_HEIGHT;
            targetHeights[i] = MIN_BAR_HEIGHT;
        }

        // Redraw when size changes
        widthProperty().addListener((obs, oldVal, newVal) -> draw());
        heightProperty().addListener((obs, oldVal, newVal) -> draw());

        // Animation timer - only runs when canvas is visible and has valid size
        animationTimer = new AnimationTimer() {
            @Override
            public void handle(long now) {
                if (now - lastUpdate > 16_000_000) { // ~60 FPS
                    lastUpdate = now;
                    if (getWidth() > 0 && getHeight() > 0 && isVisible()) {
                        updateBars();
                        draw();
                    }
                }
            }
        };
        animationTimer.start();
    }

    public ObjectProperty<VoiceState> voiceStateProperty() {
        return voiceState;
    }

    public VoiceState getVoiceState() {
        return voiceState.get();
    }

    public void setVoiceState(VoiceState state) {
        this.voiceState.set(state);
    }

    /**
     * Feeds external audio level data (0.0 to 1.0) into the waveform.
     * The value is distributed across bars with slight randomization.
     */
    public void feedAudioLevel(double level) {
        double amplitude = Math.max(0, Math.min(1, level));
        for (int i = 0; i < BAR_COUNT; i++) {
            double centerDist = Math.abs(i - BAR_COUNT / 2.0) / (BAR_COUNT / 2.0);
            double falloff = 1.0 - centerDist * 0.6;
            targetHeights[i] = amplitude * falloff * getMaxBarHeight()
                    * (0.7 + random.nextDouble() * 0.6);
        }
    }

    private void updateBars() {
        double maxHeight = getMaxBarHeight();
        double amplitude;
        VoiceState state = voiceState.get();

        switch (state) {
            case LISTENING:
                amplitude = LISTENING_AMPLITUDE;
                break;
            case PROCESSING:
                amplitude = PROCESSING_AMPLITUDE;
                break;
            case IDLE:
            default:
                amplitude = IDLE_AMPLITUDE;
                break;
        }

        phase += 0.05;

        for (int i = 0; i < BAR_COUNT; i++) {
            // Generate target heights based on state
            if (state == VoiceState.LISTENING) {
                double wave = Math.sin(phase + i * 0.3) * 0.4 + 0.6;
                double noise = random.nextDouble() * 0.4;
                targetHeights[i] = maxHeight * amplitude * wave * (noise + 0.6);
            } else if (state == VoiceState.PROCESSING) {
                double wave = Math.sin(phase * 1.5 + i * 0.2) * 0.5 + 0.5;
                targetHeights[i] = maxHeight * amplitude * wave;
            } else {
                // Idle: gentle breathing wave
                double wave = Math.sin(phase * 0.5 + i * 0.15) * 0.5 + 0.5;
                targetHeights[i] = maxHeight * amplitude * wave + MIN_BAR_HEIGHT;
            }

            // Smooth interpolation towards target
            double speed = state == VoiceState.LISTENING ? 0.25 : 0.1;
            barHeights[i] += (targetHeights[i] - barHeights[i]) * speed;
        }
    }

    private void draw() {
        double w = getWidth();
        double h = getHeight();
        if (w <= 0 || h <= 0) return;

        GraphicsContext gc = getGraphicsContext2D();
        if (gc == null) return;
        gc.clearRect(0, 0, w, h);

        double barWidth = (w - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
        double centerY = h / 2.0;

        // Determine colors based on state
        Color colorStart, colorEnd;
        VoiceState state = voiceState.get();
        switch (state) {
            case LISTENING:
                colorStart = LISTENING_COLOR_START;
                colorEnd = LISTENING_COLOR_END;
                break;
            case PROCESSING:
                colorStart = PROCESSING_COLOR_START;
                colorEnd = PROCESSING_COLOR_END;
                break;
            case COMPLETED:
                colorStart = COMPLETED_COLOR_START;
                colorEnd = COMPLETED_COLOR_END;
                break;
            case ERROR:
                colorStart = ERROR_COLOR_START;
                colorEnd = ERROR_COLOR_END;
                break;
            default:
                colorStart = IDLE_COLOR_START;
                colorEnd = IDLE_COLOR_END;
                break;
        }

        // Draw bars
        for (int i = 0; i < BAR_COUNT; i++) {
            double x = i * (barWidth + BAR_GAP);
            double barH = Math.max(MIN_BAR_HEIGHT, barHeights[i]);

            // Gradient per bar
            double ratio = (double) i / BAR_COUNT;
            Color barColor = colorStart.interpolate(colorEnd, ratio);

            gc.setFill(barColor);
            gc.setGlobalAlpha(0.85);

            // Draw mirrored bar (top and bottom from center)
            double cornerRadius = Math.min(barWidth / 2, 4);
            gc.fillRoundRect(x, centerY - barH / 2, barWidth, barH, cornerRadius, cornerRadius);
        }

        gc.setGlobalAlpha(1.0);
    }

    private double getMaxBarHeight() {
        return getHeight() * 0.8;
    }

    @Override
    public boolean isResizable() {
        return true;
    }

    @Override
    public double prefWidth(double height) {
        return 800;
    }

    @Override
    public double prefHeight(double width) {
        return 300;
    }

    @Override
    public double minWidth(double height) {
        return 200;
    }

    @Override
    public double minHeight(double width) {
        return 100;
    }

    /**
     * Stops the animation timer. Call when the view is disposed.
     */
    public void dispose() {
        animationTimer.stop();
    }
}
