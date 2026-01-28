import { create } from "zustand"
import type { CreditRequest, CreditRequestStatus, PaymentMethod, Pagination } from "@/types"
import { creditRequestsService } from "@/services/credit-requests"

interface CreditRequestsState {
  requests: CreditRequest[]
  pagination: Pagination | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchRequests: (status?: CreditRequestStatus, limit?: number, offset?: number) => Promise<void>
  createRequest: (amount: number, paymentMethod: PaymentMethod, paymentReference?: string) => Promise<void>
  cancelRequest: (id: string) => Promise<void>
  clearError: () => void
}

export const useCreditRequestsStore = create<CreditRequestsState>()((set, get) => ({
  requests: [],
  pagination: null,
  isLoading: false,
  error: null,

  fetchRequests: async (status, limit = 20, offset = 0) => {
    set({ isLoading: true, error: null })
    try {
      const response = await creditRequestsService.getRequests(status, limit, offset)
      set({
        requests: response.requests,
        pagination: response.pagination,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur lors du chargement des demandes",
        isLoading: false,
      })
    }
  },

  createRequest: async (amount, paymentMethod, paymentReference) => {
    set({ isLoading: true, error: null })
    try {
      await creditRequestsService.createRequest(amount, paymentMethod, paymentReference)
      // Refresh the list
      await get().fetchRequests()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur lors de la création de la demande",
        isLoading: false,
      })
      throw error
    }
  },

  cancelRequest: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await creditRequestsService.cancelRequest(id)
      // Refresh the list
      await get().fetchRequests()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur lors de l'annulation",
        isLoading: false,
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
