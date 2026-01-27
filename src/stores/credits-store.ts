import { create } from "zustand"
import type { CreditBalance, CreditUsage } from "@/types"
import { creditsService } from "@/services/credits"

interface CreditsState {
  balance: CreditBalance | null
  usage: CreditUsage | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchBalance: () => Promise<void>
  fetchUsage: (days?: number) => Promise<void>
  clearError: () => void
}

export const useCreditsStore = create<CreditsState>((set) => ({
  balance: null,
  usage: null,
  isLoading: false,
  error: null,

  fetchBalance: async () => {
    set({ isLoading: true, error: null })
    try {
      const balance = await creditsService.getBalance()
      set({ balance, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur de chargement",
        isLoading: false,
      })
    }
  },

  fetchUsage: async (days = 30) => {
    set({ isLoading: true, error: null })
    try {
      const usage = await creditsService.getUsage(days)
      set({ usage, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur de chargement",
        isLoading: false,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
