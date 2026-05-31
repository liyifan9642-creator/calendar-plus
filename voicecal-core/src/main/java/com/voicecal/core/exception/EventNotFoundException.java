package com.voicecal.core.exception;

import java.util.UUID;

/**
 * Exception thrown when a calendar event is not found.
 */
public class EventNotFoundException extends VoiceCalException {

    public EventNotFoundException(UUID eventId) {
        super("Calendar event not found with id: " + eventId, "EVENT_NOT_FOUND");
    }
}