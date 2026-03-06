import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios"
import { authStorage } from "@/lib/auth-storage"
import { clearAllCachedContacts } from "@/lib/contacts-cache"
import { supabase, syncSupabaseSession } from "@/lib/supabase"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const APP_NAMESPACE_PREFIXES = [
  "/v1/contacts",
  "/v1/custom-fields",
  "/v1/dashboard",
  "/v1/tags",
  "/v1/vector-stores",
  "/v1/whatsapp",
  "/v1/ai/credits/balance",
  "/v1/ai/credits/check",
  "/v1/ai/credits/transactions",
] as const

const APP_NAMESPACE_EXCLUSIONS = new Set([
  "/v1/whatsapp/credits/packages",
  "/v1/ai/credits/packages",
])

const isPrefixMatch = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`)

const shouldUseAppNamespace = (pathname: string): boolean => {
  if (
    pathname.startsWith("/v1/app/") ||
    pathname.startsWith("/v1/integrations/") ||
    pathname.startsWith("/v1/admin/") ||
    pathname.startsWith("/v1/auth/") ||
    pathname.startsWith("/v1/organizations/") ||
    pathname.startsWith("/v1/invitations/")
  ) {
    return false
  }

  if (APP_NAMESPACE_EXCLUSIONS.has(pathname)) {
    return false
  }

  return APP_NAMESPACE_PREFIXES.some((prefix) => isPrefixMatch(pathname, prefix))
}

const withAppNamespace = (url?: string): string | undefined => {
  if (!url) return url
  const isAbsolute = /^https?:\/\//i.test(url)
  const parsed = new URL(url, API_BASE_URL)
  if (!shouldUseAppNamespace(parsed.pathname)) {
    return url
  }

  parsed.pathname = parsed.pathname.replace(/^\/v1\//, "/v1/app/")
  if (isAbsolute) return parsed.toString()
  return `${parsed.pathname}${parsed.search}`
}

export const getStoredActiveOrgId = (): string | null => {
  if (typeof window === "undefined") return null
  try {
    const storedAuth = authStorage.getItem("auth-storage")
    if (!storedAuth) return null
    const parsed = JSON.parse(storedAuth)
    const activeOrgId = parsed.state?.activeOrgId
    return typeof activeOrgId === "string" && activeOrgId.length > 0 ? activeOrgId : null
  } catch {
    return null
  }
}

export function withOrgQuery(url: string, orgId?: string | null) {
  if (!orgId) return url
  const normalized = url.startsWith("http") ? url : `${API_BASE_URL}${url}`
  const parsed = new URL(normalized)
  parsed.searchParams.set("org_id", orgId)
  return normalized.startsWith(API_BASE_URL)
    ? `${parsed.pathname}${parsed.search}`
    : parsed.toString()
}

export function buildOrgFormData(
  values: Record<string, string | Blob | null | undefined>,
  orgId?: string | null
) {
  const fd = new FormData()
  if (orgId) fd.append("org_id", orgId)
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) {
      fd.append(key, value)
    }
  }
  return fd
}

export const api = axios.create({
  baseURL: API_BASE_URL,
})

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
  clearAllCachedContacts()
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
    await syncSupabaseSession(data.session)
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
  async (config: InternalAxiosRequestConfig) => {
    config.url = withAppNamespace(config.url)

    if (typeof window !== "undefined") {
      let token: string | null = null
      try {
        const { data } = await supabase.auth.getSession()
        token = data.session?.access_token ?? null
      } catch {
        token = null
      }
      if (!token) {
        token = authStorage.getItem("access_token")
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
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
  async (config: InternalAxiosRequestConfig) => {
    config.url = withAppNamespace(config.url)

    if (typeof window !== "undefined") {
      let token: string | null = null
      try {
        const { data } = await supabase.auth.getSession()
        token = data.session?.access_token ?? null
      } catch {
        token = null
      }
      if (!token) {
        token = authStorage.getItem("access_token")
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
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
  type: "validation" | "auth" | "credits" | "forbidden" | "notFound" | "rateLimit" | "unavailable" | "server" | "network"
  message: string
  status?: number
  correlationId?: string
}

export const handleApiError = (error: unknown): APIError => {
  if (axios.isAxiosError(error)) {
    const { response } = error

    if (response) {
      const { status, data, headers } = response
      const correlationId = headers?.["x-correlation-id"] as string | undefined
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
          return { type: "validation", message: detailMessage || "Paramètres invalides", status, correlationId }
        case 401:
          return { type: "auth", message: "Session expirée, veuillez vous reconnecter", status, correlationId }
        case 402:
          return { type: "credits", message: "Crédits insuffisants", status, correlationId }
        case 403:
          return { type: "forbidden", message: detailMessage || "Accès refusé", status, correlationId }
        case 404:
          return { type: "notFound", message: "Ressource non trouvée", status, correlationId }
        case 409:
          return { type: "validation", message: detailMessage || "Cette ressource existe déjà", status, correlationId }
        case 422:
          return { type: "validation", message: detailMessage || "Validation échouée", status, correlationId }
        case 429:
          return { type: "rateLimit", message: "Trop de requêtes, réessayez plus tard", status, correlationId }
        case 503:
          return { type: "unavailable", message: detailMessage || "Service temporairement indisponible, réessayez plus tard", status, correlationId }
        default:
          return { type: "server", message: detailMessage || "Erreur serveur", status, correlationId }
      }
    }
  }

  return { type: "network", message: "Erreur de connexion" }
}
