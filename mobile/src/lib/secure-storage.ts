import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const WEB_PREFIX = '@paytrack/';

/**
 * Platform-aware secure storage.
 * - iOS/Android: expo-secure-store (encrypted keychain/keystore)
 * - Web: localStorage with prefix (dev/testing only; not suitable for production secrets)
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(WEB_PREFIX + key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(WEB_PREFIX + key, value);
      } catch {
        // ignore storage errors on web
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(WEB_PREFIX + key);
      } catch {
        // ignore storage errors on web
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
