package com.voicecal.service.notification;

import com.voicecal.core.model.CalendarEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Email-based notification service implementation.
 */
@Slf4j
@Service
public class EmailNotificationService implements NotificationService {

    @Override
    public void sendReminder(CalendarEvent event, int minutesBefore) {
        log.info("Sending reminder for event '{}' {} minutes before", event.getTitle(), minutesBefore);
        // TODO: Implement email sending with Spring Mail
    }

    @Override
    public void sendEventCreatedConfirmation(CalendarEvent event) {
        log.info("Sending event created confirmation for: {}", event.getTitle());
        // TODO: Implement email sending
    }

    @Override
    public void sendEventUpdatedNotification(CalendarEvent event) {
        log.info("Sending event updated notification for: {}", event.getTitle());
        // TODO: Implement email sending
    }

    @Override
    public void sendEventCancellationNotification(CalendarEvent event) {
        log.info("Sending event cancellation notification for: {}", event.getTitle());
        // TODO: Implement email sending
    }
}