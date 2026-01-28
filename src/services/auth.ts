import { api, apiJson } from "./api"
import type { AuthResponse, User, APIKey, MFAStatus, MFASetupResponse } from "@/types"

export const authService = {
  async signup(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    organizationName?: string
  ): Promise<AuthResponse> {
    const formData = new URLSearchParams()
    formData.append("email", email)
    formData.append("password", password)
    formData.append("first_name", firstName)
    formData.append("last_name", lastName)
    if (organizationName) {
      formData.append("organization_name", organizationName)
    }

    const { data } = await api.post<AuthResponse>("/v1/auth/signup", formData)

    if (typeof window !== "undefined" && data.session) {
      localStorage.setItem("access_token", data.session.access_token)
      localStorage.setItem("refresh_token", data.session.refresh_token)

      // Create a default API key for the new user
      try {
        const keyFormData = new URLSearchParams()
        keyFormData.append("name", "Clé par défaut")
        keyFormData.append("environment", "live")

        const keyResponse = await api.post<{
          success: boolean
          api_key: string
          key_id: string
        }>("/v1/auth/api-keys", keyFormData)

        if (keyResponse.data.success) {
          // Save API key to user data
          data.user.api_key = keyResponse.data.api_key
          data.user.api_key_id = keyResponse.data.key_id
        }
      } catch (error) {
        console.error("Error creating API key:", error)
      }

      localStorage.setItem("user", JSON.stringify(data.user))
    }

    return data
  },

  async signin(email: string, password: string): Promise<AuthResponse> {
    const formData = new URLSearchParams()
    formData.append("email", email)
    formData.append("password", password)

    const { data } = await api.post<AuthResponse>("/v1/auth/signin", formData)

    if (typeof window !== "undefined") {
      if (data.mfa_required) {
        if (data.pre_auth_token) {
          sessionStorage.setItem("mfa_pre_auth_token", data.pre_auth_token)
        }
        localStorage.setItem("user", JSON.stringify(data.user))
        return data
      }

      if (data.session) {
        localStorage.setItem("access_token", data.session.access_token)
        localStorage.setItem("refresh_token", data.session.refresh_token)
      }

      // Check if we already have an API key stored locally
      const storedAuth = localStorage.getItem("auth-storage")
      let existingApiKey: string | null = null

      if (storedAuth) {
        try {
          const parsed = JSON.parse(storedAuth)
          existingApiKey = parsed.state?.apiKey || null
        } catch {
          // Ignore parse errors
        }
      }

      if (existingApiKey) {
        // Use existing API key
        data.user.api_key = existingApiKey
      } else {
        // Check if user has API keys on server, if not create one automatically
        try {
          const keysResponse = await api.get<{ api_keys: Array<{ id: string; key_prefix: string; is_active: boolean }> }>("/v1/auth/api-keys")
          const activeKeys = keysResponse.data.api_keys.filter(k => k.is_active)

          if (activeKeys.length === 0) {
            // Create a default API key for the user
            const keyFormData = new URLSearchParams()
            keyFormData.append("name", "Clé par défaut")
            keyFormData.append("environment", "live")

            const keyResponse = await api.post<{
              success: boolean
              api_key: string
              key_id: string
            }>("/v1/auth/api-keys", keyFormData)

            if (keyResponse.data.success) {
              // Save API key to user data
              data.user.api_key = keyResponse.data.api_key
              data.user.api_key_id = keyResponse.data.key_id
            }
          }
        } catch (error) {
          console.error("Error checking/creating API key:", error)
        }
      }

      localStorage.setItem("user", JSON.stringify(data.user))
    }

    return data
  },

  async signout(): Promise<void> {
    try {
      await api.post("/v1/auth/signout")
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user")
        localStorage.removeItem("auth-storage")
        sessionStorage.removeItem("mfa_required")
        sessionStorage.removeItem("mfa_pre_auth_token")
      }
    }
  },

  async getProfile(): Promise<User> {
    const { data } = await api.get<User>("/v1/auth/me")
    return data
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const formData = new URLSearchParams()
    formData.append("email", email)

    const { data } = await api.post("/v1/auth/password-reset", formData)
    return data
  },

  async updatePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const formData = new URLSearchParams()
    formData.append("new_password", newPassword)

    const { data } = await api.post("/v1/auth/password-update", formData)
    return data
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const formData = new URLSearchParams()
    formData.append("refresh_token", refreshToken)

    const { data } = await api.post<AuthResponse>("/v1/auth/refresh", formData)

    if (!data.session) {
      throw new Error(data.message ?? "Session manquante lors du rafraîchissement du token.")
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", data.session.access_token)
      localStorage.setItem("refresh_token", data.session.refresh_token)
    }

    return data
  },

  // API Keys management
  async createApiKey(name: string, environment: "live" | "test"): Promise<{
    success: boolean
    api_key: string
    key_id: string
    name: string
    environment: string
    message: string
  }> {
    const formData = new URLSearchParams()
    formData.append("name", name)
    formData.append("environment", environment)

    const { data } = await api.post("/v1/auth/api-keys", formData)
    return data
  },

  async listApiKeys(): Promise<{ api_keys: APIKey[] }> {
    const { data } = await api.get("/v1/auth/api-keys")
    return data
  },

  async revokeApiKey(keyId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/v1/auth/api-keys/${keyId}/revoke`)
    return data
  },

  async deleteApiKey(keyId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/v1/auth/api-keys/${keyId}`)
    return data
  },

  isAuthenticated(): boolean {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("access_token")
    }
    return false
  },

  getStoredUser(): User | null {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user")
      return user ? JSON.parse(user) : null
    }
    return null
  },

  // MFA (Two-Factor Authentication) methods using backend API
  async setupMFA(): Promise<MFASetupResponse> {
    const { data } = await api.post<MFASetupResponse>("/v1/auth/mfa/setup")
    return data
  },

  async verifyMFASetup(code: string): Promise<{ success: boolean; mfa_enabled: boolean; backup_codes?: string[]; message?: string }> {
    const formData = new URLSearchParams()
    formData.append("code", code)
    const { data } = await api.post("/v1/auth/mfa/verify-setup", formData)
    return data
  },

  async getMFAStatus(): Promise<MFAStatus> {
    const { data } = await api.get<MFAStatus>("/v1/auth/mfa/status")
    return data
  },

  async disableMFA(code: string): Promise<{ success: boolean; mfa_enabled: boolean; message?: string }> {
    const formData = new URLSearchParams()
    formData.append("code", code)
    const { data } = await api.post("/v1/auth/mfa/disable", formData)
    return data
  },

  async verifyMFA(preAuthToken: string, code: string): Promise<AuthResponse> {
    const formData = new URLSearchParams()
    formData.append("pre_auth_token", preAuthToken)
    formData.append("code", code)
    const { data } = await api.post<AuthResponse>("/v1/auth/mfa/verify", formData)

    if (typeof window !== "undefined") {
      if (data.session) {
        localStorage.setItem("access_token", data.session.access_token)
        localStorage.setItem("refresh_token", data.session.refresh_token)
      }
      sessionStorage.removeItem("mfa_pre_auth_token")
    }

    return data
  },
}
