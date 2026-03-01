import { api, buildOrgFormData, getStoredActiveOrgId, withOrgQuery } from "./api"
import type { AICreditRequest, CreditRequestStatus } from "@/types"

export interface AICreditsBalance {
  balance: number
  total_used: number
}

export interface AIPackage {
  id: string
  code: string
  name: string
  message_count: number
  unit_price_fcfa: number
  total_price_fcfa: number
  discount_percent: number
  is_active: boolean
}

export interface AITransaction {
  id: string
  type: "purchase" | "consumption" | "bonus" | "adjustment"
  amount: number
  description: string
  created_at: string
}

export interface AITransactionsPagination {
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export interface AICreditsCheck {
  can_send: boolean
  messages_requested: number
  balance: number
  shortage: number
}

export const aiCreditsService = {
  // ── Balance & Packages (X-API-Key) ──

  async getBalance(): Promise<AICreditsBalance> {
    const { data } = await api.get<AICreditsBalance>("/v1/ai/credits/balance")
    return data
  },

  async getPackages(): Promise<{ packages: AIPackage[] }> {
    const { data } = await api.get<{ packages: AIPackage[] }>("/v1/ai/credits/packages")
    return data
  },

  async getTransactions(
    limit = 20,
    offset = 0
  ): Promise<{ transactions: AITransaction[]; pagination: AITransactionsPagination }> {
    const { data } = await api.get<{
      transactions: AITransaction[]
      pagination: AITransactionsPagination
    }>("/v1/ai/credits/transactions", { params: { limit, offset } })
    return data
  },

  async check(messages = 1): Promise<AICreditsCheck> {
    const { data } = await api.get<AICreditsCheck>("/v1/ai/credits/check", {
      params: { messages },
    })
    return data
  },

  // ── Credit Requests (Bearer token) ──

  async createRequest(
    packageCode: string,
    paymentMethod: string,
    paymentProof?: File
  ): Promise<AICreditRequest> {
    const ref = `AI-REQ-${Date.now()}`
    const formData = buildOrgFormData({
      package_code: packageCode,
      payment_method: paymentMethod,
      payment_reference: ref,
      payment_proof: paymentProof,
    }, getStoredActiveOrgId())
    const { data } = await api.post<AICreditRequest>(
      "/v1/ai/credits/request",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
    return data
  },

  async listRequests(
    statusFilter?: CreditRequestStatus,
    limit = 20,
    offset = 0
  ): Promise<{ requests: AICreditRequest[]; pagination: AITransactionsPagination }> {
    const params: Record<string, string | number> = { limit, offset }
    if (statusFilter) params.status_filter = statusFilter
    const { data } = await api.get<{
      requests: AICreditRequest[]
      pagination: AITransactionsPagination
    }>(withOrgQuery("/v1/ai/credits/requests", getStoredActiveOrgId()), { params })
    return data
  },

  async getRequest(requestId: string): Promise<AICreditRequest> {
    const { data } = await api.get<AICreditRequest>(withOrgQuery(`/v1/ai/credits/requests/${requestId}`, getStoredActiveOrgId()))
    return data
  },

  async cancelRequest(requestId: string): Promise<{ success: boolean }> {
    const { data } = await api.delete<{ success: boolean }>(withOrgQuery(`/v1/ai/credits/requests/${requestId}`, getStoredActiveOrgId()))
    return data
  },
}
