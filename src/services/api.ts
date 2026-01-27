import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Helper function to get API key from auth storage
const getStoredApiKey = (): string | null => {
  if (typeof window === "undefined") return null
  try {
    const storedAuth = localStorage.getItem("auth-storage")
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
    const user = localStorage.getItem("user")
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

// Request interceptor to add auth token and set content type
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Also add X-API-Key header if available
      const apiKey = getStoredApiKey()
      if (apiKey && !isAuthEndpoint(config.url)) {
        config.headers["X-API-Key"] = apiKey
      }
      if (process.env.NEXT_PUBLIC_DEBUG_API === "true") {
        console.log("[API] Request", {
          method: config.method,
          url: config.url,
          hasAuth: !!token,
          hasApiKey: !!apiKey,
          apiKeyPrefix: typeof apiKey === "string" ? apiKey.slice(0, 10) : null,
        })
      }
    }
    // Set Content-Type for POST/PUT/PATCH requests only
    if (config.method && ["post", "put", "patch"].includes(config.method.toLowerCase())) {
      if (!config.headers["Content-Type"]) {
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (typeof window !== "undefined") {
        const refreshToken = localStorage.getItem("refresh_token")

        if (refreshToken) {
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

            localStorage.setItem("access_token", data.session.access_token)
            localStorage.setItem("refresh_token", data.session.refresh_token)

            originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`
            return api(originalRequest)
          } catch {
            localStorage.removeItem("access_token")
            localStorage.removeItem("refresh_token")
            localStorage.removeItem("user")
            localStorage.removeItem("auth-storage")
            window.location.href = "/auth/login"
          }
        } else {
          localStorage.removeItem("access_token")
          localStorage.removeItem("user")
          localStorage.removeItem("auth-storage")
          window.location.href = "/auth/login"
        }
      }
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
      const token = localStorage.getItem("access_token")
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
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user")
        localStorage.removeItem("auth-storage")
        window.location.href = "/auth/login"
      }
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
          return { type: "forbidden", message: "Accès refusé", status }
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
