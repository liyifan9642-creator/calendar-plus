package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for Message object - the core data structure for voice calendar operations.
 *
 * Represents a parsed user intent with:
 * - mode: CREATE, DELETE, UPDATE, QUERY
 * - status: PENDING, CONFIRMED, EXECUTED, FAILED, NEED_CLARIFICATION
 * - content: extracted event details
 * - conflicts: overlapping events (if any)
 * - clarificationQuestion: question for user when disambiguation is needed
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {

    /** Unique message identifier */
    private String id;

    /** Operation mode: CREATE, DELETE, UPDATE, QUERY */
    private String mode;

    /** Message status: PENDING, CONFIRMED, EXECUTED, FAILED, NEED_CLARIFICATION */
    private String status;

    /** Extracted event content */
    private ContentDto content;

    /** Target event ID (for UPDATE/DELETE operations) */
    private String targetEventId;

    /** List of conflicting calendar events */
    private List<CalendarEventDto> conflicts;

    /** Question to ask user when clarification is needed */
    private String clarificationQuestion;

    /** Raw LLM response information */
    private LlmResponseDto llmResponse;

    /** Creation timestamp (ISO 8601) */
    private String createdAt;

    /** Last update timestamp (ISO 8601) */
    private String updatedAt;
}
