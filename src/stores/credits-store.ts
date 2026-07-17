import { create } from "zustand"
import type { CreditBalance, CreditUsage, WhatsAppCreditBalance } from "@/types"
import { creditsService } from "@/services/credits"
import { whatsappService } from "@/services/whatsapp"

let fetchBalancePromise: Promise<void> | null = null

interface CreditsState {
  balance: CreditBalance | null
  walletBalance: WhatsAppCreditBalance | null
  walletTotal: number
  usage: CreditUsage | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchBalance: () => Promise<void>
  fetchWalletBalance: () => Promise<void>
  fetchUsage: (days?: number) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useCreditsStore = create<CreditsState>((set) => ({
  balance: null,
  walletBalance: null,
  walletTotal: 0,
  usage: null,
  isLoading: false,
  error: null,

  fetchBalance: async () => {
    if (fetchBalancePromise) {
      return fetchBalancePromise
    }

    set({ isLoading: true, error: null })
    fetchBalancePromise = (async () => {
      try {
        const [balance, wallet] = await Promise.all([
          creditsService.getBalance().catch(() => null),
          whatsappService.getWhatsAppBalance().catch(() => null),
        ])
        const walletTotal = wallet
          ? (wallet.marketing?.available ?? 0) + (wallet.utility?.available ?? 0) + (wallet.authentication?.available ?? 0) + (wallet.free?.available ?? 0)
          : 0
        set({ balance, walletBalance: wallet, walletTotal, isLoading: false })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Erreur de chargement",
          isLoading: false,
        })
      } finally {
        fetchBalancePromise = null
      }
    })()

    return fetchBalancePromise
  },

  fetchWalletBalance: async () => {
    try {
      const wallet = await whatsappService.getWhatsAppBalance()
      const walletTotal = wallet.marketing.available + wallet.utility.available + wallet.authentication.available + wallet.free.available
      set({ walletBalance: wallet, walletTotal })
    } catch {
      // silent
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

  reset: () => set({
    balance: null,
    walletBalance: null,
    walletTotal: 0,
    usage: null,
    isLoading: false,
    error: null,
  }),
}))
