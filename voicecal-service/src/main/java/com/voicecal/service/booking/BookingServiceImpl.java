package com.voicecal.service.booking;

import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.EventStatus;
import com.voicecal.core.model.VoiceCommand;
import com.voicecal.core.service.CalendarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

/**
 * Implementation of BookingService that translates voice commands into calendar operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final CalendarService calendarService;

    @Override
    public CalendarEvent bookEventFromCommand(VoiceCommand command) {
        log.info("Booking event from command: {}", command.getRawText());

        Map<String, String> entities = command.getEntities();

        CalendarEvent event = CalendarEvent.builder()
                .id(UUID.randomUUID())
                .title(extractTitle(command.getRawText()))
                .startTime(extractDateTime(entities, "start"))
                .endTime(extractDateTime(entities, "end"))
                .location(entities.get("location"))
                .status(EventStatus.ACTIVE)
                .build();

        return calendarService.createEvent(event);
    }

    @Override
    public CalendarEvent updateEventFromCommand(VoiceCommand command) {
        log.info("Updating event from command: {}", command.getRawText());
        // TODO: Implement event matching and update logic
        throw new UnsupportedOperationException("Event update from voice command not yet implemented");
    }

    @Override
    public boolean deleteEventFromCommand(VoiceCommand command) {
        log.info("Deleting event from command: {}", command.getRawText());
        // TODO: Implement event matching and deletion logic
        throw new UnsupportedOperationException("Event deletion from voice command not yet implemented");
    }

    private String extractTitle(String text) {
        // Simple title extraction - can be enhanced with NLP
        String[] keywords = {"schedule", "create", "add", "book", "meeting", "appointment"};
        String title = text;

        for (String keyword : keywords) {
            title = title.replaceAll("(?i)\\b" + keyword + "\\b", "");
        }

        // Remove time/date related words
        title = title.replaceAll("(?i)\\b(tomorrow|today|next|at|on|from|to|for)\\b", "");
        title = title.replaceAll("\\d{1,2}:?\\d{0,2}\\s*(am|pm)?", "");
        title = title.replaceAll("\\d{4}-\\d{2}-\\d{2}", "");
        title = title.replaceAll("\\s+", " ").trim();

        return title.isEmpty() ? "New Event" : title;
    }

    private LocalDateTime extractDateTime(Map<String, String> entities, String prefix) {
        String dateStr = entities.get("date");
        String timeStr = entities.get("time");
        String relativeDate = entities.get("relative_date");

        LocalDateTime baseDate = LocalDateTime.now();

        if (relativeDate != null) {
            if (relativeDate.equalsIgnoreCase("tomorrow")) {
                baseDate = baseDate.plusDays(1);
            }
            // Add more relative date handling
        } else if (dateStr != null) {
            try {
                baseDate = LocalDateTime.parse(dateStr + "T00:00:00");
            } catch (Exception e) {
                log.warn("Failed to parse date: {}", dateStr);
            }
        }

        if (timeStr != null) {
            try {
                LocalTime time = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("h:mm a"));
                baseDate = baseDate.withHour(time.getHour()).withMinute(time.getMinute());
            } catch (Exception e) {
                log.warn("Failed to parse time: {}", timeStr);
            }
        }

        // Default duration: 1 hour for start, or add 1 hour for end
        if ("end".equals(prefix)) {
            baseDate = baseDate.plusHours(1);
        }

        return baseDate;
    }

    private java.util.List<String> extractAttendees(Map<String, String> entities) {
        String emailAttendees = entities.get("attendees_email");
        String nameAttendees = entities.get("attendees_name");

        java.util.List<String> attendees = new java.util.ArrayList<>();

        if (emailAttendees != null) {
            attendees.addAll(Arrays.asList(emailAttendees.split(",")));
        }
        if (nameAttendees != null) {
            attendees.addAll(Arrays.asList(nameAttendees.split(",")));
        }

        return attendees;
    }
}