import { create } from 'zustand';
import { CalendarEvent } from '../models';
import { calendarService } from '../services/calendar';
import dayjs from 'dayjs';

interface CalendarState {
  /** All loaded events */
  events: CalendarEvent[];
  /** Currently selected date (YYYY-MM-DD) */
  selectedDate: string;
  /** Monday of current week (YYYY-MM-DD) */
  selectedWeekStart: string;
  /** Current view mode */
  viewMode: 'month' | 'week' | 'day';
  /** Loading indicator */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  /** Load events for a date range */
  loadEvents: (start: string, end: string) => Promise<void>;
  /** Load events grouped by week */
  loadEventsForWeek: (weekStart: string) => Promise<void>;
  /** Create a new event */
  createEvent: (event: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  /** Update an existing event */
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  /** Delete an event */
  deleteEvent: (id: string) => Promise<void>;
  /** Search events by query string */
  searchEvents: (query: string) => Promise<void>;
  /** Set the selected date */
  setSelectedDate: (date: string) => void;
  /** Set the view mode */
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
  /** Clear the current error */
  clearError: () => void;
}

/** Get the Monday of the week containing the given date */
function getMonday(date: string): string {
  const d = dayjs(date);
  const day = d.day(); // 0=Sun, 1=Mon, ...
  const offset = day === 0 ? -6 : 1 - day;
  return d.add(offset, 'day').format('YYYY-MM-DD');
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  selectedDate: dayjs().format('YYYY-MM-DD'),
  selectedWeekStart: getMonday(dayjs().format('YYYY-MM-DD')),
  viewMode: 'week',
  isLoading: false,
  error: null,

  loadEvents: async (start: string, end: string) => {
    set({ isLoading: true, error: null });
    try {
      const events = await calendarService.getEvents(start, end);
      set({ events, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to load events', isLoading: false });
    }
  },

  loadEventsForWeek: async (weekStart: string) => {
    const weekEnd = dayjs(weekStart).add(7, 'day').format('YYYY-MM-DD');
    set({ selectedWeekStart: weekStart, isLoading: true, error: null });
    try {
      const events = await calendarService.getEvents(weekStart, weekEnd);
      set({ events, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to load events', isLoading: false });
    }
  },

  createEvent: async (event: Partial<CalendarEvent>) => {
    set({ isLoading: true, error: null });
    try {
      const created = await calendarService.createEvent(event);
      set((state) => ({
        events: [...state.events, created],
        isLoading: false,
      }));
      return created;
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to create event', isLoading: false });
      throw err;
    }
  },

  updateEvent: async (id: string, updates: Partial<CalendarEvent>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await calendarService.updateEvent(id, updates);
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? updated : e)),
        isLoading: false,
      }));
      return updated;
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to update event', isLoading: false });
      throw err;
    }
  },

  deleteEvent: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await calendarService.deleteEvent(id);
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to delete event', isLoading: false });
      throw err;
    }
  },

  searchEvents: async (query: string) => {
    set({ isLoading: true, error: null });
    try {
      const events = await calendarService.searchEvents(query);
      set({ events, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to search events', isLoading: false });
    }
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
  },

  setViewMode: (mode: 'month' | 'week' | 'day') => {
    set({ viewMode: mode });
  },

  clearError: () => {
    set({ error: null });
  },
}));
