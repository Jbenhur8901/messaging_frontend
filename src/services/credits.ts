import { api } from "./api"
import type { CreditBalance, CreditTransaction, CreditUsage, Pagination } from "@/types"

export const creditsService = {
  async getBalance(): Promise<CreditBalance> {
    const { data } = await api.get<CreditBalance>("/v1/credits/balance")
    return data
  },

  async recharge(
    amount: number,
    paymentReference?: string,
    description?: string
  ): Promise<{
    success: boolean
    transaction_id: string
    credits_added: number
    new_balance: number
    description: string
  }> {
    const formData = new URLSearchParams()
    formData.append("amount", amount.toString())
    if (paymentReference) formData.append("payment_reference", paymentReference)
    if (description) formData.append("description", description)

    const { data } = await api.post("/v1/credits/recharge", formData)
    return data
  },

  async getHistory(
    limit = 20,
    offset = 0
  ): Promise<{ transactions: CreditTransaction[]; pagination: Pagination }> {
    const { data } = await api.get("/v1/credits/history", {
      params: { limit, offset },
    })
    return data
  },

  async getUsage(days = 30): Promise<CreditUsage> {
    const { data } = await api.get<CreditUsage>("/v1/credits/usage", {
      params: { days },
    })
    return data
  },
}
