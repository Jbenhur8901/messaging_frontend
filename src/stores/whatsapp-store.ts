import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { WhatsAppConfig, WhatsAppTemplate } from "@/types"
import { whatsappService } from "@/services/whatsapp"
import { useOrganizationStore } from "@/stores/organization-store"

interface WhatsAppState {
  config: WhatsAppConfig | null
  isConfigured: boolean
  templates: WhatsAppTemplate[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchConfig: () => Promise<void>
  setConfig: (config: {
    access_token: string
    phone_number_id: string
    business_account_id: string
    enabled: boolean
  }) => Promise<{ success: boolean; message?: string; config?: WhatsAppConfig | null }>
  testConfig: () => Promise<{ success: boolean; message: string; phone_number?: string }>
  syncTemplates: () => Promise<{ success: boolean; synced: number; message: string }>
  fetchTemplates: () => Promise<void>
  clearError: () => void
}

export const useWhatsAppStore = create<WhatsAppState>()(
  persist(
    (set, get) => ({
      config: null,
      isConfigured: false,
      templates: [],
      isLoading: false,
      error: null,

      fetchConfig: async () => {
        set({ isLoading: true, error: null })
        try {
          const orgId = useOrganizationStore.getState().currentOrganization?.id
          if (!orgId) throw new Error("Aucune organisation sélectionnée")
          const result = await whatsappService.getConfig(orgId)
          set({
            config: result.config,
            isConfigured: result.is_configured,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors de la récupération de la configuration",
            isLoading: false,
          })
        }
      },

      setConfig: async (config) => {
        set({ isLoading: true, error: null })
        try {
          const orgId = useOrganizationStore.getState().currentOrganization?.id
          if (!orgId) throw new Error("Aucune organisation sélectionnée")
          const result = await whatsappService.setConfig(orgId, config)
          if (result.success) {
            set({
              config: {
                ...config,
                is_configured: true,
              },
              isConfigured: true,
              isLoading: false,
            })
          }
          return result
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erreur lors de la sauvegarde"
          set({ error: message, isLoading: false })
          return { success: false, message, config: null }
        }
      },

      testConfig: async () => {
        set({ isLoading: true, error: null })
        try {
          const orgId = useOrganizationStore.getState().currentOrganization?.id
          if (!orgId) throw new Error("Aucune organisation sélectionnée")
          const result = await whatsappService.testConfig(orgId)
          set({ isLoading: false })
          return result
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erreur lors du test"
          set({ error: message, isLoading: false })
          return { success: false, message }
        }
      },

      syncTemplates: async () => {
        set({ isLoading: true, error: null })
        try {
          const result = await whatsappService.syncTemplates()
          if (result.success) {
            // Refresh templates after sync
            await get().fetchTemplates()
          }
          set({ isLoading: false })
          return result
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erreur lors de la synchronisation"
          set({ error: message, isLoading: false })
          return { success: false, synced: 0, message }
        }
      },

      fetchTemplates: async () => {
        set({ isLoading: true, error: null })
        try {
          const result = await whatsappService.getTemplates()
          set({
            templates: result.templates || [],
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors de la récupération des templates",
            isLoading: false,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "whatsapp-storage",
      partialize: (state) => ({
        isConfigured: state.isConfigured,
        // Don't persist config (contains sensitive tokens)
        // Don't persist templates (can be large and should be fresh)
      }),
    }
  )
)
