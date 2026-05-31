package com.voicecal.service.repository;

import com.voicecal.core.model.CalendarEvent;
import com.voicecal.core.model.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for CalendarEvent entities.
 */
@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {

    /**
     * Find all events that overlap with the given time range.
     * An event overlaps if it starts before the range ends AND ends after the range starts.
     */
    @Query("SELECT e FROM CalendarEvent e " +
           "WHERE e.status <> 'CANCELLED' " +
           "AND e.startTime < :end " +
           "AND e.endTime > :start " +
           "ORDER BY e.startTime ASC")
    List<CalendarEvent> findEventsInRange(@Param("start") LocalDateTime start,
                                          @Param("end") LocalDateTime end);

    /**
     * Find all events that overlap with the given time range, excluding a specific event.
     * Used for conflict detection during event updates.
     */
    @Query("SELECT e FROM CalendarEvent e " +
           "WHERE e.status <> 'CANCELLED' " +
           "AND e.id <> :excludeEventId " +
           "AND e.startTime < :end " +
           "AND e.endTime > :start " +
           "ORDER BY e.startTime ASC")
    List<CalendarEvent> findEventsInRangeExcluding(@Param("start") LocalDateTime start,
                                                   @Param("end") LocalDateTime end,
                                                   @Param("excludeEventId") UUID excludeEventId);

    /**
     * Search events by title, description, or location containing the query string (case-insensitive).
     */
    @Query("SELECT e FROM CalendarEvent e " +
           "WHERE e.status <> 'CANCELLED' " +
           "AND (LOWER(e.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(e.description) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(e.location) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY e.startTime ASC")
    List<CalendarEvent> searchEvents(@Param("query") String query);

    /**
     * Find all active events with status ACTIVE or COMPLETED (non-cancelled).
     */
    List<CalendarEvent> findByStatusNot(EventStatus status);

    /**
     * Find all events linked to a specific repeat rule.
     */
    List<CalendarEvent> findByRepeatRuleId(UUID repeatRuleId);
}
