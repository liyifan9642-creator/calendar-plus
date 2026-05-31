package com.voicecal.service.repository;

import com.voicecal.core.model.Reminder;
import com.voicecal.core.model.ReminderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for Reminder entities.
 */
@Repository
public interface ReminderRepository extends JpaRepository<Reminder, UUID> {

    /**
     * Find all pending reminders that are due (remindAt is at or before the given time).
     */
    @Query("SELECT r FROM Reminder r " +
           "WHERE r.status = 'PENDING' " +
           "AND r.remindAt <= :now " +
           "ORDER BY r.remindAt ASC")
    List<Reminder> findDueReminders(@Param("now") LocalDateTime now);

    /**
     * Find all reminders for a specific event.
     */
    List<Reminder> findByEventId(UUID eventId);

    /**
     * Find all reminders for a specific event with a given status.
     */
    List<Reminder> findByEventIdAndStatus(UUID eventId, ReminderStatus status);

    /**
     * Find all pending reminders for a specific event.
     */
    @Query("SELECT r FROM Reminder r " +
           "WHERE r.eventId = :eventId " +
           "AND r.status = 'PENDING' " +
           "ORDER BY r.remindAt ASC")
    List<Reminder> findPendingRemindersByEventId(@Param("eventId") UUID eventId);

    /**
     * Delete all reminders associated with a specific event.
     */
    void deleteByEventId(UUID eventId);

    /**
     * Cancel all pending reminders for a specific event.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Reminder r SET r.status = 'CANCELLED' " +
           "WHERE r.eventId = :eventId AND r.status = 'PENDING'")
    void cancelPendingRemindersByEventId(@Param("eventId") UUID eventId);
}
