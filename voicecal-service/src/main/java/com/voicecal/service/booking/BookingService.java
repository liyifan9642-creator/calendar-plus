package com.voicecal.service.booking;

import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.VoiceCommand;

/**
 * Service for handling event booking from voice commands.
 */
public interface BookingService {

    /**
     * Create a new event from a voice command.
     *
     * @param command the parsed voice command
     * @return the created calendar event
     */
    CalendarEvent bookEventFromCommand(VoiceCommand command);

    /**
     * Update an existing event from a voice command.
     *
     * @param command the parsed voice command
     * @return the updated calendar event
     */
    CalendarEvent updateEventFromCommand(VoiceCommand command);

    /**
     * Delete an event based on a voice command.
     *
     * @param command the parsed voice command
     * @return true if the event was deleted
     */
    boolean deleteEventFromCommand(VoiceCommand command);
}