const LAST_USER_KEY = 'paytrack-last-user';

export interface LastUser {
  email: string;
  name: string;
  organizationName?: string;
}

export function saveLastUser(user: LastUser): void {
  try {
    localStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
  } catch {
    // Ignora erros de storage (modo privado, storage cheio, etc.)
  }
}

export function loadLastUser(): LastUser | null {
  try {
    const raw = localStorage.getItem(LAST_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastUser;
  } catch {
    return null;
  }
}

export function clearLastUser(): void {
  try {
    localStorage.removeItem(LAST_USER_KEY);
  } catch {
    // Ignora erros de storage
  }
}
