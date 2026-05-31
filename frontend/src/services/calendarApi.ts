import axios from 'axios';
import { CalendarEvent, CreateEventRequest, UpdateEventRequest } from '@/types';

const api = axios.create({
  baseURL: '/api/v1/calendar',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Calendar API Error:', error);
    return Promise.reject(error);
  }
);

export const calendarApi = {
  /**
   * Get events within a date range
   */
  getEvents: async (start: string, end: string): Promise<CalendarEvent[]> => {
    const response = await api.get<CalendarEvent[]>('/events', {
      params: { start, end },
    });
    return response.data;
  },

  /**
   * Get event by ID
   */
  getEvent: async (id: string): Promise<CalendarEvent> => {
    const response = await api.get<CalendarEvent>(`/events/${id}`);
    return response.data;
  },

  /**
   * Create a new event
   */
  createEvent: async (data: CreateEventRequest): Promise<CalendarEvent> => {
    const response = await api.post<CalendarEvent>('/events', data);
    return response.data;
  },

  /**
   * Update an existing event
   */
  updateEvent: async (id: string, data: UpdateEventRequest): Promise<CalendarEvent> => {
    const response = await api.put<CalendarEvent>(`/events/${id}`, data);
    return response.data;
  },

  /**
   * Delete an event
   */
  deleteEvent: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },

  /**
   * Search events by keyword
   */
  searchEvents: async (query: string): Promise<CalendarEvent[]> => {
    const response = await api.get<CalendarEvent[]>('/events/search', {
      params: { query },
    });
    return response.data;
  },

  /**
   * Check time availability
   */
  checkAvailability: async (start: string, end: string): Promise<boolean> => {
    const response = await api.get<boolean>('/availability', {
      params: { start, end },
    });
    return response.data;
  },

  // ======================== New API Methods ========================

  /**
   * Update event status only
   */
  updateEventStatus: async (id: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'): Promise<CalendarEvent> => {
    const response = await api.patch<CalendarEvent>(`/events/${id}/status`, { status });
    return response.data;
  },

  /**
   * Batch delete events
   */
  batchDeleteEvents: async (ids: string[]): Promise<void> => {
    await api.post('/events/batch-delete', { ids });
  },

  /**
   * Get all events (no date range limit)
   */
  getAllEvents: async (): Promise<CalendarEvent[]> => {
    const response = await api.get<CalendarEvent[]>('/events/all');
    return response.data;
  },

  /**
   * Get event count per day in a date range
   */
  getEventCount: async (start: string, end: string): Promise<Record<string, number>> => {
    const response = await api.get<Record<string, number>>('/events/count', {
      params: { start, end },
    });
    return response.data;
  },

  /**
   * Get events grouped by week
   */
  getEventsByWeek: async (weekStart: string): Promise<Record<string, CalendarEvent[]>> => {
    const response = await api.get<Record<string, CalendarEvent[]>>('/events/week', {
      params: { weekStart },
    });
    return response.data;
  },

  /**
   * Reorder events
   */
  reorderEvents: async (eventOrders: Record<string, number>): Promise<void> => {
    await api.put('/events/reorder', eventOrders);
  },

  /**
   * Get event categories
   */
  getCategories: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/events/categories');
    return response.data;
  },

  /**
   * Filter events
   */
  filterEvents: async (params: {
    category?: string;
    status?: string;
    location?: string;
    start?: string;
    end?: string;
  }): Promise<CalendarEvent[]> => {
    const response = await api.get<CalendarEvent[]>('/events/filter', { params });
    return response.data;
  },
};

export default calendarApi;
