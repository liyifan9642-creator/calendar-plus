package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for the /api/voice/confirm endpoint.
 * Used when user confirms, cancels, or selects a clarification option.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmRequest {

    /** The Message ID to confirm/action upon */
    private String messageId;

    /** Confirmation action: CONFIRM, CANCEL, or SELECT_OPTION */
    private String action;

    /** Selected option ID (required when action=SELECT_OPTION) */
    private String optionId;

    /** Additional text from user (for disambiguation) */
    private String additionalText;
}
