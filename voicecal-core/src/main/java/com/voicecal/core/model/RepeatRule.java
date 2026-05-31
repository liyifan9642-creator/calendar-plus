package com.voicecal.core.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/**
 * Core domain entity representing a repeat rule for recurring calendar events.
 */
@Entity
@Table(name = "repeat_rules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepeatRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull(message = "Frequency is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RepeatFrequency frequency;

    @Column(name = "\"interval\"", nullable = false)
    @Builder.Default
    private Integer interval = 1;

    @Column(name = "days_of_week")
    private Set<DayOfWeek> daysOfWeek;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "max_occurrences")
    private Integer maxOccurrences;
}
