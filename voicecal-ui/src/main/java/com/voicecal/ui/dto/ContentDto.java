package com.voicecal.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for message content - represents calendar event details extracted from user input.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentDto {

    /** Event title */
    private String title;

    /** Date in YYYY-MM-DD format */
    private String date;

    /** Start time in HH:mm format */
    private String startTime;

    /** End time in HH:mm format */
    private String endTime;

    /** Location (optional) */
    private String location;

    /** Description (optional) */
    private String description;
}
