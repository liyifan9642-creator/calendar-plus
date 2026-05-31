package com.voicecal.ui.mapper;

import com.voicecal.core.model.CalendarEvent;
import com.voicecal.ui.dto.CalendarEventDto;
import com.voicecal.ui.dto.CreateEventRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * MapStruct mapper for CalendarEvent conversions.
 */
@Mapper(componentModel = "spring")
public interface CalendarEventMapper {

    CalendarEventDto toDto(CalendarEvent event);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    CalendarEvent toEntity(CreateEventRequest request);

    List<CalendarEventDto> toDtoList(List<CalendarEvent> events);
}