package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for a single conversation history item.
 * Represents one turn in a voice assistant conversation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationItemDto {

    /** Unique conversation item identifier */
    private String id;

    /** Timestamp of this conversation turn (ISO 8601) */
    private String timestamp;

    /** User's input text */
    private String userInput;

    /** System's response text */
    private String systemResponse;

    /** Associated Message object (if applicable) */
    private MessageDto message;
}
