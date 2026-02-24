import { api } from "./api"
import type { CreditRequest, CreditRequestStatus, PaymentMethod, Pagination } from "@/types"

export const creditRequestsService = {
  async createRequest(
    amount: number,
    paymentMethod: PaymentMethod,
    paymentReference?: string,
    paymentProof?: File
  ): Promise<{ success: boolean; request: CreditRequest }> {
    const formData = new FormData()
    formData.append("amount", amount.toString())
    formData.append("payment_method", paymentMethod)
    if (paymentReference) {
      formData.append("payment_reference", paymentReference)
    }
    if (paymentProof) {
      formData.append("payment_proof", paymentProof)
    }
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
    const { data } = await api.get(`/v1/credits/requests?${params}`)
    return data
  },

  async getRequest(id: string): Promise<CreditRequest> {
    const { data } = await api.get(`/v1/credits/requests/${id}`)
    return data
  },

  async cancelRequest(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/v1/credits/requests/${id}`)
    return data
  },
}
