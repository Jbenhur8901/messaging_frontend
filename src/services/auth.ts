import { api, apiJson, buildOrgFormData, getStoredActiveOrgId, withOrgQuery } from "./api"
import { authStorage } from "@/lib/auth-storage"
import { clearAllCachedContacts } from "@/lib/contacts-cache"
import { syncSupabaseSession } from "@/lib/supabase"
import type { AuthResponse, User, APIKey, MFAStatus, MFASetupResponse } from "@/types"

const sanitizeUserForStorage = (user: User): User => {
  const { api_key: _apiKey, ...rest } = user as User & { api_key?: unknown }
  return rest as User
}

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
      await syncSupabaseSession(data.session)
      authStorage.setItem("access_token", data.session.access_token)
      authStorage.setItem("refresh_token", data.session.refresh_token)

      authStorage.setItem("user", JSON.stringify(sanitizeUserForStorage(data.user)))
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
        authStorage.setItem("user", JSON.stringify(data.user))
        return data
      }

      if (data.session) {
        await syncSupabaseSession(data.session)
        authStorage.setItem("access_token", data.session.access_token)
        authStorage.setItem("refresh_token", data.session.refresh_token)
      }

      authStorage.setItem("user", JSON.stringify(sanitizeUserForStorage(data.user)))
    }

    return data
  },

  async signout(): Promise<void> {
    try {
      await api.post("/v1/auth/signout")
    } finally {
      if (typeof window !== "undefined") {
        authStorage.removeItem("access_token")
        authStorage.removeItem("refresh_token")
        authStorage.removeItem("user")
        authStorage.removeItem("auth-storage")
        sessionStorage.removeItem("mfa_required")
        sessionStorage.removeItem("mfa_pre_auth_token")
        clearAllCachedContacts()
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
      await syncSupabaseSession(data.session)
      authStorage.setItem("access_token", data.session.access_token)
      authStorage.setItem("refresh_token", data.session.refresh_token)
    }

    return data
  },

  // API Keys management
  async createApiKey(name: string, environment: "live" | "test", orgId?: string): Promise<{
    success: boolean
    api_key: string
    key_id: string
    name: string
    environment: string
    message: string
  }> {
    const activeOrgId = orgId || getStoredActiveOrgId()
    const formData = buildOrgFormData({
      name,
      environment,
    }, activeOrgId)
    const { data } = await api.post("/v1/auth/api-keys", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },

  async listApiKeys(orgId?: string): Promise<{ api_keys: APIKey[] }> {
    const { data } = await api.get(withOrgQuery("/v1/auth/api-keys", orgId || getStoredActiveOrgId()))
    return data
  },

  async revokeApiKey(keyId: string, orgId?: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(withOrgQuery(`/v1/auth/api-keys/${keyId}/revoke`, orgId || getStoredActiveOrgId()))
    return data
  },

  async deleteApiKey(keyId: string, orgId?: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(withOrgQuery(`/v1/auth/api-keys/${keyId}`, orgId || getStoredActiveOrgId()))
    return data
  },

  isAuthenticated(): boolean {
    if (typeof window !== "undefined") {
      return !!authStorage.getItem("access_token")
    }
    return false
  },

  getStoredUser(): User | null {
    if (typeof window !== "undefined") {
      const user = authStorage.getItem("user")
      return user ? JSON.parse(user) : null
    }
    return null
  },

  // MFA (Two-Factor Authentication) methods using backend API
  async setupMFA(): Promise<MFASetupResponse> {
    const { data } = await apiJson.post<MFASetupResponse>("/v1/auth/mfa/setup", {})
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

  async regenerateBackupCodes(code: string): Promise<{ success: boolean; backup_codes: string[]; message?: string }> {
    const formData = new URLSearchParams()
    formData.append("code", code)
    const { data } = await api.post<{ success: boolean; backup_codes: string[]; message?: string }>(
      "/v1/auth/mfa/regenerate-backup-codes",
      formData
    )
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
        await syncSupabaseSession(data.session)
        authStorage.setItem("access_token", data.session.access_token)
        authStorage.setItem("refresh_token", data.session.refresh_token)
      }
      sessionStorage.removeItem("mfa_pre_auth_token")
      if (data.user) {
        authStorage.setItem("user", JSON.stringify(sanitizeUserForStorage(data.user)))
      }
    }

    return data
  },
}
