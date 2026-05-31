package com.voicecal.service.notification;

import com.voicecal.core.model.CalendarEvent;

/**
 * Service for sending notifications related to calendar events.
 */
public interface NotificationService {

    /**
     * Send a reminder for an upcoming event.
     *
     * @param event the calendar event
     * @param minutesBefore minutes before the event
     */
    void sendReminder(CalendarEvent event, int minutesBefore);

    /**
     * Send event creation confirmation.
     *
     * @param event the created event
     */
    void sendEventCreatedConfirmation(CalendarEvent event);

    /**
     * Send event update notification.
     *
     * @param event the updated event
     */
    void sendEventUpdatedNotification(CalendarEvent event);

    /**
     * Send event cancellation notification.
     *
     * @param event the cancelled event
     */
    void sendEventCancellationNotification(CalendarEvent event);
}