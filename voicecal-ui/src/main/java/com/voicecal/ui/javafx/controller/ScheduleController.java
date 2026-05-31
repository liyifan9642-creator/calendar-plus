package com.voicecal.ui.javafx.controller;

import com.voicecal.ui.javafx.model.ScheduleItem;
import com.voicecal.ui.javafx.service.CalendarApiService;
import javafx.application.Platform;
import javafx.collections.transformation.FilteredList;
import javafx.fxml.FXML;
import javafx.fxml.Initializable;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URL;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ResourceBundle;

/**
 * Controller for the schedule list view. Displays today's or this week's events
 * and allows clicking to see details.
 */
public class ScheduleController implements Initializable {

    private static final Logger log = LoggerFactory.getLogger(ScheduleController.class);
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter FULL_FMT = DateTimeFormatter.ofPattern("MM-dd HH:mm");

    // --- FXML-injected nodes ---
    @FXML private Button refreshBtn;
    @FXML private ToggleButton todayTab;
    @FXML private ToggleButton weekTab;
    @FXML private ListView<ScheduleItem> scheduleListView;
    @FXML private VBox loadingOverlay;

    // Detail panel
    @FXML private VBox detailPanel;
    @FXML private Label detailTitle;
    @FXML private Label detailTime;
    @FXML private Label detailLocation;
    @FXML private Label detailDescription;
    @FXML private Label detailStatus;

    // --- State ---
    private final CalendarApiService apiService = new CalendarApiService();
    private boolean showToday = true;

    @Override
    public void initialize(URL location, ResourceBundle resources) {
        log.info("ScheduleController initialized");

        // Configure list view cell factory
        scheduleListView.setCellFactory(list -> new ScheduleListCell());

        // Handle list selection for detail panel
        scheduleListView.getSelectionModel().selectedItemProperty().addListener(
                (obs, oldItem, newItem) -> {
                    if (newItem != null) {
                        showDetail(newItem);
                    }
                });

        // Load sample data for demo (since API may not be running)
        loadDemoData();

        // Also try to load from API
        // apiService.fetchTodayEvents();
        // scheduleListView.setItems(apiService.getScheduleItems());
    }

    // ====================================================================
    // Tab Handlers
    // ====================================================================

    @FXML
    private void onTodayTab() {
        showToday = true;
        loadDemoData();
        log.info("Switched to Today tab");
    }

    @FXML
    private void onWeekTab() {
        showToday = false;
        loadDemoData();
        log.info("Switched to This Week tab");
    }

    @FXML
    private void onRefresh() {
        log.info("Refreshing schedule data");
        loadingOverlay.setVisible(true);
        loadingOverlay.setManaged(true);

        // Simulate loading
        new Thread(() -> {
            try {
                Thread.sleep(800);
            } catch (InterruptedException ignored) {}
            Platform.runLater(() -> {
                loadDemoData();
                loadingOverlay.setVisible(false);
                loadingOverlay.setManaged(false);
            });
        }).start();
    }

    // ====================================================================
    // Detail Panel
    // ====================================================================

    private void showDetail(ScheduleItem item) {
        detailPanel.setVisible(true);
        detailPanel.setManaged(true);

        detailTitle.setText(item.getTitle());
        detailTime.setText(item.getStartTime() != null && item.getEndTime() != null
                ? item.getStartTime().format(FULL_FMT) + " - " + item.getEndTime().format(TIME_FMT)
                : "未设定");
        detailLocation.setText(item.getLocation() != null && !item.getLocation().isEmpty()
                ? item.getLocation()
                : "未设定");
        detailDescription.setText(item.getDescription() != null && !item.getDescription().isEmpty()
                ? item.getDescription()
                : "无描述");
        detailStatus.setText(item.getStatus());
    }

    // ====================================================================
    // Demo Data (used when API is not available)
    // ====================================================================

    private void loadDemoData() {
        LocalDateTime now = LocalDateTime.now();
        java.util.List<ScheduleItem> items = new java.util.ArrayList<>();

        if (showToday) {
            items.add(new ScheduleItem("1", "团队站会",
                    "每日团队同步会议，汇报昨日进展和今日计划",
                    now.toLocalDate().atTime(9, 0),
                    now.toLocalDate().atTime(9, 30),
                    "会议室 A", "ACTIVE"));

            items.add(new ScheduleItem("2", "产品评审会",
                    "评审Q2产品路线图和新功能优先级",
                    now.toLocalDate().atTime(14, 0),
                    now.toLocalDate().atTime(15, 30),
                    "会议室 B", "ACTIVE"));

            items.add(new ScheduleItem("3", "代码审查",
                    "审查 voicecal-ui 模块的PR提交",
                    now.toLocalDate().atTime(16, 0),
                    now.toLocalDate().atTime(17, 0),
                    "线上会议", "ACTIVE"));
        } else {
            // This week's events
            items.add(new ScheduleItem("1", "团队站会",
                    "每日团队同步会议",
                    now.toLocalDate().atTime(9, 0),
                    now.toLocalDate().atTime(9, 30),
                    "会议室 A", "ACTIVE"));

            items.add(new ScheduleItem("2", "产品评审会",
                    "评审Q2产品路线图",
                    now.toLocalDate().atTime(14, 0),
                    now.toLocalDate().atTime(15, 30),
                    "会议室 B", "ACTIVE"));

            items.add(new ScheduleItem("4", "客户演示",
                    "向客户展示语音日历功能原型",
                    now.toLocalDate().plusDays(1).atTime(10, 0),
                    now.toLocalDate().plusDays(1).atTime(11, 30),
                    "客户现场", "ACTIVE"));

            items.add(new ScheduleItem("5", "技术方案讨论",
                    "讨论语音识别引擎选型方案",
                    now.toLocalDate().plusDays(2).atTime(13, 0),
                    now.toLocalDate().plusDays(2).atTime(14, 0),
                    "会议室 C", "ACTIVE"));

            items.add(new ScheduleItem("6", "Sprint回顾",
                    "回顾本Sprint的成果和改进点",
                    now.toLocalDate().plusDays(3).atTime(15, 0),
                    now.toLocalDate().plusDays(3).atTime(16, 0),
                    "会议室 A", "ACTIVE"));

            items.add(new ScheduleItem("7", "架构设计评审",
                    "讨论微服务拆分和API网关方案",
                    now.toLocalDate().plusDays(4).atTime(9, 30),
                    now.toLocalDate().plusDays(4).atTime(11, 0),
                    "线上会议", "ACTIVE"));
        }

        scheduleListView.getItems().setAll(items);
    }

    // ====================================================================
    // Custom List Cell
    // ====================================================================

    /**
     * Custom cell for rendering schedule items in the list view.
     * Shows time, title, location with a colored status indicator.
     */
    private static class ScheduleListCell extends ListCell<ScheduleItem> {

        private final HBox container;
        private final Label timeLabel;
        private final Label titleLabel;
        private final Label locationLabel;
        private final Label statusDot;

        ScheduleListCell() {
            super();

            statusDot = new Label("●");
            statusDot.setStyle("-fx-text-fill: #22c55e; -fx-font-size: 10;");

            timeLabel = new Label();
            timeLabel.setStyle("-fx-text-fill: -fx-text-secondary; -fx-font-size: 12;");
            timeLabel.setMinWidth(100);

            titleLabel = new Label();
            titleLabel.setStyle("-fx-text-fill: -fx-text-primary; -fx-font-size: 14; -fx-font-weight: bold;");

            locationLabel = new Label();
            locationLabel.setStyle("-fx-text-fill: -fx-text-tertiary; -fx-font-size: 11;");

            VBox textBox = new VBox(2, titleLabel, locationLabel);

            Region spacer = new Region();
            HBox.setHgrow(spacer, Priority.ALWAYS);

            container = new HBox(10, statusDot, timeLabel, textBox);
            container.setAlignment(Pos.CENTER_LEFT);
            container.setPadding(new Insets(10, 12, 10, 12));
            container.setStyle("-fx-background-color: -fx-card-bg; -fx-background-radius: 8; " +
                    "-fx-border-color: -fx-border-color; -fx-border-radius: 8; -fx-border-width: 1;");
        }

        @Override
        protected void updateItem(ScheduleItem item, boolean empty) {
            super.updateItem(item, empty);

            if (empty || item == null) {
                setGraphic(null);
                setText(null);
            } else {
                timeLabel.setText(item.getTimeRange());
                titleLabel.setText(item.getTitle());
                locationLabel.setText(item.getLocation() != null ? "📍 " + item.getLocation() : "");

                // Color the status dot based on status
                String status = item.getStatus();
                if ("ACTIVE".equals(status)) {
                    statusDot.setStyle("-fx-text-fill: #22c55e; -fx-font-size: 10;");
                } else if ("CANCELLED".equals(status)) {
                    statusDot.setStyle("-fx-text-fill: #ef4444; -fx-font-size: 10;");
                } else {
                    statusDot.setStyle("-fx-text-fill: #94a3b8; -fx-font-size: 10;");
                }

                setGraphic(container);
                setText(null);
            }
        }
    }
}
