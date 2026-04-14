const isBrowser = () => typeof window !== "undefined"

type StorageKey =
  | "access_token"
  | "refresh_token"
  | "user"
  | "auth-storage"
  | "admin_token"
  | "admin_user"

const readFromCookie = (key: string): string | null => {
  if (!isBrowser()) return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

const readFromSessionFirst = (key: string): string | null => {
  if (!isBrowser()) return null
  const sessionValue = sessionStorage.getItem(key)
  if (sessionValue !== null) return sessionValue
  const localValue = localStorage.getItem(key)
  if (localValue !== null) {
    // Migrate old localStorage values to sessionStorage.
    sessionStorage.setItem(key, localValue)
    localStorage.removeItem(key)
    return localValue
  }
  // Fallback to cookie for token keys (cookie has 12h max-age, survives some edge cases)
  if (key === "access_token" || key === "admin_token") {
    const cookieValue = readFromCookie(key)
    if (cookieValue) {
      sessionStorage.setItem(key, cookieValue)
      return cookieValue
    }
  }
  return null
}

const COOKIE_KEYS: ReadonlySet<string> = new Set(["access_token", "admin_token"])
const SENSITIVE_KEYS: ReadonlyArray<StorageKey> = [
  "access_token",
  "refresh_token",
  "user",
  "auth-storage",
  "admin_token",
  "admin_user",
]

if (isBrowser()) {
  for (const key of SENSITIVE_KEYS) {
    const value = localStorage.getItem(key)
    if (value !== null && sessionStorage.getItem(key) === null) {
      sessionStorage.setItem(key, value)
      localStorage.removeItem(key)
    } else if (value !== null) {
      localStorage.removeItem(key)
    }
  }
}

export const authStorage = {
  getItem: (key: StorageKey | string): string | null => readFromSessionFirst(key),
  setItem: (key: StorageKey | string, value: string): void => {
    if (!isBrowser()) return
    sessionStorage.setItem(key, value)
    localStorage.removeItem(key)
    // Sync to cookie so the Next.js middleware can read it
    if (COOKIE_KEYS.has(key)) {
      const secure = window.location.protocol === "https:" ? "; Secure" : ""
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Strict; max-age=43200${secure}`
    }
  },
  removeItem: (key: StorageKey | string): void => {
    if (!isBrowser()) return
    sessionStorage.removeItem(key)
    localStorage.removeItem(key)
    // Clear cookie
    if (COOKIE_KEYS.has(key)) {
      const secure = window.location.protocol === "https:" ? "; Secure" : ""
      document.cookie = `${key}=; path=/; SameSite=Strict; max-age=0${secure}`
    }
  },
}
