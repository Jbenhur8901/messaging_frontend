import { api, buildOrgFormData, getStoredActiveOrgId, withOrgQuery } from "./api"
import type { CreditRequest, CreditRequestStatus, PaymentMethod, Pagination } from "@/types"

export const creditRequestsService = {
  async createRequest(
    amount: number,
    paymentMethod: PaymentMethod,
    paymentReference?: string,
    paymentProof?: File
  ): Promise<{ success: boolean; request: CreditRequest }> {
    if (!paymentProof) {
      throw new Error("La preuve de paiement est obligatoire.")
    }
    const formData = buildOrgFormData({
      amount: amount.toString(),
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      payment_proof: paymentProof,
    }, getStoredActiveOrgId())
    const { data } = await api.post("/v1/credits/request", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },

  async getRequests(
    status?: CreditRequestStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ requests: CreditRequest[]; pagination: Pagination }> {
    const params = new URLSearchParams()
    params.append("limit", limit.toString())
    params.append("offset", offset.toString())
    if (status) {
      params.append("status", status)
    }
    const orgScopedUrl = withOrgQuery(`/v1/credits/requests?${params.toString()}`, getStoredActiveOrgId())
    const { data } = await api.get(orgScopedUrl)
    return data
  },

  async getRequest(id: string): Promise<CreditRequest> {
    const { data } = await api.get(withOrgQuery(`/v1/credits/requests/${id}`, getStoredActiveOrgId()))
    return data
  },

  async cancelRequest(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(withOrgQuery(`/v1/credits/requests/${id}`, getStoredActiveOrgId()))
    return data
  },
}
