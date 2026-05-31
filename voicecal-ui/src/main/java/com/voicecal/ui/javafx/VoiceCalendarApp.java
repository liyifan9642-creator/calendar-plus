package com.voicecal.ui.javafx;

import com.voicecal.ui.javafx.controller.MainController;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.stage.Stage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Objects;

/**
 * Main JavaFX application entry point for Voice Calendar desktop UI.
 */
public class VoiceCalendarApp extends Application {

    private static final Logger log = LoggerFactory.getLogger(VoiceCalendarApp.class);

    private static final String APP_TITLE = "Voice Calendar";
    private static final double MIN_WIDTH = 900;
    private static final double MIN_HEIGHT = 650;
    private static final double DEFAULT_WIDTH = 1100;
    private static final double DEFAULT_HEIGHT = 750;

    private MainController mainController;

    @Override
    public void start(Stage primaryStage) {
        try {
            FXMLLoader loader = new FXMLLoader(
                    getClass().getResource("/fxml/main_view.fxml"));
            Parent root = loader.load();
            mainController = loader.getController();

            Scene scene = new Scene(root, DEFAULT_WIDTH, DEFAULT_HEIGHT);
            scene.getStylesheets().add(
                    Objects.requireNonNull(getClass().getResource("/css/light-theme.css")).toExternalForm());

            primaryStage.setTitle(APP_TITLE);
            primaryStage.setScene(scene);
            primaryStage.setMinWidth(MIN_WIDTH);
            primaryStage.setMinHeight(MIN_HEIGHT);
            primaryStage.centerOnScreen();

            // Register scene after it's set on the stage
            mainController.setPrimaryStage(primaryStage);

            // Try to set app icon
            try {
                primaryStage.getIcons().add(
                        new Image(Objects.requireNonNull(getClass().getResourceAsStream("/icons/app-icon.png"))));
            } catch (Exception e) {
                log.debug("App icon not found, using default");
            }

            primaryStage.setOnCloseRequest(event -> {
                Platform.exit();
                System.exit(0);
            });

            primaryStage.show();
            log.info("Voice Calendar UI started successfully");

        } catch (IOException e) {
            log.error("Failed to load main view", e);
            throw new RuntimeException("Failed to initialize application", e);
        }
    }

    @Override
    public void stop() {
        if (mainController != null) {
            mainController.shutdown();
        }
        log.info("Voice Calendar UI stopped");
    }

    public static void main(String[] args) {
        launch(args);
    }
}
