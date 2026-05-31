package com.voicecal.core.service;

import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.EventStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Core interface for calendar operations.
 */
public interface CalendarService {

    CalendarEvent createEvent(CalendarEvent event);

    CalendarEvent getEvent(UUID eventId);

    List<CalendarEvent> getEvents(LocalDateTime start, LocalDateTime end);

    CalendarEvent updateEvent(UUID eventId, CalendarEvent event);

    void deleteEvent(UUID eventId);

    List<CalendarEvent> searchEvents(String query);

    boolean isAvailable(LocalDateTime start, LocalDateTime end);

    // ======================== New APIs ========================

    /**
     * Update event status only.
     */
    CalendarEvent updateEventStatus(UUID eventId, EventStatus status);

    /**
     * Batch delete events by IDs.
     */
    void batchDeleteEvents(List<UUID> eventIds);

    /**
     * Get all events (no date range limit).
     */
    List<CalendarEvent> getAllEvents();

    /**
     * Get event count per day in a date range.
     */
    Map<LocalDate, Long> getEventCountByDate(LocalDate start, LocalDate end);

    /**
     * Get events grouped by week.
     */
    Map<LocalDate, List<CalendarEvent>> getEventsByWeek(LocalDate weekStart);

    /**
     * Update event sort order.
     */
    void reorderEvents(Map<UUID, Integer> eventOrders);

    /**
     * Get all unique categories/locations.
     */
    List<String> getCategories();

    /**
     * Filter events by criteria.
     */
    List<CalendarEvent> filterEvents(String category, EventStatus status, String location,
                                      LocalDateTime start, LocalDateTime end);
}