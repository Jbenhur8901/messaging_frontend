import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { User } from "@/types"
import { authService } from "@/services/auth"
import { authStorage } from "@/lib/auth-storage"

interface AuthState {
  user: User | null
  apiKey: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  showMFARecommendation: boolean
  requiresMFAVerification: boolean
  mfaPreAuthToken: string | null

  // Actions
  setUser: (user: User | null) => void
  setApiKey: (apiKey: string | null) => void
  setShowMFARecommendation: (show: boolean) => void
  setRequiresMFAVerification: (requires: boolean, preAuthToken?: string) => void
  completeMFA: () => void
  login: (email: string, password: string) => Promise<{ requiresMFA: boolean; factorId?: string }>
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    organizationName?: string
  ) => Promise<void>
  logout: () => Promise<void>
  fetchProfile: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      apiKey: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      showMFARecommendation: false,
      requiresMFAVerification: false,
      mfaPreAuthToken: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setApiKey: (apiKey) => set({ apiKey }),

      setShowMFARecommendation: (show) => set({ showMFARecommendation: show }),

      setRequiresMFAVerification: (requires, preAuthToken) => set((state) => {
        const newIsAuthenticated = requires ? state.isAuthenticated : !!state.user
        if (typeof window !== "undefined") {
          if (requires) {
            sessionStorage.setItem("mfa_required", "1")
            if (preAuthToken) {
              sessionStorage.setItem("mfa_pre_auth_token", preAuthToken)
            }
          } else {
            sessionStorage.removeItem("mfa_required")
            sessionStorage.removeItem("mfa_pre_auth_token")
          }
        }
        return {
          requiresMFAVerification: requires,
          mfaPreAuthToken: preAuthToken || null,
          // When MFA verification is complete (requires=false), set authenticated if user exists
          isAuthenticated: newIsAuthenticated,
        }
      }),

      completeMFA: () => set((state) => {
        const storedUser = authService.getStoredUser()
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("mfa_required")
          sessionStorage.removeItem("mfa_pre_auth_token")
        }
        return {
          requiresMFAVerification: false,
          mfaPreAuthToken: null,
          isAuthenticated: true,
          user: state.user || storedUser,
        }
      }),

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.signin(email, password)
          let effectiveUser = response.user
          let effectiveApiKey = (() => {
            const key = response.user.api_key as unknown
            if (typeof key === "string") return key
            if (key && typeof key === "object" && typeof (key as { key?: string }).key === "string") {
              return (key as { key: string }).key
            }
            return get().apiKey
          })()

          if (response.mfa_required) {
            set({
              isLoading: false,
              requiresMFAVerification: true,
              mfaPreAuthToken: response.pre_auth_token || null,
              // Store user temporarily but not authenticated yet
              user: effectiveUser,
              apiKey: effectiveApiKey,
            })
            if (typeof window !== "undefined") {
              sessionStorage.setItem("mfa_required", "1")
              if (response.pre_auth_token) {
                sessionStorage.setItem("mfa_pre_auth_token", response.pre_auth_token)
              }
            }
            return { requiresMFA: true, factorId: undefined }
          }

          if (!effectiveApiKey) {
            try {
              const createdKey = await authService.createApiKey("Clé par défaut", "live")
              if (createdKey.success) {
                effectiveApiKey = createdKey.api_key
                effectiveUser = { ...response.user, api_key: createdKey.api_key, api_key_id: createdKey.key_id }
                authStorage.setItem("user", JSON.stringify(effectiveUser))
              }
            } catch {
              // Ignore key creation errors for now
            }
          }

          // No MFA required, complete login
          // Check if this is first login (user just registered)
          const showMFARecommendation = response.user.is_first_login && !response.user.mfa_enabled

          // Clear stale organization from previous session
          if (typeof window !== "undefined") {
            try { localStorage.removeItem("organization-storage") } catch {}
          }

          set({
            user: effectiveUser,
            apiKey: effectiveApiKey,
            isAuthenticated: true,
            isLoading: false,
            showMFARecommendation,
          })

          return { requiresMFA: false }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur de connexion",
            isLoading: false,
          })
          throw error
        }
      },

      signup: async (email, password, firstName, lastName, organizationName?) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.signup(
            email,
            password,
            firstName,
            lastName,
            organizationName || ""
          )
          // Store API key if returned
          const apiKey = response.user.api_key || null
          // Show MFA recommendation for new users

          set({
            user: { ...response.user, is_first_login: true },
            apiKey,
            isAuthenticated: true,
            isLoading: false,
            showMFARecommendation: true,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur d'inscription",
            isLoading: false,
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await authService.signout()
        } finally {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("mfa_required")
            sessionStorage.removeItem("mfa_pre_auth_token")
            try { localStorage.removeItem("organization-storage") } catch {}
          }
          set({
            user: null,
            apiKey: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      fetchProfile: async () => {
        set({ isLoading: true })
        try {
          const user = await authService.getProfile()
          set({ user, isAuthenticated: true, isLoading: false })
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({
        user: state.user,
        apiKey: state.apiKey,
        isAuthenticated: state.isAuthenticated,
        // Don't persist MFA verification state - it's only for current session
      }),
    }
  )
)
