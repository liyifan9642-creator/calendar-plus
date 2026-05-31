package com.voicecal.core.model;

/**
 * Represents the recognized intent from a voice command.
 */
public enum Intent {
    CREATE_EVENT,
    UPDATE_EVENT,
    DELETE_EVENT,
    LIST_EVENTS,
    SEARCH_EVENTS,
    CHECK_AVAILABILITY,
    SET_REMINDER,
    CANCEL_REMINDER,
    UNKNOWN
}