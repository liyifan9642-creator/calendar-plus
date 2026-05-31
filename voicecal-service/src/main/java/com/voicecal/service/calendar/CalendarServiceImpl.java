package com.voicecal.service.calendar;

import com.voicecal.core.exception.EventNotFoundException;
import com.voicecal.core.exception.VoiceCalException;
import com.voicecal.core.model.*;
import com.voicecal.core.service.CalendarService;
import com.voicecal.service.notification.NotificationService;
import com.voicecal.service.repository.CalendarEventRepository;
import com.voicecal.service.repository.ReminderRepository;
import com.voicecal.service.repository.RepeatRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementation of CalendarService using Spring Data JPA with H2 database.
 * <p>
 * Features:
 * <ul>
 *   <li>Full CRUD operations via JPA repositories</li>
 *   <li>Conflict detection for overlapping events</li>
 *   <li>Reminder scheduling with @Scheduled polling</li>
 *   <li>Recurring event generation based on RepeatRule</li>
 *   <li>Declarative transaction management</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CalendarServiceImpl implements CalendarService {

    private final CalendarEventRepository eventRepository;
    private final ReminderRepository reminderRepository;
    private final RepeatRuleRepository repeatRuleRepository;
    private final NotificationService notificationService;

    // Maximum number of recurring event instances to generate in advance
    private static final int MAX_RECURRING_INSTANCES = 365;

    // ======================== CRUD Operations ========================

    @Override
    @Transactional
    public CalendarEvent createEvent(CalendarEvent event) {
        log.info("Creating event: {}", event.getTitle());

        // Validate time range
        validateTimeRange(event.getStartTime(), event.getEndTime());

        // Conflict detection
        checkForConflicts(event.getStartTime(), event.getEndTime(), null);

        // Save repeat rule if present
        if (event.getRepeatRuleId() != null) {
            RepeatRule rule = repeatRuleRepository.findById(event.getRepeatRuleId())
                    .orElseThrow(() -> new VoiceCalException(
                            "Repeat rule not found with id: " + event.getRepeatRuleId(),
                            "REPEAT_RULE_NOT_FOUND"));
            validateRepeatRule(rule);
        }

        // Persist event
        CalendarEvent savedEvent = eventRepository.save(event);
        log.info("Event created with id: {}", savedEvent.getId());

        // Generate recurring instances if repeat rule is linked
        if (savedEvent.getRepeatRuleId() != null) {
            generateRecurringInstances(savedEvent);
        }

        return savedEvent;
    }

    @Override
    @Transactional(readOnly = true)
    public CalendarEvent getEvent(UUID eventId) {
        log.debug("Getting event: {}", eventId);
        return findEventOrThrow(eventId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CalendarEvent> getEvents(LocalDateTime start, LocalDateTime end) {
        log.debug("Getting events from {} to {}", start, end);
        validateTimeRange(start, end);
        return eventRepository.findEventsInRange(start, end);
    }

    @Override
    @Transactional
    public CalendarEvent updateEvent(UUID eventId, CalendarEvent event) {
        log.info("Updating event: {}", eventId);

        CalendarEvent existing = findEventOrThrow(eventId);

        // Validate time range if times are being changed
        LocalDateTime newStart = event.getStartTime() != null ? event.getStartTime() : existing.getStartTime();
        LocalDateTime newEnd = event.getEndTime() != null ? event.getEndTime() : existing.getEndTime();
        validateTimeRange(newStart, newEnd);

        // Conflict detection (excluding the event being updated)
        checkForConflicts(newStart, newEnd, eventId);

        // Update fields
        if (StringUtils.hasText(event.getTitle())) {
            existing.setTitle(event.getTitle());
        }
        if (event.getDescription() != null) {
            existing.setDescription(event.getDescription());
        }
        if (event.getStartTime() != null) {
            existing.setStartTime(event.getStartTime());
        }
        if (event.getEndTime() != null) {
            existing.setEndTime(event.getEndTime());
        }
        if (event.getLocation() != null) {
            existing.setLocation(event.getLocation());
        }
        if (event.getStatus() != null) {
            existing.setStatus(event.getStatus());
        }

        // Handle repeat rule changes
        if (event.getRepeatRuleId() != null) {
            if (!event.getRepeatRuleId().equals(existing.getRepeatRuleId())) {
                existing.setRepeatRuleId(event.getRepeatRuleId());
                // Cancel old reminders for recurring events and regenerate
                if (existing.getRepeatRuleId() != null) {
                    reminderRepository.cancelPendingRemindersByEventId(eventId);
                }
            }
        }

        CalendarEvent updated = eventRepository.save(existing);
        log.info("Event updated: {}", eventId);

        // Send update notification
        try {
            notificationService.sendEventUpdatedNotification(updated);
        } catch (Exception e) {
            log.warn("Failed to send update notification for event {}: {}", eventId, e.getMessage());
        }

        return updated;
    }

    @Override
    @Transactional
    public void deleteEvent(UUID eventId) {
        log.info("Deleting event: {}", eventId);

        CalendarEvent event = findEventOrThrow(eventId);

        // Cancel all pending reminders for this event
        reminderRepository.cancelPendingRemindersByEventId(eventId);

        // If this is a recurring event parent, also remove generated child events
        if (event.getRepeatRuleId() != null) {
            List<CalendarEvent> childEvents = eventRepository.findByRepeatRuleId(event.getRepeatRuleId());
            for (CalendarEvent child : childEvents) {
                if (!child.getId().equals(eventId)) {
                    reminderRepository.cancelPendingRemindersByEventId(child.getId());
                    eventRepository.delete(child);
                }
            }
            // Delete the repeat rule itself
            repeatRuleRepository.deleteById(event.getRepeatRuleId());
        }

        eventRepository.delete(event);
        log.info("Event deleted: {}", eventId);

        // Send cancellation notification
        try {
            notificationService.sendEventCancellationNotification(event);
        } catch (Exception e) {
            log.warn("Failed to send cancellation notification for event {}: {}", eventId, e.getMessage());
        }
    }

    // ======================== Search & Availability ========================

    @Override
    @Transactional(readOnly = true)
    public List<CalendarEvent> searchEvents(String query) {
        log.debug("Searching events with query: {}", query);

        if (!StringUtils.hasText(query)) {
            return eventRepository.findByStatusNot(EventStatus.CANCELLED);
        }
        return eventRepository.searchEvents(query.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAvailable(LocalDateTime start, LocalDateTime end) {
        log.debug("Checking availability from {} to {}", start, end);
        validateTimeRange(start, end);

        List<CalendarEvent> conflicts = eventRepository.findEventsInRange(start, end);
        return conflicts.isEmpty();
    }

    // ======================== Conflict Detection ========================

    /**
     * Check for scheduling conflicts in the given time range.
     *
     * @param start         start of the proposed time slot
     * @param end           end of the proposed time slot
     * @param excludeEventId event ID to exclude (for updates), or null for creates
     * @throws VoiceCalException if a conflict is detected
     */
    private void checkForConflicts(LocalDateTime start, LocalDateTime end, UUID excludeEventId) {
        List<CalendarEvent> conflicts;
        if (excludeEventId != null) {
            conflicts = eventRepository.findEventsInRangeExcluding(start, end, excludeEventId);
        } else {
            conflicts = eventRepository.findEventsInRange(start, end);
        }

        if (!conflicts.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("Time conflict detected with ");
            sb.append(conflicts.size());
            sb.append(" existing event(s): ");
            for (int i = 0; i < Math.min(conflicts.size(), 3); i++) {
                CalendarEvent c = conflicts.get(i);
                if (i > 0) sb.append(", ");
                sb.append("'").append(c.getTitle()).append("'")
                  .append(" (").append(c.getStartTime()).append(" - ").append(c.getEndTime()).append(")");
            }
            if (conflicts.size() > 3) {
                sb.append(" and ").append(conflicts.size() - 3).append(" more");
            }
            throw new VoiceCalException(sb.toString(), "EVENT_CONFLICT");
        }
    }

    /**
     * Find conflicting events for external use (e.g., UI display).
     */
    @Transactional(readOnly = true)
    public List<CalendarEvent> findConflicts(LocalDateTime start, LocalDateTime end) {
        return eventRepository.findEventsInRange(start, end);
    }

    // ======================== Reminder Scheduling ========================

    /**
     * Scheduled task that polls for due reminders every 60 seconds.
     * Finds all pending reminders whose remindAt time has passed,
     * sends notifications, and marks them as SENT.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void processPendingReminders() {
        LocalDateTime now = LocalDateTime.now();
        log.debug("Processing pending reminders at {}", now);

        List<Reminder> dueReminders = reminderRepository.findDueReminders(now);

        if (dueReminders.isEmpty()) {
            return;
        }

        log.info("Found {} due reminder(s) to process", dueReminders.size());

        for (Reminder reminder : dueReminders) {
            try {
                CalendarEvent event = eventRepository.findById(reminder.getEventId()).orElse(null);
                if (event == null) {
                    log.warn("Event {} not found for reminder {}, cancelling reminder",
                            reminder.getEventId(), reminder.getId());
                    reminder.setStatus(ReminderStatus.CANCELLED);
                    reminderRepository.save(reminder);
                    continue;
                }

                if (event.getStatus() == EventStatus.CANCELLED) {
                    log.info("Event {} is cancelled, cancelling reminder {}",
                            event.getId(), reminder.getId());
                    reminder.setStatus(ReminderStatus.CANCELLED);
                    reminderRepository.save(reminder);
                    continue;
                }

                // Calculate minutes before event for notification
                long minutesBefore = java.time.Duration.between(now, event.getStartTime()).toMinutes();
                int minutesBeforeInt = (int) Math.max(0, minutesBefore);

                notificationService.sendReminder(event, minutesBeforeInt);

                reminder.setStatus(ReminderStatus.SENT);
                reminderRepository.save(reminder);
                log.info("Reminder {} sent for event '{}'", reminder.getId(), event.getTitle());

            } catch (Exception e) {
                log.error("Failed to process reminder {}: {}", reminder.getId(), e.getMessage(), e);
                // Leave as PENDING so it will be retried on the next poll
            }
        }
    }

    /**
     * Create a reminder for an event.
     *
     * @param eventId  the event ID
     * @param remindAt the time to send the reminder
     * @return the created Reminder
     */
    @Transactional
    public Reminder createReminder(UUID eventId, LocalDateTime remindAt) {
        log.info("Creating reminder for event {} at {}", eventId, remindAt);

        CalendarEvent event = findEventOrThrow(eventId);

        if (remindAt.isAfter(event.getStartTime())) {
            throw new VoiceCalException(
                    "Reminder time must be before the event start time",
                    "INVALID_REMINDER_TIME");
        }

        Reminder reminder = Reminder.builder()
                .eventId(eventId)
                .remindAt(remindAt)
                .status(ReminderStatus.PENDING)
                .build();

        Reminder saved = reminderRepository.save(reminder);
        log.info("Reminder created with id: {} for event: {}", saved.getId(), eventId);
        return saved;
    }

    /**
     * Create a reminder N minutes before the event starts.
     */
    @Transactional
    public Reminder createReminderBeforeEvent(UUID eventId, int minutesBefore) {
        CalendarEvent event = findEventOrThrow(eventId);
        LocalDateTime remindAt = event.getStartTime().minusMinutes(minutesBefore);
        return createReminder(eventId, remindAt);
    }

    /**
     * Cancel all pending reminders for an event.
     */
    @Transactional
    public void cancelReminders(UUID eventId) {
        log.info("Cancelling reminders for event: {}", eventId);
        reminderRepository.cancelPendingRemindersByEventId(eventId);
    }

    /**
     * Get all reminders for an event.
     */
    @Transactional(readOnly = true)
    public List<Reminder> getReminders(UUID eventId) {
        return reminderRepository.findByEventId(eventId);
    }

    // ======================== Recurring Event Generation ========================

    /**
     * Generate recurring event instances based on the repeat rule linked to the parent event.
     * Instances are generated up to MAX_RECURRING_INSTANCES or until the rule's end condition.
     *
     * @param parentEvent the original event with a linked repeat rule
     */
    @Transactional
    public void generateRecurringInstances(CalendarEvent parentEvent) {
        UUID repeatRuleId = parentEvent.getRepeatRuleId();
        if (repeatRuleId == null) {
            return;
        }

        RepeatRule rule = repeatRuleRepository.findById(repeatRuleId).orElse(null);
        if (rule == null) {
            log.warn("Repeat rule {} not found for event {}", repeatRuleId, parentEvent.getId());
            return;
        }

        log.info("Generating recurring instances for event '{}' with rule: {}",
                parentEvent.getTitle(), rule.getFrequency());

        long duration = java.time.Duration.between(parentEvent.getStartTime(), parentEvent.getEndTime()).toMillis();
        LocalDateTime currentStart = parentEvent.getStartTime();
        int interval = rule.getInterval() != null ? rule.getInterval() : 1;
        int maxOccurrences = rule.getMaxOccurrences() != null ? rule.getMaxOccurrences() : MAX_RECURRING_INSTANCES;
        LocalDate endDate = rule.getEndDate();

        List<CalendarEvent> generatedEvents = new ArrayList<>();

        for (int i = 1; i < maxOccurrences; i++) {
            // Calculate next occurrence
            LocalDateTime nextStart = calculateNextOccurrence(currentStart, rule.getFrequency(), interval, i);

            // Check end date boundary
            if (endDate != null && nextStart.toLocalDate().isAfter(endDate)) {
                log.debug("Reached end date boundary at occurrence {}", i);
                break;
            }

            // Check weekly days-of-week constraint
            if (rule.getFrequency() == RepeatFrequency.WEEKLY
                    && rule.getDaysOfWeek() != null
                    && !rule.getDaysOfWeek().isEmpty()) {
                if (!rule.getDaysOfWeek().contains(nextStart.getDayOfWeek())) {
                    // Skip this occurrence; the loop counter still advances
                    continue;
                }
            }

            LocalDateTime nextEnd = nextStart.plusNanos(duration * 1_000_000);

            // Build child event
            CalendarEvent childEvent = CalendarEvent.builder()
                    .title(parentEvent.getTitle())
                    .description(parentEvent.getDescription())
                    .startTime(nextStart)
                    .endTime(nextEnd)
                    .location(parentEvent.getLocation())
                    .status(EventStatus.ACTIVE)
                    .repeatRuleId(repeatRuleId)
                    .build();

            generatedEvents.add(childEvent);
        }

        if (!generatedEvents.isEmpty()) {
            eventRepository.saveAll(generatedEvents);
            log.info("Generated {} recurring instance(s) for event '{}'",
                    generatedEvents.size(), parentEvent.getTitle());
        }
    }

    /**
     * Calculate the next occurrence date/time based on frequency and interval.
     */
    private LocalDateTime calculateNextOccurrence(LocalDateTime base, RepeatFrequency frequency,
                                                   int interval, int occurrenceIndex) {
        return switch (frequency) {
            case DAILY -> base.plusDays((long) interval * occurrenceIndex);
            case WEEKLY -> base.plusWeeks((long) interval * occurrenceIndex);
            case MONTHLY -> base.plusMonths((long) interval * occurrenceIndex);
            case YEARLY -> base.plusYears((long) interval * occurrenceIndex);
        };
    }

    // ======================== New API Implementations ========================

    @Override
    @Transactional
    public CalendarEvent updateEventStatus(UUID eventId, EventStatus status) {
        log.info("Updating event {} status to {}", eventId, status);
        CalendarEvent event = findEventOrThrow(eventId);
        event.setStatus(status);
        return eventRepository.save(event);
    }

    @Override
    @Transactional
    public void batchDeleteEvents(List<UUID> eventIds) {
        log.info("Batch deleting {} events", eventIds.size());
        for (UUID eventId : eventIds) {
            try {
                deleteEvent(eventId);
            } catch (Exception e) {
                log.warn("Failed to delete event {}: {}", eventId, e.getMessage());
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<CalendarEvent> getAllEvents() {
        log.debug("Getting all events");
        return eventRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<LocalDate, Long> getEventCountByDate(LocalDate start, LocalDate end) {
        log.debug("Getting event count from {} to {}", start, end);
        List<CalendarEvent> events = eventRepository.findEventsInRange(
                start.atStartOfDay(), end.atTime(23, 59, 59));

        return events.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        e -> e.getStartTime().toLocalDate(),
                        java.util.stream.Collectors.counting()
                ));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<LocalDate, List<CalendarEvent>> getEventsByWeek(LocalDate weekStart) {
        log.debug("Getting events for week starting {}", weekStart);
        LocalDate weekEnd = weekStart.plusDays(6);
        List<CalendarEvent> events = eventRepository.findEventsInRange(
                weekStart.atStartOfDay(), weekEnd.atTime(23, 59, 59));

        Map<LocalDate, List<CalendarEvent>> result = new java.util.LinkedHashMap<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStart.plusDays(i);
            List<CalendarEvent> dayEvents = events.stream()
                    .filter(e -> e.getStartTime().toLocalDate().equals(date))
                    .collect(java.util.stream.Collectors.toList());
            result.put(date, dayEvents);
        }
        return result;
    }

    @Override
    @Transactional
    public void reorderEvents(Map<UUID, Integer> eventOrders) {
        log.info("Reordering {} events", eventOrders.size());
        for (Map.Entry<UUID, Integer> entry : eventOrders.entrySet()) {
            CalendarEvent event = eventRepository.findById(entry.getKey()).orElse(null);
            if (event != null) {
                // Note: This requires adding a sortOrder field to CalendarEvent
                // For now, we just log the operation
                log.debug("Event {} set to order {}", entry.getKey(), entry.getValue());
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getCategories() {
        log.debug("Getting event categories");
        // Return unique locations as categories
        return eventRepository.findAll().stream()
                .map(CalendarEvent::getLocation)
                .filter(loc -> loc != null && !loc.isBlank())
                .distinct()
                .sorted()
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CalendarEvent> filterEvents(String category, EventStatus status, String location,
                                             LocalDateTime start, LocalDateTime end) {
        log.debug("Filtering events: category={}, status={}, location={}", category, status, location);

        List<CalendarEvent> events;

        // Get base events based on date range
        if (start != null && end != null) {
            events = eventRepository.findEventsInRange(start, end);
        } else {
            events = eventRepository.findAll();
        }

        // Apply filters
        return events.stream()
                .filter(e -> status == null || e.getStatus() == status)
                .filter(e -> location == null || location.isBlank() ||
                        (e.getLocation() != null && e.getLocation().contains(location)))
                .filter(e -> category == null || category.isBlank() ||
                        (e.getLocation() != null && e.getLocation().contains(category)))
                .collect(java.util.stream.Collectors.toList());
    }

    // ======================== Helper Methods ========================

    private CalendarEvent findEventOrThrow(UUID eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotFoundException(eventId));
    }

    private void validateTimeRange(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new VoiceCalException("Start time and end time are required",
                    "INVALID_TIME_RANGE");
        }
        if (!end.isAfter(start)) {
            throw new VoiceCalException(
                    "End time (" + end + ") must be after start time (" + start + ")",
                    "INVALID_TIME_RANGE");
        }
    }

    private void validateRepeatRule(RepeatRule rule) {
        if (rule.getFrequency() == null) {
            throw new VoiceCalException("Repeat rule frequency is required",
                    "INVALID_REPEAT_RULE");
        }
        if (rule.getInterval() != null && rule.getInterval() < 1) {
            throw new VoiceCalException("Repeat rule interval must be at least 1",
                    "INVALID_REPEAT_RULE");
        }
    }
}
