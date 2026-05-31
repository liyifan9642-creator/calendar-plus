package com.voicecal.ui.javafx.service;

import javafx.beans.property.BooleanProperty;
import javafx.beans.property.SimpleBooleanProperty;
import javafx.scene.Scene;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Manages application theme switching between light and dark modes.
 * Maintains a list of registered scenes and updates their stylesheets atomically.
 */
public class ThemeManager {

    private static final Logger log = LoggerFactory.getLogger(ThemeManager.class);

    private static final String LIGHT_THEME = "/css/light-theme.css";
    private static final String DARK_THEME = "/css/dark-theme.css";

    private static final ThemeManager INSTANCE = new ThemeManager();

    private final BooleanProperty darkMode = new SimpleBooleanProperty(false);
    private final List<Scene> registeredScenes = new ArrayList<>();

    private ThemeManager() {}

    public static ThemeManager getInstance() {
        return INSTANCE;
    }

    /**
     * Property for dark mode state. Bind UI controls to this.
     */
    public BooleanProperty darkModeProperty() {
        return darkMode;
    }

    public boolean isDarkMode() {
        return darkMode.get();
    }

    /**
     * Registers a scene for automatic theme updates.
     */
    public void registerScene(Scene scene) {
        registeredScenes.add(scene);
        applyTheme(scene);
    }

    /**
     * Unregisters a scene (e.g., when a window is closed).
     */
    public void unregisterScene(Scene scene) {
        registeredScenes.remove(scene);
    }

    /**
     * Toggles between light and dark themes.
     */
    public void toggleTheme() {
        darkMode.set(!darkMode.get());
        applyThemeToAll();
        log.info("Theme switched to {}", darkMode.get() ? "dark" : "light");
    }

    /**
     * Explicitly sets the theme.
     *
     * @param dark true for dark mode, false for light mode
     */
    public void setDarkMode(boolean dark) {
        darkMode.set(dark);
        applyThemeToAll();
    }

    private void applyThemeToAll() {
        for (Scene scene : registeredScenes) {
            applyTheme(scene);
        }
    }

    private void applyTheme(Scene scene) {
        String themeCss = darkMode.get() ? DARK_THEME : LIGHT_THEME;
        String otherCss = darkMode.get() ? LIGHT_THEME : DARK_THEME;

        try {
            String themeUrl = Objects.requireNonNull(getClass().getResource(themeCss)).toExternalForm();
            scene.getStylesheets().removeIf(s -> s.contains("light-theme") || s.contains("dark-theme"));
            scene.getStylesheets().add(themeUrl);
        } catch (Exception e) {
            log.error("Failed to apply theme: {}", e.getMessage());
        }
    }
}
