package com.voicecal.ui.javafx.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.voicecal.ui.javafx.model.VoiceState;
import com.voicecal.ui.javafx.service.CalendarApiService;
import com.voicecal.ui.javafx.service.ThemeManager;
import com.voicecal.ui.javafx.widget.VoiceWaveformCanvas;
import javafx.animation.KeyFrame;
import javafx.animation.PauseTransition;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.fxml.Initializable;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.layout.HBox;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.stage.Modality;
import javafx.stage.Stage;
import javafx.util.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URL;
import java.util.Random;
import java.util.ResourceBundle;

/**
 * Controller for the main view. Manages voice state transitions,
 * waveform animation, and navigation to sub-views.
 */
public class MainController implements Initializable {

    private static final Logger log = LoggerFactory.getLogger(MainController.class);

    // --- FXML-injected nodes ---
    @FXML private HBox statusBar;
    @FXML private Label statusDot;
    @FXML private Label statusLabel;
    @FXML private Label confidenceLabel;
    @FXML private Button themeToggleBtn;
    @FXML private Button scheduleBtn;

    @FXML private StackPane waveformContainer;
    @FXML private VoiceWaveformCanvas waveformCanvas;

    @FXML private VBox resultArea;
    @FXML private TextArea resultText;
    @FXML private Label intentLabel;
    @FXML private Label messageLabel;

    @FXML private HBox buttonBar;
    @FXML private Button startBtn;
    @FXML private Button stopBtn;
    @FXML private Button clearBtn;
    @FXML private Button executeBtn;

    @FXML private Label footerLabel;

    // --- State ---
    private Stage primaryStage;
    private VoiceState currentState = VoiceState.IDLE;
    private final CalendarApiService apiService = new CalendarApiService("http://localhost:8080");
    private final ThemeManager themeManager = ThemeManager.getInstance();

    // Demo waveform animation (simulates audio levels)
    private Timeline demoWaveformTimeline;
    private final Random random = new Random();

    @Override
    public void initialize(URL location, ResourceBundle resources) {
        log.info("MainController initialized");

        // Resize waveform canvas to fill container (use listeners, not bindings)
        waveformContainer.widthProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal.doubleValue() > 48) {
                waveformCanvas.setWidth(newVal.doubleValue() - 48);
            }
        });
        waveformContainer.heightProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal.doubleValue() > 30) {
                waveformCanvas.setHeight(newVal.doubleValue() - 30);
            }
        });

        // Make resultText editable for manual text input
        resultText.setEditable(true);
        resultText.setPromptText("输入文字命令或点击录音...");

        // Enable stop/send button when there's text
        resultText.textProperty().addListener((obs, oldVal, newVal) -> {
            if (currentState == VoiceState.IDLE) {
                stopBtn.setDisable(newVal == null || newVal.isBlank());
            }
        });

        // Initial UI state
        updateVoiceState(VoiceState.IDLE);
    }

    /**
     * Sets the primary stage reference (called by VoiceCalendarApp).
     */
    public void setPrimaryStage(Stage primaryStage) {
        this.primaryStage = primaryStage;
        themeManager.registerScene(primaryStage.getScene());
    }

    // ====================================================================
    // Voice State Management
    // ====================================================================

    private void updateVoiceState(VoiceState newState) {
        currentState = newState;

        Platform.runLater(() -> {
            // Update status bar
            statusLabel.setText(newState.getDisplayName());

            // Remove old state CSS classes
            statusDot.getStyleClass().removeIf(s -> s.startsWith("status-"));
            statusDot.getStyleClass().add("status-" + newState.getCssClass());

            // Update waveform
            waveformCanvas.setVoiceState(newState);

            // Update button states based on voice state
            switch (newState) {
                case IDLE:
                    startBtn.setDisable(false);
                    stopBtn.setDisable(true);
                    executeBtn.setDisable(resultText.getText().isBlank());
                    break;
                case LISTENING:
                    startBtn.setDisable(true);
                    stopBtn.setDisable(false);
                    break;
                case PROCESSING:
                    startBtn.setDisable(true);
                    stopBtn.setDisable(true);
                    break;
                case COMPLETED:
                case ERROR:
                    // Brief pause, then return to idle
                    PauseTransition pause = new PauseTransition(Duration.seconds(2));
                    pause.setOnFinished(e -> updateVoiceState(VoiceState.IDLE));
                    pause.play();
                    break;
            }
        });
    }

    // ====================================================================
    // Button Handlers
    // ====================================================================

    @FXML
    private void onStartRecording() {
        log.info("Start recording requested");
        updateVoiceState(VoiceState.LISTENING);
        resultText.clear();
        intentLabel.setText("--");
        messageLabel.setText("--");
        confidenceLabel.setText("--");

        // Start demo waveform (simulates microphone input)
        startDemoWaveform();
    }

    @FXML
    private void onStopRecording() {
        log.info("Stop recording requested");
        stopDemoWaveform();
        updateVoiceState(VoiceState.PROCESSING);

        // Get text from resultText (either from recording simulation or manual input)
        String text = resultText.getText();
        if (text == null || text.isBlank()) {
            // If no text, use a demo text for testing
            text = "明天下午三点开会";
            resultText.setText(text);
        }

        // Call backend API to process the text
        processTextCommand(text);
    }

    @FXML
    private void onClearResult() {
        resultText.clear();
        intentLabel.setText("--");
        messageLabel.setText("--");
        confidenceLabel.setText("--");
        executeBtn.setDisable(true);
        log.info("Results cleared");
    }

    @FXML
    private void onExecuteCommand() {
        String text = resultText.getText();
        if (text == null || text.isBlank()) return;

        log.info("Executing command from text: {}", text);
        updateVoiceState(VoiceState.PROCESSING);
        processTextCommand(text);
    }

    /**
     * Process text command by calling backend API.
     */
    private void processTextCommand(String text) {
        log.info("Calling backend API with text: {}", text);

        apiService.processTextCommand(text)
                .thenAccept(responseJson -> {
                    log.info("Received response from backend: {}", responseJson);
                    Platform.runLater(() -> {
                        try {
                            ObjectMapper mapper = new ObjectMapper();
                            JsonNode root = mapper.readTree(responseJson);

                            boolean success = root.path("success").asBoolean(false);
                            // intent is an enum, get as text
                            String intent = root.path("intent").isTextual()
                                    ? root.path("intent").asText()
                                    : root.path("intent").toString().replace("\"", "");
                            String responseText = root.has("responseText") && !root.get("responseText").isNull()
                                    ? root.get("responseText").asText() : "";
                            String errorMessage = root.has("errorMessage") && !root.get("errorMessage").isNull()
                                    ? root.get("errorMessage").asText() : "";

                            log.info("Parsed response: success={}, intent={}, responseText={}, errorMessage={}",
                                    success, intent, responseText, errorMessage);

                            if (success) {
                                showRecognitionResult(text, intent, 0.9, responseText);
                                updateVoiceState(VoiceState.COMPLETED);
                            } else {
                                String errorMsg = !errorMessage.isEmpty() ? errorMessage : "未知错误";
                                showRecognitionResult(text, "ERROR", 0.0, "失败: " + errorMsg);
                                updateVoiceState(VoiceState.ERROR);
                            }
                        } catch (Exception e) {
                            log.error("Failed to parse response: {}", e.getMessage(), e);
                            showRecognitionResult(text, "ERROR", 0.0, "解析响应失败: " + e.getMessage());
                            updateVoiceState(VoiceState.ERROR);
                        }
                    });
                })
                .exceptionally(ex -> {
                    Platform.runLater(() -> {
                        log.error("API call failed: {}", ex.getMessage(), ex);
                        showRecognitionResult(text, "ERROR", 0.0, "API调用失败: " + ex.getMessage());
                        updateVoiceState(VoiceState.ERROR);
                    });
                    return null;
                });
    }

    @FXML
    private void onToggleTheme() {
        themeManager.toggleTheme();
        boolean dark = themeManager.isDarkMode();
        themeToggleBtn.setText(dark ? "☀" : "🌙");
    }

    @FXML
    private void onShowSchedule() {
        try {
            FXMLLoader loader = new FXMLLoader(
                    getClass().getResource("/fxml/schedule_view.fxml"));
            Parent scheduleRoot = loader.load();

            Stage scheduleStage = new Stage();
            scheduleStage.setTitle("日程列表");
            scheduleStage.initModality(Modality.APPLICATION_MODAL);
            scheduleStage.initOwner(primaryStage);

            Scene scene = new Scene(scheduleRoot, 500, 600);
            // Apply current theme
            themeManager.registerScene(scene);

            scheduleStage.setScene(scene);
            scheduleStage.setMinWidth(400);
            scheduleStage.setMinHeight(450);
            scheduleStage.showAndWait();

            // Unregister when closed
            themeManager.unregisterScene(scene);
        } catch (IOException e) {
            log.error("Failed to open schedule view", e);
        }
    }

    // ====================================================================
    // Helpers
    // ====================================================================

    private void showRecognitionResult(String text, String intent, double confidence, String message) {
        resultText.setText(text);
        intentLabel.setText(intent);
        confidenceLabel.setText(String.format("%.0f%%", confidence * 100));
        messageLabel.setText(message);
        executeBtn.setDisable(false);
    }

    /**
     * Starts a demo waveform animation that simulates microphone input levels.
     * In production, replace this with real audio data from the microphone.
     */
    private void startDemoWaveform() {
        stopDemoWaveform();
        demoWaveformTimeline = new Timeline(
                new KeyFrame(Duration.millis(80), e -> {
                    double level = 0.2 + random.nextDouble() * 0.7;
                    waveformCanvas.feedAudioLevel(level);
                })
        );
        demoWaveformTimeline.setCycleCount(Timeline.INDEFINITE);
        demoWaveformTimeline.play();
    }

    private void stopDemoWaveform() {
        if (demoWaveformTimeline != null) {
            demoWaveformTimeline.stop();
            demoWaveformTimeline = null;
        }
    }

    /**
     * Cleanup resources when the application exits.
     */
    public void shutdown() {
        stopDemoWaveform();
        if (waveformCanvas != null) {
            waveformCanvas.dispose();
        }
    }
}
