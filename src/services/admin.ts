import axios from "axios"
import { adminApi, setAdminToken, clearAdminToken } from "./admin-api"
import { authStorage } from "@/lib/auth-storage"
import type {
  AdminUser,
  AdminAuthResponse,
  AdminDashboard,
  CreditRequest,
  CreditRequestStatus,
  Organization,
  OrganizationMember,
  Pagination,
} from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const adminService = {
  // Authentication
  async login(email: string, password: string): Promise<AdminAuthResponse> {
    const formData = new URLSearchParams()
    formData.append("email", email)
    formData.append("password", password)
    const { data } = await axios.post(`${API_BASE_URL}/v1/admin/login`, formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    if (data.success && data.token) {
      setAdminToken(data.token)
      if (typeof window !== "undefined") {
        authStorage.setItem("admin_user", JSON.stringify(data.admin))
      }
    }
    return data
  },

  async logout(): Promise<void> {
    try {
      await adminApi.post("/v1/admin/logout")
    } finally {
      clearAdminToken()
    }
  },

  async getProfile(): Promise<AdminUser> {
    const { data } = await adminApi.get("/v1/admin/me")
    return data
  },

  // Dashboard
  async getDashboard(): Promise<AdminDashboard> {
    const { data } = await adminApi.get("/v1/admin/dashboard")
    return data
  },

  // Credit Requests Management
  async getCreditRequests(
    status?: CreditRequestStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ requests: CreditRequest[]; pagination: Pagination }> {
    const params = new URLSearchParams()
    params.append("limit", limit.toString())
    params.append("offset", offset.toString())
    if (status) {
      params.append("status", status)
    }
    const { data } = await adminApi.get(`/v1/admin/credit-requests?${params}`)
    return data
  },

  async getCreditRequest(id: string): Promise<CreditRequest> {
    const { data } = await adminApi.get(`/v1/admin/credit-requests/${id}`)
    return data
  },

  async approveCreditRequest(id: string, note?: string): Promise<{
    success: boolean
    request_id: string
    amount: number
    new_balance: number
  }> {
    const formData = new URLSearchParams()
    if (note) {
      formData.append("note", note)
    }
    const { data } = await adminApi.post(`/v1/admin/credit-requests/${id}/approve`, formData)
    return data
  },

  async rejectCreditRequest(id: string, note: string): Promise<{
    success: boolean
    message: string
  }> {
    const formData = new URLSearchParams()
    formData.append("note", note)
    const { data } = await adminApi.post(`/v1/admin/credit-requests/${id}/reject`, formData)
    return data
  },

  // Organization Management
  async getOrganizations(
    search?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ organizations: Organization[]; pagination: Pagination }> {
    const params = new URLSearchParams()
    params.append("limit", limit.toString())
    params.append("offset", offset.toString())
    if (search) {
      params.append("search", search)
    }
    const { data } = await adminApi.get(`/v1/admin/organizations?${params}`)
    return data
  },

  async getOrganization(orgId: string): Promise<{
    organization: Organization
    members: OrganizationMember[]
    recent_credit_requests: CreditRequest[]
    stats: {
      total_members: number
      total_credit_requests: number
      pending_requests: number
    }
  }> {
    const { data } = await adminApi.get(`/v1/admin/organizations/${orgId}`)
    return data
  },

  // MFA Management
  async resetUserMFA(userId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await adminApi.post(`/v1/admin/users/${userId}/reset-mfa`)
    return data
  },
}
