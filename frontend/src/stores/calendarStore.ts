import { create } from 'zustand';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarEvent, CreateEventRequest, UpdateEventRequest, EventStatus } from '@/types';
import { calendarApi } from '@/services/calendarApi';
import { getStartOfMonth, getEndOfMonth, formatDate } from '@/utils';

interface CalendarStore {
  // State
  selectedDate: Dayjs;
  currentMonth: Dayjs;
  events: CalendarEvent[];
  selectedDayEvents: CalendarEvent[];
  loading: boolean;
  error: string | null;

  // Batch selection state
  isBatchMode: boolean;
  selectedIds: Set<string>;

  // Actions
  setSelectedDate: (date: Dayjs) => void;
  setCurrentMonth: (month: Dayjs) => void;
  fetchMonthEvents: (month?: Dayjs) => Promise<void>;
  fetchDayEvents: (date: Dayjs) => Promise<void>;
  createEvent: (data: CreateEventRequest) => Promise<CalendarEvent>;
  updateEvent: (id: string, data: UpdateEventRequest) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  updateEventStatus: (id: string, status: EventStatus) => Promise<CalendarEvent>;
  refreshEvents: () => Promise<void>;
  clearError: () => void;

  // Batch actions
  toggleBatchMode: () => void;
  toggleSelectEvent: (id: string) => void;
  selectAllEvents: () => void;
  clearSelection: () => void;
  batchDeleteEvents: () => Promise<void>;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial state
  selectedDate: dayjs(),
  currentMonth: dayjs(),
  events: [],
  selectedDayEvents: [],
  loading: false,
  error: null,

  // Batch selection state
  isBatchMode: false,
  selectedIds: new Set<string>(),

  // Set selected date and fetch events for that day
  setSelectedDate: async (date: Dayjs) => {
    set({ selectedDate: date });
    await get().fetchDayEvents(date);
  },

  // Set current month and fetch events for that month
  setCurrentMonth: async (month: Dayjs) => {
    set({ currentMonth: month });
    await get().fetchMonthEvents(month);
  },

  // Fetch events for the entire month
  fetchMonthEvents: async (month?: Dayjs) => {
    const currentMonth = month || get().currentMonth;
    const start = getStartOfMonth(currentMonth).toISOString();
    const end = getEndOfMonth(currentMonth).toISOString();

    set({ loading: true, error: null });

    try {
      const events = await calendarApi.getEvents(start, end);
      set({ events, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取事件失败',
        loading: false,
      });
    }
  },

  // Fetch events for a specific day
  fetchDayEvents: async (date: Dayjs) => {
    const start = date.startOf('day').toISOString();
    const end = date.endOf('day').toISOString();

    try {
      const events = await calendarApi.getEvents(start, end);
      set({ selectedDayEvents: events });
    } catch (error) {
      console.error('Failed to fetch day events:', error);
      set({ selectedDayEvents: [] });
    }
  },

  // Create a new event
  createEvent: async (data: CreateEventRequest) => {
    set({ loading: true, error: null });

    try {
      const newEvent = await calendarApi.createEvent(data);

      // Update events list
      const { events, selectedDayEvents, selectedDate } = get();
      const eventDate = dayjs(data.startTime);

      set({
        events: [...events, newEvent],
        selectedDayEvents: eventDate.isSame(selectedDate, 'day')
          ? [...selectedDayEvents, newEvent]
          : selectedDayEvents,
        loading: false,
      });

      return newEvent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建事件失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update an existing event
  updateEvent: async (id: string, data: UpdateEventRequest) => {
    set({ loading: true, error: null });

    try {
      const updatedEvent = await calendarApi.updateEvent(id, data);

      // Update events list
      const { events, selectedDayEvents } = get();
      set({
        events: events.map((e) => (e.id === id ? updatedEvent : e)),
        selectedDayEvents: selectedDayEvents.map((e) =>
          e.id === id ? updatedEvent : e
        ),
        loading: false,
      });

      return updatedEvent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新事件失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Delete an event
  deleteEvent: async (id: string) => {
    set({ loading: true, error: null });

    try {
      await calendarApi.deleteEvent(id);

      // Remove from events list
      const { events, selectedDayEvents } = get();
      set({
        events: events.filter((e) => e.id !== id),
        selectedDayEvents: selectedDayEvents.filter((e) => e.id !== id),
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除事件失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update event status
  updateEventStatus: async (id: string, status: EventStatus) => {
    set({ loading: true, error: null });

    try {
      const updatedEvent = await calendarApi.updateEventStatus(id, status);

      // Update events list
      const { events, selectedDayEvents } = get();
      set({
        events: events.map((e) => (e.id === id ? updatedEvent : e)),
        selectedDayEvents: selectedDayEvents.map((e) =>
          e.id === id ? updatedEvent : e
        ),
        loading: false,
      });

      return updatedEvent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新事件状态失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Refresh events for current month and selected day
  refreshEvents: async () => {
    const { currentMonth, selectedDate } = get();
    await Promise.all([
      get().fetchMonthEvents(currentMonth),
      get().fetchDayEvents(selectedDate),
    ]);
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Toggle batch mode
  toggleBatchMode: () => {
    const { isBatchMode } = get();
    set({
      isBatchMode: !isBatchMode,
      selectedIds: new Set<string>(),
    });
  },

  // Toggle event selection
  toggleSelectEvent: (id: string) => {
    const { selectedIds } = get();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    set({ selectedIds: newSelected });
  },

  // Select all events in current day view
  selectAllEvents: () => {
    const { selectedDayEvents } = get();
    const allIds = new Set(selectedDayEvents.map((e) => e.id));
    set({ selectedIds: allIds });
  },

  // Clear selection
  clearSelection: () => {
    set({ selectedIds: new Set<string>() });
  },

  // Batch delete selected events
  batchDeleteEvents: async () => {
    const { selectedIds, events, selectedDayEvents } = get();
    if (selectedIds.size === 0) return;

    set({ loading: true, error: null });

    try {
      const ids = Array.from(selectedIds);
      await calendarApi.batchDeleteEvents(ids);

      set({
        events: events.filter((e) => !selectedIds.has(e.id)),
        selectedDayEvents: selectedDayEvents.filter((e) => !selectedIds.has(e.id)),
        selectedIds: new Set<string>(),
        isBatchMode: false,
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量删除失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },
}));

export default useCalendarStore;
