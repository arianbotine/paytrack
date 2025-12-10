import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PaletteMode } from "@mui/material";

interface Notification {
  message: string;
  type: "success" | "error" | "warning" | "info";
  open: boolean;
}

interface UIState {
  sidebarOpen: boolean;
  themeMode: PaletteMode;
  notification: Notification;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleThemeMode: () => void;
  setThemeMode: (mode: PaletteMode) => void;
  showNotification: (message: string, type: Notification["type"]) => void;
  hideNotification: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      themeMode: "light" as PaletteMode,
      notification: {
        message: "",
        type: "info",
        open: false,
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleThemeMode: () =>
        set((state) => ({
          themeMode: state.themeMode === "light" ? "dark" : "light",
        })),

      setThemeMode: (mode) => set({ themeMode: mode }),

      showNotification: (message, type) =>
        set({
          notification: {
            message,
            type,
            open: true,
          },
        }),

      hideNotification: () =>
        set((state) => ({
          notification: {
            ...state.notification,
            open: false,
          },
        })),
    }),
    {
      name: "paytrack-ui",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        themeMode: state.themeMode,
      }),
    }
  )
);
