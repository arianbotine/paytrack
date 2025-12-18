import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaletteMode } from '@mui/material';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  open: boolean;
}

interface UIState {
  sidebarOpen: boolean;
  themeMode: PaletteMode;
  notification: Notification;
  serverWaking: boolean;
  retryAttempt: number;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleThemeMode: () => void;
  setThemeMode: (mode: PaletteMode) => void;
  showNotification: (message: string, type: Notification['type']) => void;
  hideNotification: () => void;
  setServerWaking: (waking: boolean) => void;
  incrementRetryAttempt: () => void;
  resetRetryAttempt: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      sidebarOpen: true,
      themeMode: 'light' as PaletteMode,
      notification: {
        message: '',
        type: 'info',
        open: false,
      },
      serverWaking: false,
      retryAttempt: 0,

      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: open => set({ sidebarOpen: open }),

      toggleThemeMode: () =>
        set(state => ({
          themeMode: state.themeMode === 'light' ? 'dark' : 'light',
        })),

      setThemeMode: mode => set({ themeMode: mode }),

      showNotification: (message, type) =>
        set({
          notification: {
            message,
            type,
            open: true,
          },
        }),

      hideNotification: () =>
        set(state => ({
          notification: {
            ...state.notification,
            open: false,
          },
        })),

      setServerWaking: waking =>
        set(state => ({
          serverWaking: waking,
          retryAttempt: waking ? state.retryAttempt : 0,
        })),

      incrementRetryAttempt: () =>
        set(state => ({ retryAttempt: state.retryAttempt + 1 })),

      resetRetryAttempt: () => set({ retryAttempt: 0 }),
    }),
    {
      name: 'paytrack-ui',
      partialize: state => ({
        sidebarOpen: state.sidebarOpen,
        themeMode: state.themeMode,
      }),
    }
  )
);
