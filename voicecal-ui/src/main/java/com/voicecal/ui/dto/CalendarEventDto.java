package com.voicecal.ui.dto;

import com.voicecal.core.model.EventStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for calendar event responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEventDto {

    private String id;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String location;
    private List<String> attendees;
    private EventStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}