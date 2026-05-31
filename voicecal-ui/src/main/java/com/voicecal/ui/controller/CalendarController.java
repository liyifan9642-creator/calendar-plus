package com.voicecal.ui.controller;

import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.EventStatus;
import com.voicecal.core.service.CalendarService;
import com.voicecal.ui.dto.CalendarEventDto;
import com.voicecal.ui.dto.CreateEventRequest;
import com.voicecal.ui.mapper.CalendarEventMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for calendar operations.
 */
@Tag(name = "Calendar", description = "Calendar event management APIs")
@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;
    private final CalendarEventMapper eventMapper;

    @Operation(summary = "Create a new event")
    @PostMapping("/events")
    public ResponseEntity<CalendarEventDto> createEvent(@Valid @RequestBody CreateEventRequest request) {
        CalendarEvent event = eventMapper.toEntity(request);
        CalendarEvent created = calendarService.createEvent(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(eventMapper.toDto(created));
    }

    @Operation(summary = "Get event by ID")
    @GetMapping("/events/{eventId}")
    public ResponseEntity<CalendarEventDto> getEvent(@PathVariable UUID eventId) {
        CalendarEvent event = calendarService.getEvent(eventId);
        return ResponseEntity.ok(eventMapper.toDto(event));
    }

    @Operation(summary = "Get events in date range")
    @GetMapping("/events")
    public ResponseEntity<List<CalendarEventDto>> getEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<CalendarEvent> events = calendarService.getEvents(start, end);
        return ResponseEntity.ok(eventMapper.toDtoList(events));
    }

    @Operation(summary = "Update an existing event")
    @PutMapping("/events/{eventId}")
    public ResponseEntity<CalendarEventDto> updateEvent(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateEventRequest request) {
        CalendarEvent event = eventMapper.toEntity(request);
        CalendarEvent updated = calendarService.updateEvent(eventId, event);
        return ResponseEntity.ok(eventMapper.toDto(updated));
    }

    @Operation(summary = "Delete an event")
    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID eventId) {
        calendarService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Search events")
    @GetMapping("/events/search")
    public ResponseEntity<List<CalendarEventDto>> searchEvents(@RequestParam String query) {
        List<CalendarEvent> events = calendarService.searchEvents(query);
        return ResponseEntity.ok(eventMapper.toDtoList(events));
    }

    @Operation(summary = "Check availability")
    @GetMapping("/availability")
    public ResponseEntity<Boolean> checkAvailability(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(calendarService.isAvailable(start, end));
    }

    // ======================== New API Endpoints ========================

    @Operation(summary = "Update event status")
    @PatchMapping("/events/{eventId}/status")
    public ResponseEntity<CalendarEventDto> updateEventStatus(
            @PathVariable UUID eventId,
            @RequestBody Map<String, String> request) {
        EventStatus status = EventStatus.valueOf(request.get("status"));
        CalendarEvent updated = calendarService.updateEventStatus(eventId, status);
        return ResponseEntity.ok(eventMapper.toDto(updated));
    }

    @Operation(summary = "Batch delete events")
    @PostMapping("/events/batch-delete")
    public ResponseEntity<Void> batchDeleteEvents(@RequestBody Map<String, List<UUID>> request) {
        List<UUID> ids = request.get("ids");
        calendarService.batchDeleteEvents(ids);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get all events")
    @GetMapping("/events/all")
    public ResponseEntity<List<CalendarEventDto>> getAllEvents() {
        List<CalendarEvent> events = calendarService.getAllEvents();
        return ResponseEntity.ok(eventMapper.toDtoList(events));
    }

    @Operation(summary = "Get event count by date")
    @GetMapping("/events/count")
    public ResponseEntity<Map<LocalDate, Long>> getEventCount(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(calendarService.getEventCountByDate(start, end));
    }

    @Operation(summary = "Get events by week")
    @GetMapping("/events/week")
    public ResponseEntity<Map<LocalDate, List<CalendarEventDto>>> getEventsByWeek(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        Map<LocalDate, List<CalendarEvent>> eventsByWeek = calendarService.getEventsByWeek(weekStart);
        Map<LocalDate, List<CalendarEventDto>> result = new java.util.LinkedHashMap<>();
        eventsByWeek.forEach((date, events) -> result.put(date, eventMapper.toDtoList(events)));
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Reorder events")
    @PutMapping("/events/reorder")
    public ResponseEntity<Void> reorderEvents(@RequestBody Map<UUID, Integer> eventOrders) {
        calendarService.reorderEvents(eventOrders);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Get event categories")
    @GetMapping("/events/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(calendarService.getCategories());
    }

    @Operation(summary = "Filter events")
    @GetMapping("/events/filter")
    public ResponseEntity<List<CalendarEventDto>> filterEvents(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<CalendarEvent> events = calendarService.filterEvents(category, status, location, start, end);
        return ResponseEntity.ok(eventMapper.toDtoList(events));
    }
}