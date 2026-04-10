import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const WEB_PREFIX = '@paytrack/';

const SAVED_CREDENTIALS_KEY = 'savedCredentials';

export interface SavedCredentials {
  email: string;
  password: string;
}

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

/**
 * Save login credentials securely on the device.
 * On iOS/Android uses the encrypted keychain/keystore.
 * On web (dev only) credentials are NOT persisted due to localStorage being insecure for passwords.
 */
export async function saveCredentials(
  credentials: SavedCredentials
): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(
    SAVED_CREDENTIALS_KEY,
    JSON.stringify(credentials)
  );
}

/**
 * Load previously saved credentials from secure storage.
 * Returns null if none are stored or on web.
 */
export async function loadCredentials(): Promise<SavedCredentials | null> {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await SecureStore.getItemAsync(SAVED_CREDENTIALS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedCredentials;
  } catch {
    return null;
  }
}

/**
 * Remove saved credentials from secure storage.
 */
export async function clearCredentials(): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(SAVED_CREDENTIALS_KEY);
}
