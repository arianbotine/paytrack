import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  isSystemAdmin: boolean;
  currentOrganization?: Organization;
  availableOrganizations: Organization[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      accessToken: null,

      setAuth: (user, accessToken) => {
        set({
          user,
          accessToken,
        });
      },

      setAccessToken: accessToken => {
        set({ accessToken });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
        });
      },
    }),
    {
      name: 'paytrack-auth',
      partialize: state => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
);

// Selector para isAuthenticated
export const isAuthenticated = (state: AuthState) => !!state.accessToken;
