const isBrowser = () => typeof window !== "undefined"

type StorageKey =
  | "access_token"
  | "refresh_token"
  | "user"
  | "auth-storage"
  | "admin_token"
  | "admin_user"
  | "session_started_at"

const migrateIfNeeded = (key: string): string | null => {
  if (!isBrowser()) return null
  const sessionValue = sessionStorage.getItem(key)
  if (sessionValue !== null) return sessionValue
  const legacyValue = localStorage.getItem(key)
  if (legacyValue !== null) {
    sessionStorage.setItem(key, legacyValue)
    localStorage.removeItem(key)
    return legacyValue
  }
  return null
}

export const authStorage = {
  getItem: (key: StorageKey | string): string | null => migrateIfNeeded(key),
  setItem: (key: StorageKey | string, value: string): void => {
    if (!isBrowser()) return
    sessionStorage.setItem(key, value)
    localStorage.removeItem(key)
  },
  removeItem: (key: StorageKey | string): void => {
    if (!isBrowser()) return
    sessionStorage.removeItem(key)
    localStorage.removeItem(key)
  },
}
