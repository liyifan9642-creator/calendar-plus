package com.voicecal.ui.javafx.model;

import javafx.beans.property.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Observable model for a schedule item displayed in the UI.
 */
public class ScheduleItem {

    private final StringProperty id = new SimpleStringProperty();
    private final StringProperty title = new SimpleStringProperty();
    private final StringProperty description = new SimpleStringProperty();
    private final ObjectProperty<LocalDateTime> startTime = new SimpleObjectProperty<>();
    private final ObjectProperty<LocalDateTime> endTime = new SimpleObjectProperty<>();
    private final StringProperty location = new SimpleStringProperty();
    private final StringProperty status = new SimpleStringProperty("ACTIVE");

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MM-dd");

    public ScheduleItem() {
        this.id.set(UUID.randomUUID().toString());
    }

    public ScheduleItem(String id, String title, String description,
                        LocalDateTime startTime, LocalDateTime endTime,
                        String location, String status) {
        this.id.set(id);
        this.title.set(title);
        this.description.set(description);
        this.startTime.set(startTime);
        this.endTime.set(endTime);
        this.location.set(location);
        this.status.set(status);
    }

    // --- id ---
    public StringProperty idProperty() { return id; }
    public String getId() { return id.get(); }
    public void setId(String id) { this.id.set(id); }

    // --- title ---
    public StringProperty titleProperty() { return title; }
    public String getTitle() { return title.get(); }
    public void setTitle(String title) { this.title.set(title); }

    // --- description ---
    public StringProperty descriptionProperty() { return description; }
    public String getDescription() { return description.get(); }
    public void setDescription(String description) { this.description.set(description); }

    // --- startTime ---
    public ObjectProperty<LocalDateTime> startTimeProperty() { return startTime; }
    public LocalDateTime getStartTime() { return startTime.get(); }
    public void setStartTime(LocalDateTime startTime) { this.startTime.set(startTime); }

    // --- endTime ---
    public ObjectProperty<LocalDateTime> endTimeProperty() { return endTime; }
    public LocalDateTime getEndTime() { return endTime.get(); }
    public void setEndTime(LocalDateTime endTime) { this.endTime.set(endTime); }

    // --- location ---
    public StringProperty locationProperty() { return location; }
    public String getLocation() { return location.get(); }
    public void setLocation(String location) { this.location.set(location); }

    // --- status ---
    public StringProperty statusProperty() { return status; }
    public String getStatus() { return status.get(); }
    public void setStatus(String status) { this.status.set(status); }

    /**
     * Returns a formatted time range string, e.g. "09:00 - 10:30".
     */
    public String getTimeRange() {
        if (startTime.get() == null || endTime.get() == null) {
            return "";
        }
        return startTime.get().format(TIME_FMT) + " - " + endTime.get().format(TIME_FMT);
    }

    /**
     * Returns a formatted date string, e.g. "05-29".
     */
    public String getDateLabel() {
        if (startTime.get() == null) {
            return "";
        }
        return startTime.get().format(DATE_FMT);
    }

    /**
     * Returns true if this event is today.
     */
    public boolean isToday() {
        if (startTime.get() == null) return false;
        return startTime.get().toLocalDate().equals(LocalDateTime.now().toLocalDate());
    }

    /**
     * Returns true if this event is within the current week (Mon-Sun).
     */
    public boolean isThisWeek() {
        if (startTime.get() == null) return false;
        LocalDateTime now = LocalDateTime.now();
        java.time.LocalDate startOfWeek = now.toLocalDate()
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        java.time.LocalDate endOfWeek = startOfWeek.plusDays(6);
        java.time.LocalDate eventDate = startTime.get().toLocalDate();
        return !eventDate.isBefore(startOfWeek) && !eventDate.isAfter(endOfWeek);
    }

    @Override
    public String toString() {
        return getTitle() + " [" + getTimeRange() + "]";
    }
}
