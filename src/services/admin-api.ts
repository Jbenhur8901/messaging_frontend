import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { authStorage } from "@/lib/auth-storage"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const ADMIN_TOKEN_KEY = "admin_token"

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
})

// Helper to get stored admin token
const getAdminToken = (): string | null => {
  if (typeof window === "undefined") return null
  return authStorage.getItem(ADMIN_TOKEN_KEY)
}

// Helper to store admin token
export const setAdminToken = (token: string): void => {
  if (typeof window !== "undefined") {
    authStorage.setItem(ADMIN_TOKEN_KEY, token)
  }
}

// Helper to clear admin token
export const clearAdminToken = (): void => {
  if (typeof window !== "undefined") {
    authStorage.removeItem(ADMIN_TOKEN_KEY)
    authStorage.removeItem("admin_user")
  }
}

// Request interceptor to add X-Admin-Token header
adminApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = getAdminToken()
      if (token) {
        config.headers["X-Admin-Token"] = token
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    // Set Content-Type for POST/PUT/PATCH requests
    if (config.method && ["post", "put", "patch"].includes(config.method.toLowerCase())) {
      if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/x-www-form-urlencoded"
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
adminApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        clearAdminToken()
        window.location.href = "/admin/login"
      }
    }
    return Promise.reject(error)
  }
)

export { ADMIN_TOKEN_KEY }
