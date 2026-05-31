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

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Core domain entity representing a reminder for a calendar event.
 */
@Entity
@Table(name = "reminders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull(message = "Event ID is required")
    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @NotNull(message = "Remind time is required")
    @Column(name = "remind_at", nullable = false)
    private LocalDateTime remindAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReminderStatus status = ReminderStatus.PENDING;
}
