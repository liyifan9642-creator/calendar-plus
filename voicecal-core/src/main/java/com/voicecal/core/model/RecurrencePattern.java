package com.voicecal.core.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

/**
 * Represents a recurrence pattern for calendar events.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecurrencePattern {

    private RecurrenceType type;

    private Integer interval;

    private Set<DayOfWeek> daysOfWeek;

    private LocalDate endDate;

    private Integer count;
}