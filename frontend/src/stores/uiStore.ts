import { create } from 'zustand';
import { Dayjs } from 'dayjs';
import { CalendarEvent, CalendarView } from '@/types';

interface UIStore {
  // Modal states
  showEventForm: boolean;
  editingEvent: CalendarEvent | null;
  showEventDetail: boolean;
  selectedEvent: CalendarEvent | null;
  showImportExport: boolean;

  // Sidebar states
  showSidebar: boolean;
  sidebarTab: 'events' | 'voice';

  // Calendar view state
  calendarView: CalendarView;
  showSearch: boolean;

  // Actions
  openCreateForm: () => void;
  openEditForm: (event: CalendarEvent) => void;
  closeForm: () => void;
  openEventDetail: (event: CalendarEvent) => void;
  closeEventDetail: () => void;
  openImportExport: () => void;
  closeImportExport: () => void;
  toggleSidebar: () => void;
  setSidebarTab: (tab: 'events' | 'voice') => void;
  setCalendarView: (view: CalendarView) => void;
  toggleSearch: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  showEventForm: false,
  editingEvent: null,
  showEventDetail: false,
  selectedEvent: null,
  showImportExport: false,
  showSidebar: true,
  sidebarTab: 'events',
  calendarView: 'month',
  showSearch: false,

  // Open create event form
  openCreateForm: () => {
    set({
      showEventForm: true,
      editingEvent: null,
    });
  },

  // Open edit event form
  openEditForm: (event: CalendarEvent) => {
    set({
      showEventForm: true,
      editingEvent: event,
    });
  },

  // Close form
  closeForm: () => {
    set({
      showEventForm: false,
      editingEvent: null,
    });
  },

  // Open event detail
  openEventDetail: (event: CalendarEvent) => {
    set({
      showEventDetail: true,
      selectedEvent: event,
    });
  },

  // Close event detail
  closeEventDetail: () => {
    set({
      showEventDetail: false,
      selectedEvent: null,
    });
  },

  // Open import/export modal
  openImportExport: () => {
    set({ showImportExport: true });
  },

  // Close import/export modal
  closeImportExport: () => {
    set({ showImportExport: false });
  },

  // Toggle sidebar
  toggleSidebar: () => {
    set((state) => ({ showSidebar: !state.showSidebar }));
  },

  // Set sidebar tab
  setSidebarTab: (tab: 'events' | 'voice') => {
    set({ sidebarTab: tab });
  },

  // Set calendar view
  setCalendarView: (view: CalendarView) => {
    set({ calendarView: view });
  },

  // Toggle search panel
  toggleSearch: () => {
    set((state) => ({ showSearch: !state.showSearch }));
  },
}));

export default useUIStore;
