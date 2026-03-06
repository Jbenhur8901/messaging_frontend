import axios from "axios"
import { api, buildOrgFormData, getStoredActiveOrgId, withOrgQuery } from "./api"
import type { AICreditRequest, CreditRequestStatus } from "@/types"

const PAYMENT_PROOF_MAX_MB = 5
const PAYMENT_PROOF_MAX_BYTES = PAYMENT_PROOF_MAX_MB * 1024 * 1024
const ALLOWED_PAYMENT_PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

const assertValidPaymentProof = (file: File) => {
  if (!ALLOWED_PAYMENT_PROOF_TYPES.has(file.type)) {
    throw new Error("Format invalide. Utilisez JPEG, PNG ou WEBP.")
  }
  if (file.size > PAYMENT_PROOF_MAX_BYTES) {
    throw new Error(`Fichier trop volumineux. Taille max: ${PAYMENT_PROOF_MAX_MB} MB.`)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
  // ── Balance & Packages ──

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
    if (!paymentProof) {
      throw new Error("La preuve de paiement est obligatoire.")
    }
    assertValidPaymentProof(paymentProof)
    const ref = `AI-REQ-${Date.now()}`
    const buildPayload = () => buildOrgFormData({
      package_code: packageCode,
      payment_method: paymentMethod,
      payment_reference: ref,
      payment_proof: paymentProof,
    }, getStoredActiveOrgId())
    try {
      const { data } = await api.post<AICreditRequest>(
        "/v1/ai/credits/request",
        buildPayload(),
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      return data
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      if (status !== 502) throw error

      // One automatic retry on transient gateway errors (e.g., tunnel instability)
      const retryDelayMs = 500 + Math.floor(Math.random() * 501)
      await sleep(retryDelayMs)

      const { data } = await api.post<AICreditRequest>(
        "/v1/ai/credits/request",
        buildPayload(),
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      return data
    }
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
