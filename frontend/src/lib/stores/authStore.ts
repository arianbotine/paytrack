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
  isAuthenticated: boolean;
  setAuth: (user: User) => void;
  switchOrganization: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      isAuthenticated: false,

      setAuth: user => {
        set({
          user,
          isAuthenticated: true,
        });
      },

      switchOrganization: user => {
        set({
          user,
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'paytrack-auth',
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
