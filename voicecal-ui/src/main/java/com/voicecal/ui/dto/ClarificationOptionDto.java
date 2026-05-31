package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for clarification options presented to the user
 * when the system needs additional information or disambiguation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClarificationOptionDto {

    /** Unique option identifier */
    private String id;

    /** Display label for the option */
    private String label;

    /** Option value (used for selection) */
    private String value;
}
