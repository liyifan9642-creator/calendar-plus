package com.voicecal.service.calendar;

import com.voicecal.core.exception.EventNotFoundException;
import com.voicecal.core.exception.VoiceCalException;
import com.voicecal.core.model.*;
import com.voicecal.service.notification.NotificationService;
import com.voicecal.service.repository.CalendarEventRepository;
import com.voicecal.service.repository.ReminderRepository;
import com.voicecal.service.repository.RepeatRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

/**
 * Integration tests for CalendarServiceImpl.
 * Uses H2 in-memory database and mocks the NotificationService.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CalendarServiceImplTest {

    @Autowired
    private CalendarServiceImpl calendarService;

    @Autowired
    private CalendarEventRepository eventRepository;

    @Autowired
    private ReminderRepository reminderRepository;

    @Autowired
    private RepeatRuleRepository repeatRuleRepository;

    @MockBean
    private NotificationService notificationService;

    private LocalDateTime now;
    private LocalDateTime oneHourLater;
    private LocalDateTime twoHoursLater;
    private LocalDateTime threeHoursLater;

    @BeforeEach
    void setUp() {
        now = LocalDateTime.now().withSecond(0).withNano(0);
        oneHourLater = now.plusHours(1);
        twoHoursLater = now.plusHours(2);
        threeHoursLater = now.plusHours(3);

        reset(notificationService);
    }

    private CalendarEvent buildEvent(String title, LocalDateTime start, LocalDateTime end) {
        return CalendarEvent.builder()
                .title(title)
                .description("Test description for " + title)
                .startTime(start)
                .endTime(end)
                .location("Test Location")
                .status(EventStatus.ACTIVE)
                .build();
    }

    // ======================== CRUD Tests ========================

    @Nested
    @DisplayName("createEvent")
    class CreateEventTests {

        @Test
        @DisplayName("should create a valid event and persist it")
        void createEvent_validEvent_persistsAndReturns() {
            CalendarEvent event = buildEvent("Team Meeting", now, oneHourLater);

            CalendarEvent created = calendarService.createEvent(event);

            assertThat(created).isNotNull();
            assertThat(created.getId()).isNotNull();
            assertThat(created.getTitle()).isEqualTo("Team Meeting");
            assertThat(created.getStartTime()).isEqualTo(now);
            assertThat(created.getEndTime()).isEqualTo(oneHourLater);
            assertThat(created.getStatus()).isEqualTo(EventStatus.ACTIVE);
            assertThat(created.getCreatedAt()).isNotNull();
            assertThat(created.getUpdatedAt()).isNotNull();

            // Verify persistence
            assertThat(eventRepository.findById(created.getId())).isPresent();
        }

        @Test
        @DisplayName("should reject event with null start time")
        void createEvent_nullStartTime_throwsException() {
            CalendarEvent event = buildEvent("Bad Event", null, oneHourLater);

            assertThatThrownBy(() -> calendarService.createEvent(event))
                    .isInstanceOf(VoiceCalException.class)
                    .hasMessageContaining("Start time and end time are required");
        }

        @Test
        @DisplayName("should reject event with end time before start time")
        void createEvent_endBeforeStart_throwsException() {
            CalendarEvent event = buildEvent("Bad Event", oneHourLater, now);

            assertThatThrownBy(() -> calendarService.createEvent(event))
                    .isInstanceOf(VoiceCalException.class)
                    .hasMessageContaining("End time")
                    .hasMessageContaining("must be after start time");
        }

        @Test
        @DisplayName("should reject event that conflicts with an existing event")
        void createEvent_conflictingTime_throwsConflictException() {
            calendarService.createEvent(buildEvent("Existing Meeting", now, twoHoursLater));

            CalendarEvent conflict = buildEvent("New Meeting", oneHourLater, threeHoursLater);

            assertThatThrownBy(() -> calendarService.createEvent(conflict))
                    .isInstanceOf(VoiceCalException.class)
                    .hasMessageContaining("Time conflict detected");
        }

        @Test
        @DisplayName("should allow back-to-back events with no overlap")
        void createEvent_backToBack_noConflict() {
            calendarService.createEvent(buildEvent("Meeting A", now, oneHourLater));

            CalendarEvent next = buildEvent("Meeting B", oneHourLater, twoHoursLater);
            CalendarEvent created = calendarService.createEvent(next);

            assertThat(created).isNotNull();
            assertThat(created.getTitle()).isEqualTo("Meeting B");
        }
    }

    @Nested
    @DisplayName("getEvent")
    class GetEventTests {

        @Test
        @DisplayName("should return existing event by ID")
        void getEvent_existingId_returnsEvent() {
            CalendarEvent created = calendarService.createEvent(
                    buildEvent("Lookup Test", now, oneHourLater));

            CalendarEvent found = calendarService.getEvent(created.getId());

            assertThat(found).isNotNull();
            assertThat(found.getId()).isEqualTo(created.getId());
            assertThat(found.getTitle()).isEqualTo("Lookup Test");
        }

        @Test
        @DisplayName("should throw EventNotFoundException for non-existent ID")
        void getEvent_nonExistentId_throwsException() {
            UUID fakeId = UUID.randomUUID();

            assertThatThrownBy(() -> calendarService.getEvent(fakeId))
                    .isInstanceOf(EventNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getEvents (range query)")
    class GetEventsRangeTests {

        @Test
        @DisplayName("should return events overlapping the given range")
        void getEvents_overlappingRange_returnsEvents() {
            calendarService.createEvent(buildEvent("Morning", now, oneHourLater));
            calendarService.createEvent(buildEvent("Afternoon", twoHoursLater, threeHoursLater));

            List<CalendarEvent> results = calendarService.getEvents(now.minusMinutes(30), twoHoursLater.plusMinutes(30));

            assertThat(results).hasSize(2);
        }

        @Test
        @DisplayName("should return empty list when no events match range")
        void getEvents_noMatch_returnsEmpty() {
            calendarService.createEvent(buildEvent("Far Future", now.plusYears(1), now.plusYears(1).plusHours(1)));

            List<CalendarEvent> results = calendarService.getEvents(now, oneHourLater);

            assertThat(results).isEmpty();
        }

        @Test
        @DisplayName("should return events sorted by start time")
        void getEvents_sortedByStartTime() {
            calendarService.createEvent(buildEvent("Later", twoHoursLater, threeHoursLater));
            calendarService.createEvent(buildEvent("Earlier", now, oneHourLater));

            List<CalendarEvent> results = calendarService.getEvents(now.minusMinutes(10), threeHoursLater.plusMinutes(10));

            assertThat(results).hasSize(2);
            assertThat(results.get(0).getTitle()).isEqualTo("Earlier");
            assertThat(results.get(1).getTitle()).isEqualTo("Later");
        }
    }

    @Nested
    @DisplayName("updateEvent")
    class UpdateEventTests {

        @Test
        @DisplayName("should update event fields and persist changes")
        void updateEvent_validUpdate_persistsChanges() {
            CalendarEvent created = calendarService.createEvent(
                    buildEvent("Original", now, oneHourLater));

            CalendarEvent updates = CalendarEvent.builder()
                    .title("Updated Title")
                    .description("Updated Description")
                    .location("New Location")
                    .build();

            CalendarEvent updated = calendarService.updateEvent(created.getId(), updates);

            assertThat(updated.getTitle()).isEqualTo("Updated Title");
            assertThat(updated.getDescription()).isEqualTo("Updated Description");
            assertThat(updated.getLocation()).isEqualTo("New Location");
            assertThat(updated.getStartTime()).isEqualTo(now); // unchanged
        }

        @Test
        @DisplayName("should throw EventNotFoundException for non-existent event")
        void updateEvent_nonExistentId_throwsException() {
            UUID fakeId = UUID.randomUUID();
            CalendarEvent updates = buildEvent("Update", now, oneHourLater);

            assertThatThrownBy(() -> calendarService.updateEvent(fakeId, updates))
                    .isInstanceOf(EventNotFoundException.class);
        }

        @Test
        @DisplayName("should detect conflict when updating time to overlap another event")
        void updateEvent_timeConflict_throwsException() {
            calendarService.createEvent(buildEvent("Event A", now, oneHourLater));
            CalendarEvent eventB = calendarService.createEvent(
                    buildEvent("Event B", twoHoursLater, threeHoursLater));

            // Try to move Event B into Event A's time slot
            CalendarEvent updates = CalendarEvent.builder()
                    .startTime(now.plusMinutes(30))
                    .endTime(oneHourLater.plusMinutes(30))
                    .build();

            assertThatThrownBy(() -> calendarService.updateEvent(eventB.getId(), updates))
                    .isInstanceOf(VoiceCalException.class)
                    .hasMessageContaining("Time conflict detected");
        }

        @Test
        @DisplayName("should send update notification after successful update")
        void updateEvent_success_sendsNotification() {
            CalendarEvent created = calendarService.createEvent(
                    buildEvent("Notify Test", now, oneHourLater));

            CalendarEvent updates = CalendarEvent.builder().title("Updated").build();
            calendarService.updateEvent(created.getId(), updates);

            verify(notificationService, times(1)).sendEventUpdatedNotification(any(CalendarEvent.class));
        }
    }

    @Nested
    @DisplayName("deleteEvent")
    class DeleteEventTests {

        @Test
        @DisplayName("should delete event and cancel its reminders")
        void deleteEvent_existingEvent_removesAndCancelsReminders() {
            CalendarEvent created = calendarService.createEvent(
                    buildEvent("To Delete", now, oneHourLater));
            UUID eventId = created.getId();

            calendarService.createReminderBeforeEvent(eventId, 15);

            calendarService.deleteEvent(eventId);

            assertThat(eventRepository.findById(eventId)).isEmpty();
            // Reminders should be cancelled (or deleted)
            List<Reminder> reminders = reminderRepository.findByEventId(eventId);
            assertThat(reminders).allMatch(r -> r.getStatus() == ReminderStatus.CANCELLED);
        }

        @Test
        @DisplayName("should throw EventNotFoundException for non-existent event")
        void deleteEvent_nonExistentId_throwsException() {
            UUID fakeId = UUID.randomUUID();

            assertThatThrownBy(() -> calendarService.deleteEvent(fakeId))
                    .isInstanceOf(EventNotFoundException.class);
        }

        @Test
        @DisplayName("should send cancellation notification after deletion")
        void deleteEvent_success_sendsNotification() {
            CalendarEvent created = calendarService.createEvent(
                    buildEvent("Cancel Notify", now, oneHourLater));

            calendarService.deleteEvent(created.getId());

            verify(notificationService, times(1)).sendEventCancellationNotification(any(CalendarEvent.class));
        }
    }

    // ======================== Search Tests ========================

    @Nested
    @DisplayName("searchEvents")
    class SearchEventsTests {

        @Test
        @DisplayName("should find events matching title query")
        void searchEvents_titleMatch_returnsResults() {
            calendarService.createEvent(buildEvent("Sprint Planning", now, oneHourLater));
            calendarService.createEvent(buildEvent("Team Retro", twoHoursLater, threeHoursLater));

            List<CalendarEvent> results = calendarService.searchEvents("sprint");

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getTitle()).isEqualTo("Sprint Planning");
        }

        @Test
        @DisplayName("should find events matching location query")
        void searchEvents_locationMatch_returnsResults() {
            CalendarEvent event = buildEvent("Meeting", now, oneHourLater);
            event.setLocation("Conference Room A");
            calendarService.createEvent(event);

            List<CalendarEvent> results = calendarService.searchEvents("conference");

            assertThat(results).hasSize(1);
        }

        @Test
        @DisplayName("should return all active events for empty query")
        void searchEvents_emptyQuery_returnsAll() {
            calendarService.createEvent(buildEvent("Event 1", now, oneHourLater));
            calendarService.createEvent(buildEvent("Event 2", twoHoursLater, threeHoursLater));

            List<CalendarEvent> results = calendarService.searchEvents("");

            assertThat(results).hasSize(2);
        }

        @Test
        @DisplayName("should return empty list when no events match")
        void searchEvents_noMatch_returnsEmpty() {
            calendarService.createEvent(buildEvent("Meeting", now, oneHourLater));

            List<CalendarEvent> results = calendarService.searchEvents("nonexistent");

            assertThat(results).isEmpty();
        }
    }

    // ======================== Availability Tests ========================

    @Nested
    @DisplayName("isAvailable")
    class IsAvailableTests {

        @Test
        @DisplayName("should return true when no events conflict")
        void isAvailable_noConflict_returnsTrue() {
            calendarService.createEvent(buildEvent("Busy", now, oneHourLater));

            boolean available = calendarService.isAvailable(twoHoursLater, threeHoursLater);

            assertThat(available).isTrue();
        }

        @Test
        @DisplayName("should return false when events overlap")
        void isAvailable_hasConflict_returnsFalse() {
            calendarService.createEvent(buildEvent("Busy", now, twoHoursLater));

            boolean available = calendarService.isAvailable(oneHourLater, threeHoursLater);

            assertThat(available).isFalse();
        }

        @Test
        @DisplayName("should return true for adjacent non-overlapping slot")
        void isAvailable_adjacentSlot_returnsTrue() {
            calendarService.createEvent(buildEvent("Busy", now, oneHourLater));

            boolean available = calendarService.isAvailable(oneHourLater, twoHoursLater);

            assertThat(available).isTrue();
        }
    }

    // ======================== Conflict Detection Tests ========================

    @Nested
    @DisplayName("Conflict Detection")
    class ConflictDetectionTests {

        @Test
        @DisplayName("should detect full overlap")
        void conflict_fullOverlap_detected() {
            calendarService.createEvent(buildEvent("Event A", now, threeHoursLater));

            CalendarEvent overlap = buildEvent("Event B", oneHourLater, twoHoursLater);
            assertThatThrownBy(() -> calendarService.createEvent(overlap))
                    .isInstanceOf(VoiceCalException.class)
                    .hasMessageContaining("Time conflict");
        }

        @Test
        @DisplayName("should detect partial overlap at start")
        void conflict_partialOverlapStart_detected() {
            calendarService.createEvent(buildEvent("Event A", oneHourLater, threeHoursLater));

            CalendarEvent overlap = buildEvent("Event B", now, twoHoursLater);
            assertThatThrownBy(() -> calendarService.createEvent(overlap))
                    .isInstanceOf(VoiceCalException.class)
                    .hasMessageContaining("Time conflict");
        }

        @Test
        @DisplayName("should detect partial overlap at end")
        void conflict_partialOverlapEnd_detected() {
            calendarService.createEvent(buildEvent("Event A", now, twoHoursLater));

            CalendarEvent overlap = buildEvent("Event B", oneHourLater, threeHoursLater);
            assertThatThrownBy(() -> calendarService.createEvent(overlap))
                    .isInstanceOf(VoiceCalException.class)
                    .hasMessageContaining("Time conflict");
        }

        @Test
        @DisplayName("should allow non-overlapping events")
        void conflict_noOverlap_allowed() {
            calendarService.createEvent(buildEvent("Event A", now, oneHourLater));

            CalendarEvent noOverlap = buildEvent("Event B", twoHoursLater, threeHoursLater);
            CalendarEvent created = calendarService.createEvent(noOverlap);

            assertThat(created).isNotNull();
        }

        @Test
        @DisplayName("should ignore cancelled events in conflict check")
        void conflict_cancelledEvent_ignored() {
            CalendarEvent cancelled = calendarService.createEvent(
                    buildEvent("Cancelled", now, twoHoursLater));
            cancelled.setStatus(EventStatus.CANCELLED);
            eventRepository.save(cancelled);

            CalendarEvent newEvent = buildEvent("New", oneHourLater, threeHoursLater);
            CalendarEvent created = calendarService.createEvent(newEvent);

            assertThat(created).isNotNull();
        }
    }

    // ======================== Reminder Scheduling Tests ========================

    @Nested
    @DisplayName("Reminder Scheduling")
    class ReminderSchedulingTests {

        @Test
        @DisplayName("should create a reminder for an event")
        void createReminder_validEvent_createsReminder() {
            CalendarEvent event = calendarService.createEvent(
                    buildEvent("Reminder Test", now.plusHours(2), now.plusHours(3)));

            Reminder reminder = calendarService.createReminderBeforeEvent(event.getId(), 30);

            assertThat(reminder).isNotNull();
            assertThat(reminder.getId()).isNotNull();
            assertThat(reminder.getEventId()).isEqualTo(event.getId());
            assertThat(reminder.getStatus()).isEqualTo(ReminderStatus.PENDING);
            assertThat(reminder.getRemindAt()).isEqualTo(now.plusHours(2).minusMinutes(30));
        }

        @Test
        @DisplayName("should reject reminder after event start time")
        void createReminder_afterStart_throwsException() {
            CalendarEvent event = calendarService.createEvent(
                    buildEvent("Reminder Test", now, oneHourLater));

            assertThatThrownBy(() -> calendarService.createReminder(event.getId(), oneHourLater.plusMinutes(10)))
                    .isInstanceOf(VoiceCalException.class)
                    .hasMessageContaining("Reminder time must be before the event start time");
        }

        @Test
        @DisplayName("should process due reminders and send notifications")
        void processPendingReminders_dueReminder_sendsNotification() {
            // Create an event that starts in 30 minutes
            CalendarEvent event = calendarService.createEvent(
                    buildEvent("Upcoming Event", now.plusMinutes(30), now.plusMinutes(90)));

            // Create a reminder that is already due (remindAt in the past)
            Reminder reminder = Reminder.builder()
                    .eventId(event.getId())
                    .remindAt(now.minusMinutes(5))
                    .status(ReminderStatus.PENDING)
                    .build();
            reminderRepository.save(reminder);

            // Process reminders
            calendarService.processPendingReminders();

            // Verify notification was sent
            verify(notificationService, times(1)).sendReminder(any(CalendarEvent.class), anyInt());

            // Verify reminder status updated
            Reminder updated = reminderRepository.findById(reminder.getId()).orElseThrow();
            assertThat(updated.getStatus()).isEqualTo(ReminderStatus.SENT);
        }

        @Test
        @DisplayName("should cancel reminders when event is deleted")
        void deleteEvent_cancelsReminders() {
            CalendarEvent event = calendarService.createEvent(
                    buildEvent("Delete Test", now.plusHours(1), now.plusHours(2)));
            calendarService.createReminderBeforeEvent(event.getId(), 15);

            calendarService.deleteEvent(event.getId());

            List<Reminder> reminders = reminderRepository.findByEventId(event.getId());
            assertThat(reminders).allMatch(r -> r.getStatus() == ReminderStatus.CANCELLED);
        }

        @Test
        @DisplayName("should skip reminders for cancelled events")
        void processPendingReminders_cancelledEvent_cancelsReminder() {
            CalendarEvent event = calendarService.createEvent(
                    buildEvent("Cancelled Event", now.plusMinutes(30), now.plusMinutes(90)));

            Reminder reminder = Reminder.builder()
                    .eventId(event.getId())
                    .remindAt(now.minusMinutes(5))
                    .status(ReminderStatus.PENDING)
                    .build();
            reminderRepository.save(reminder);

            // Cancel the event
            event.setStatus(EventStatus.CANCELLED);
            eventRepository.save(event);

            calendarService.processPendingReminders();

            Reminder updated = reminderRepository.findById(reminder.getId()).orElseThrow();
            assertThat(updated.getStatus()).isEqualTo(ReminderStatus.CANCELLED);
            verify(notificationService, never()).sendReminder(any(), anyInt());
        }
    }

    // ======================== Recurring Event Tests ========================

    @Nested
    @DisplayName("Recurring Event Generation")
    class RecurringEventTests {

        @Test
        @DisplayName("should generate daily recurring events")
        void createEvent_dailyRepeat_generatesInstances() {
            RepeatRule rule = RepeatRule.builder()
                    .frequency(RepeatFrequency.DAILY)
                    .interval(1)
                    .maxOccurrences(5)
                    .build();
            RepeatRule savedRule = repeatRuleRepository.save(rule);

            CalendarEvent event = buildEvent("Daily Standup", now, now.plusMinutes(30));
            event.setRepeatRuleId(savedRule.getId());

            CalendarEvent created = calendarService.createEvent(event);

            List<CalendarEvent> allEvents = eventRepository.findByRepeatRuleId(savedRule.getId());
            // 1 parent + 4 generated = 5
            assertThat(allEvents).hasSize(5);
        }

        @Test
        @DisplayName("should generate weekly recurring events")
        void createEvent_weeklyRepeat_generatesInstances() {
            RepeatRule rule = RepeatRule.builder()
                    .frequency(RepeatFrequency.WEEKLY)
                    .interval(1)
                    .maxOccurrences(4)
                    .build();
            RepeatRule savedRule = repeatRuleRepository.save(rule);

            CalendarEvent event = buildEvent("Weekly Review", now, now.plusHours(1));
            event.setRepeatRuleId(savedRule.getId());

            calendarService.createEvent(event);

            List<CalendarEvent> allEvents = eventRepository.findByRepeatRuleId(savedRule.getId());
            // 1 parent + 3 generated = 4
            assertThat(allEvents).hasSize(4);

            // Verify weekly intervals
            List<CalendarEvent> sorted = allEvents.stream()
                    .sorted((a, b) -> a.getStartTime().compareTo(b.getStartTime()))
                    .toList();
            for (int i = 1; i < sorted.size(); i++) {
                long daysBetween = java.time.Duration.between(
                        sorted.get(i - 1).getStartTime(), sorted.get(i).getStartTime()).toDays();
                assertThat(daysBetween).isEqualTo(7);
            }
        }

        @Test
        @DisplayName("should generate monthly recurring events")
        void createEvent_monthlyRepeat_generatesInstances() {
            RepeatRule rule = RepeatRule.builder()
                    .frequency(RepeatFrequency.MONTHLY)
                    .interval(1)
                    .maxOccurrences(3)
                    .build();
            RepeatRule savedRule = repeatRuleRepository.save(rule);

            CalendarEvent event = buildEvent("Monthly Report", now, now.plusHours(2));
            event.setRepeatRuleId(savedRule.getId());

            calendarService.createEvent(event);

            List<CalendarEvent> allEvents = eventRepository.findByRepeatRuleId(savedRule.getId());
            assertThat(allEvents).hasSize(3);
        }

        @Test
        @DisplayName("should respect end date boundary for recurring events")
        void createEvent_withEndDate_respectsBoundary() {
            RepeatRule rule = RepeatRule.builder()
                    .frequency(RepeatFrequency.DAILY)
                    .interval(1)
                    .endDate(now.plusDays(3).toLocalDate())
                    .maxOccurrences(100) // high limit, end date should stop generation
                    .build();
            RepeatRule savedRule = repeatRuleRepository.save(rule);

            CalendarEvent event = buildEvent("Until End Date", now, now.plusHours(1));
            event.setRepeatRuleId(savedRule.getId());

            calendarService.createEvent(event);

            List<CalendarEvent> allEvents = eventRepository.findByRepeatRuleId(savedRule.getId());
            // Should stop at or before the end date
            for (CalendarEvent e : allEvents) {
                assertThat(e.getStartTime().toLocalDate())
                        .isBeforeOrEqualTo(now.plusDays(3).toLocalDate());
            }
        }

        @Test
        @DisplayName("should generate events with correct interval")
        void createEvent_intervalTwo_generatesWithCorrectSpacing() {
            RepeatRule rule = RepeatRule.builder()
                    .frequency(RepeatFrequency.DAILY)
                    .interval(2)
                    .maxOccurrences(4)
                    .build();
            RepeatRule savedRule = repeatRuleRepository.save(rule);

            CalendarEvent event = buildEvent("Every Other Day", now, now.plusHours(1));
            event.setRepeatRuleId(savedRule.getId());

            calendarService.createEvent(event);

            List<CalendarEvent> allEvents = eventRepository.findByRepeatRuleId(savedRule.getId()).stream()
                    .sorted((a, b) -> a.getStartTime().compareTo(b.getStartTime()))
                    .toList();

            assertThat(allEvents).hasSize(4);
            for (int i = 1; i < allEvents.size(); i++) {
                long daysBetween = java.time.Duration.between(
                        allEvents.get(i - 1).getStartTime(), allEvents.get(i).getStartTime()).toDays();
                assertThat(daysBetween).isEqualTo(2);
            }
        }

        @Test
        @DisplayName("should preserve event duration for recurring instances")
        void createEvent_recurring_preservesDuration() {
            RepeatRule rule = RepeatRule.builder()
                    .frequency(RepeatFrequency.DAILY)
                    .interval(1)
                    .maxOccurrences(3)
                    .build();
            RepeatRule savedRule = repeatRuleRepository.save(rule);

            LocalDateTime start = now;
            LocalDateTime end = now.plusMinutes(45);
            CalendarEvent event = buildEvent("Fixed Duration", start, end);
            event.setRepeatRuleId(savedRule.getId());

            calendarService.createEvent(event);

            List<CalendarEvent> allEvents = eventRepository.findByRepeatRuleId(savedRule.getId());
            for (CalendarEvent e : allEvents) {
                long durationMinutes = java.time.Duration.between(e.getStartTime(), e.getEndTime()).toMinutes();
                assertThat(durationMinutes).isEqualTo(45);
            }
        }

        @Test
        @DisplayName("should delete all child events when parent recurring event is deleted")
        void deleteEvent_recurring_removesAllChildren() {
            RepeatRule rule = RepeatRule.builder()
                    .frequency(RepeatFrequency.DAILY)
                    .interval(1)
                    .maxOccurrences(5)
                    .build();
            RepeatRule savedRule = repeatRuleRepository.save(rule);

            CalendarEvent event = buildEvent("Recurring Delete", now, now.plusHours(1));
            event.setRepeatRuleId(savedRule.getId());

            CalendarEvent created = calendarService.createEvent(event);

            List<CalendarEvent> before = eventRepository.findByRepeatRuleId(savedRule.getId());
            assertThat(before).hasSize(5);

            calendarService.deleteEvent(created.getId());

            List<CalendarEvent> after = eventRepository.findByRepeatRuleId(savedRule.getId());
            assertThat(after).isEmpty();
            assertThat(repeatRuleRepository.findById(savedRule.getId())).isEmpty();
        }
    }

    // ======================== Transaction & Exception Tests ========================

    @Nested
    @DisplayName("Transaction and Exception Handling")
    class TransactionExceptionTests {

        @Test
        @DisplayName("should propagate VoiceCalException with error code")
        void exception_hasErrorCode() {
            CalendarEvent event = buildEvent("Bad", oneHourLater, now);

            assertThatThrownBy(() -> calendarService.createEvent(event))
                    .isInstanceOf(VoiceCalException.class)
                    .satisfies(ex -> {
                        VoiceCalException vcEx = (VoiceCalException) ex;
                        assertThat(vcEx.getErrorCode()).isEqualTo("INVALID_TIME_RANGE");
                    });
        }

        @Test
        @DisplayName("EventNotFoundException should contain event ID")
        void eventNotFound_containsId() {
            UUID fakeId = UUID.randomUUID();

            assertThatThrownBy(() -> calendarService.getEvent(fakeId))
                    .isInstanceOf(EventNotFoundException.class)
                    .hasMessageContaining(fakeId.toString());
        }

        @Test
        @DisplayName("notification failure should not prevent event update")
        void updateEvent_notificationFails_updateStillSucceeds() {
            CalendarEvent created = calendarService.createEvent(
                    buildEvent("Notify Fail", now, oneHourLater));

            doThrow(new RuntimeException("Email service down"))
                    .when(notificationService).sendEventUpdatedNotification(any());

            CalendarEvent updates = CalendarEvent.builder().title("Updated").build();
            CalendarEvent updated = calendarService.updateEvent(created.getId(), updates);

            assertThat(updated.getTitle()).isEqualTo("Updated");
        }

        @Test
        @DisplayName("notification failure should not prevent event deletion")
        void deleteEvent_notificationFails_deletionStillSucceeds() {
            CalendarEvent created = calendarService.createEvent(
                    buildEvent("Notify Fail Delete", now, oneHourLater));

            doThrow(new RuntimeException("Email service down"))
                    .when(notificationService).sendEventCancellationNotification(any());

            calendarService.deleteEvent(created.getId());

            assertThat(eventRepository.findById(created.getId())).isEmpty();
        }
    }
}
