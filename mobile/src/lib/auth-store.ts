import { create } from 'zustand';
import { secureStorage } from './secure-storage';
import { User } from './types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (
    user: User,
    accessToken: string,
    refreshToken: string
  ) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, accessToken, refreshToken) => {
    await secureStorage.setItem('refreshToken', refreshToken);
    await secureStorage.setItem('user', JSON.stringify(user));

    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setTokens: async (accessToken, refreshToken) => {
    await secureStorage.setItem('refreshToken', refreshToken);
    set({ accessToken });
  },

  setUser: user => {
    set({ user });
  },

  logout: async () => {
    await secureStorage.removeItem('refreshToken');
    await secureStorage.removeItem('user');

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadStoredAuth: async () => {
    try {
      const [refreshToken, userJson] = await Promise.all([
        secureStorage.getItem('refreshToken'),
        secureStorage.getItem('user'),
      ]);

      if (refreshToken && userJson) {
        const user = JSON.parse(userJson) as User;

        // We have stored auth, but need to refresh the access token
        // For now, mark as authenticated but will need refresh on first API call
        set({
          user,
          accessToken: null, // Will be refreshed on first API call
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      set({ isLoading: false });
    }
  },
}));
