const isBrowser = () => typeof window !== "undefined"

type StorageKey =
  | "access_token"
  | "refresh_token"
  | "user"
  | "auth-storage"
  | "admin_token"
  | "admin_user"

const migrateToLocal = (key: string): string | null => {
  if (!isBrowser()) return null
  const localValue = localStorage.getItem(key)
  if (localValue !== null) return localValue
  // Migrate from sessionStorage if still there
  const sessionValue = sessionStorage.getItem(key)
  if (sessionValue !== null) {
    localStorage.setItem(key, sessionValue)
    sessionStorage.removeItem(key)
    return sessionValue
  }
  return null
}

const COOKIE_KEYS: ReadonlySet<string> = new Set(["access_token", "admin_token"])

export const authStorage = {
  getItem: (key: StorageKey | string): string | null => migrateToLocal(key),
  setItem: (key: StorageKey | string, value: string): void => {
    if (!isBrowser()) return
    localStorage.setItem(key, value)
    sessionStorage.removeItem(key)
    // Sync to cookie so the Next.js middleware can read it
    if (COOKIE_KEYS.has(key)) {
      document.cookie = `${key}=${value}; path=/; SameSite=Lax; max-age=86400`
    }
  },
  removeItem: (key: StorageKey | string): void => {
    if (!isBrowser()) return
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
    // Clear cookie
    if (COOKIE_KEYS.has(key)) {
      document.cookie = `${key}=; path=/; max-age=0`
    }
  },
}
