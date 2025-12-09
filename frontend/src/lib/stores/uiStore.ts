import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Notification {
  message: string;
  type: "success" | "error" | "warning" | "info";
  open: boolean;
}

interface UIState {
  sidebarOpen: boolean;
  notification: Notification;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  showNotification: (message: string, type: Notification["type"]) => void;
  hideNotification: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      notification: {
        message: "",
        type: "info",
        open: false,
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

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
      }),
    }
  )
);
