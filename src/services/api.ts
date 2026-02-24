import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios"
import { authStorage } from "@/lib/auth-storage"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Helper function to get API key from auth storage
const getStoredApiKey = (): string | null => {
  if (typeof window === "undefined") return null
  try {
    const storedAuth = authStorage.getItem("auth-storage")
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth)
      const storedKey = parsed.state?.apiKey
      if (typeof storedKey === "string" && storedKey.length > 0) {
        return storedKey
      }
    }
  } catch {
    // Ignore parse errors
  }
  try {
    const user = authStorage.getItem("user")
    if (user) {
      const parsedUser = JSON.parse(user)
      const apiKey = parsedUser.api_key
      if (typeof apiKey === "string") return apiKey
      if (apiKey && typeof apiKey === "object" && typeof apiKey.key === "string") {
        return apiKey.key
      }
      return null
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

const isAuthEndpoint = (url?: string) => {
  if (!url) return false
  return url.includes("/v1/auth")
}

// ── Token refresh lock (shared between api and apiJson) ──
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function clearAuthAndRedirect() {
  authStorage.removeItem("access_token")
  authStorage.removeItem("refresh_token")
  authStorage.removeItem("user")
  authStorage.removeItem("auth-storage")
  if (typeof window !== "undefined") {
    window.location.href = "/auth/login"
  }
}

async function handleTokenRefresh(
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
  instance: AxiosInstance
): Promise<unknown> {
  if (typeof window === "undefined") return Promise.reject()

  const refreshToken = authStorage.getItem("refresh_token")

  if (!refreshToken) {
    clearAuthAndRedirect()
    return Promise.reject()
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      addRefreshSubscriber((newToken: string) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        resolve(instance(originalRequest))
      })
    })
  }

  isRefreshing = true

  try {
    const formData = new URLSearchParams()
    formData.append("refresh_token", refreshToken)

    const { data } = await axios.post(
      `${API_BASE_URL}/v1/auth/refresh`,
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )

    const newToken = data.session.access_token
    authStorage.setItem("access_token", newToken)
    authStorage.setItem("refresh_token", data.session.refresh_token)

    originalRequest.headers.Authorization = `Bearer ${newToken}`
    onRefreshed(newToken)

    return instance(originalRequest)
  } catch {
    refreshSubscribers = []
    clearAuthAndRedirect()
    return Promise.reject()
  } finally {
    isRefreshing = false
  }
}

// Request interceptor to add auth token and set content type
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = authStorage.getItem("access_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Also add X-API-Key header if available
      const apiKey = getStoredApiKey()
      if (apiKey && !isAuthEndpoint(config.url)) {
        config.headers["X-API-Key"] = apiKey
      }
    }
    // Set Content-Type for POST/PUT/PATCH requests only (skip FormData)
    if (config.method && ["post", "put", "patch"].includes(config.method.toLowerCase())) {
      if (!config.headers["Content-Type"] && !(config.data instanceof FormData)) {
        config.headers["Content-Type"] = "application/x-www-form-urlencoded"
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // 403 on organization endpoint → stale org in localStorage, clear it
    if (
      error.response?.status === 403 &&
      originalRequest.url?.includes("/organizations/")
    ) {
      try {
        localStorage.removeItem("organization-storage")
      } catch {
        // Ignore storage errors
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      return handleTokenRefresh(originalRequest, api)
    }

    return Promise.reject(error)
  }
)

// API with JSON content type
export const apiJson = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

apiJson.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = authStorage.getItem("access_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Also add X-API-Key header if available
      const apiKey = getStoredApiKey()
      if (apiKey && !isAuthEndpoint(config.url)) {
        config.headers["X-API-Key"] = apiKey
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiJson.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      return handleTokenRefresh(originalRequest, apiJson)
    }

    return Promise.reject(error)
  }
)

// Error handler
export interface APIError {
  type: "validation" | "auth" | "credits" | "forbidden" | "notFound" | "rateLimit" | "server" | "network"
  message: string
  status?: number
}

export const handleApiError = (error: unknown): APIError => {
  if (axios.isAxiosError(error)) {
    const { response } = error

    if (response) {
      const { status, data } = response
      const detail = (data as { detail?: unknown })?.detail
      const detailMessage = (() => {
        if (typeof detail === "string") return detail
        if (Array.isArray(detail)) {
          const msgs = detail
            .map((item) => (typeof item?.msg === "string" ? item.msg : null))
            .filter((msg): msg is string => !!msg)
          if (msgs.length > 0) return msgs.join(", ")
        }
        if (detail && typeof detail === "object") {
          try {
            return JSON.stringify(detail)
          } catch {
            return "Erreur serveur"
          }
        }
        return null
      })()

      switch (status) {
        case 400:
          return { type: "validation", message: detailMessage || "Paramètres invalides", status }
        case 401:
          return { type: "auth", message: "Session expirée, veuillez vous reconnecter", status }
        case 402:
          return { type: "credits", message: "Crédits insuffisants", status }
        case 403:
          return { type: "forbidden", message: detailMessage || "Accès refusé", status }
        case 404:
          return { type: "notFound", message: "Ressource non trouvée", status }
        case 409:
          return { type: "validation", message: detailMessage || "Cette ressource existe déjà", status }
        case 422:
          return { type: "validation", message: detailMessage || "Validation échouée", status }
        case 429:
          return { type: "rateLimit", message: "Trop de requêtes, réessayez plus tard", status }
        default:
          return { type: "server", message: detailMessage || "Erreur serveur", status }
      }
    }
  }

  return { type: "network", message: "Erreur de connexion" }
}
