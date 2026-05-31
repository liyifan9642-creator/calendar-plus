package com.voicecal.nlu.langchain;

import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.EventStatus;
import com.voicecal.core.service.CalendarService;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Calendar tool definitions for LangChain4j agent.
 * Exposes calendar CRUD operations as LLM-callable tools via @Tool annotation.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CalendarTools {

    private final CalendarService calendarService;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @Tool("Create a new calendar event with title, start time, end time, optional description and location. " +
          "Times should be in ISO format like '2024-01-15T10:00:00'. " +
          "Returns the created event details including its ID.")
    public String createEvent(
            String title,
            String startTime,
            String endTime,
            String description,
            String location
    ) {
        log.info("Tool call: createEvent - title={}, start={}, end={}, desc={}, loc={}",
                title, startTime, endTime, description, location);

        try {
            LocalDateTime start = LocalDateTime.parse(startTime, FORMATTER);
            LocalDateTime end = LocalDateTime.parse(endTime, FORMATTER);

            if (end.isBefore(start)) {
                return "Error: End time must be after start time.";
            }

            CalendarEvent event = CalendarEvent.builder()
                    .title(title)
                    .startTime(start)
                    .endTime(end)
                    .description(description != null ? description : "")
                    .location(location != null ? location : "")
                    .status(EventStatus.ACTIVE)
                    .build();

            CalendarEvent created = calendarService.createEvent(event);

            return String.format(
                    "Event created successfully. ID: %s, Title: %s, Time: %s to %s, Location: %s",
                    created.getId(), created.getTitle(),
                    created.getStartTime().format(FORMATTER),
                    created.getEndTime().format(FORMATTER),
                    created.getLocation() != null ? created.getLocation() : "N/A"
            );
        } catch (DateTimeParseException e) {
            return "Error: Invalid date/time format. Please use ISO format like '2024-01-15T10:00:00'.";
        } catch (Exception e) {
            log.error("Failed to create event", e);
            return "Error: Failed to create event - " + e.getMessage();
        }
    }

    @Tool("Query calendar events within a specified time range. " +
          "Times should be in ISO format like '2024-01-15T00:00:00'. " +
          "Returns a list of events found in the given range.")
    public String queryEvents(String startTime, String endTime) {
        log.info("Tool call: queryEvents - start={}, end={}", startTime, endTime);

        try {
            LocalDateTime start = LocalDateTime.parse(startTime, FORMATTER);
            LocalDateTime end = LocalDateTime.parse(endTime, FORMATTER);

            List<CalendarEvent> events = calendarService.getEvents(start, end);

            if (events.isEmpty()) {
                return "No events found in the specified time range.";
            }

            String eventList = events.stream()
                    .map(e -> String.format(
                            "- [%s] %s: %s to %s%s",
                            e.getId(), e.getTitle(),
                            e.getStartTime().format(FORMATTER),
                            e.getEndTime().format(FORMATTER),
                            e.getLocation() != null && !e.getLocation().isEmpty()
                                    ? " @ " + e.getLocation() : ""
                    ))
                    .collect(Collectors.joining("\n"));

            return String.format("Found %d event(s):\n%s", events.size(), eventList);
        } catch (DateTimeParseException e) {
            return "Error: Invalid date/time format. Please use ISO format like '2024-01-15T00:00:00'.";
        } catch (Exception e) {
            log.error("Failed to query events", e);
            return "Error: Failed to query events - " + e.getMessage();
        }
    }

    @Tool("Delete a calendar event by its ID. " +
          "Returns confirmation of deletion or an error message if the event was not found.")
    public String deleteEvent(String eventId) {
        log.info("Tool call: deleteEvent - eventId={}", eventId);

        try {
            UUID id = UUID.fromString(eventId);
            calendarService.deleteEvent(id);
            return String.format("Event %s has been deleted successfully.", eventId);
        } catch (IllegalArgumentException e) {
            return "Error: Invalid event ID format.";
        } catch (Exception e) {
            log.error("Failed to delete event", e);
            return "Error: Failed to delete event - " + e.getMessage();
        }
    }

    @Tool("Update an existing calendar event by its ID. " +
          "Provide the event ID and any fields to update (title, startTime, endTime, description, location). " +
          "Only non-null fields will be updated. Times should be in ISO format like '2024-01-15T10:00:00'.")
    public String updateEvent(
            String eventId,
            String title,
            String startTime,
            String endTime,
            String description,
            String location
    ) {
        log.info("Tool call: updateEvent - id={}, title={}, start={}, end={}, desc={}, loc={}",
                eventId, title, startTime, endTime, description, location);

        try {
            UUID id = UUID.fromString(eventId);

            CalendarEvent existing = calendarService.getEvent(id);
            if (existing == null) {
                return String.format("Error: Event with ID %s not found.", eventId);
            }

            // Update only non-null fields
            if (title != null && !title.isEmpty()) {
                existing.setTitle(title);
            }
            if (startTime != null && !startTime.isEmpty()) {
                existing.setStartTime(LocalDateTime.parse(startTime, FORMATTER));
            }
            if (endTime != null && !endTime.isEmpty()) {
                existing.setEndTime(LocalDateTime.parse(endTime, FORMATTER));
            }
            if (description != null && !description.isEmpty()) {
                existing.setDescription(description);
            }
            if (location != null && !location.isEmpty()) {
                existing.setLocation(location);
            }

            CalendarEvent updated = calendarService.updateEvent(id, existing);

            return String.format(
                    "Event updated successfully. ID: %s, Title: %s, Time: %s to %s, Location: %s",
                    updated.getId(), updated.getTitle(),
                    updated.getStartTime().format(FORMATTER),
                    updated.getEndTime().format(FORMATTER),
                    updated.getLocation() != null ? updated.getLocation() : "N/A"
            );
        } catch (DateTimeParseException e) {
            return "Error: Invalid date/time format. Please use ISO format like '2024-01-15T10:00:00'.";
        } catch (IllegalArgumentException e) {
            return "Error: Invalid event ID format.";
        } catch (Exception e) {
            log.error("Failed to update event", e);
            return "Error: Failed to update event - " + e.getMessage();
        }
    }
}
