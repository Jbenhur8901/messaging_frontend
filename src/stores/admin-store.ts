import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AdminUser, AdminDashboard, CreditRequest, CreditRequestStatus, Organization, Pagination } from "@/types"
import { adminService } from "@/services/admin"

interface AdminState {
  admin: AdminUser | null
  isAuthenticated: boolean
  dashboard: AdminDashboard | null
  creditRequests: CreditRequest[]
  creditRequestsPagination: Pagination | null
  organizations: Organization[]
  organizationsPagination: Pagination | null
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchProfile: () => Promise<void>
  fetchDashboard: () => Promise<void>
  fetchCreditRequests: (status?: CreditRequestStatus, limit?: number, offset?: number) => Promise<void>
  approveRequest: (id: string, note?: string) => Promise<void>
  rejectRequest: (id: string, note: string) => Promise<void>
  fetchOrganizations: (search?: string, limit?: number, offset?: number) => Promise<void>
  clearError: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      admin: null,
      isAuthenticated: false,
      dashboard: null,
      creditRequests: [],
      creditRequestsPagination: null,
      organizations: [],
      organizationsPagination: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await adminService.login(email, password)
          set({
            admin: response.admin,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur de connexion",
            isLoading: false,
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await adminService.logout()
        } finally {
          set({
            admin: null,
            isAuthenticated: false,
            dashboard: null,
            creditRequests: [],
            organizations: [],
            isLoading: false,
            error: null,
          })
        }
      },

      fetchProfile: async () => {
        set({ isLoading: true })
        try {
          const admin = await adminService.getProfile()
          set({ admin, isAuthenticated: true, isLoading: false })
        } catch {
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      fetchDashboard: async () => {
        set({ isLoading: true, error: null })
        try {
          const dashboard = await adminService.getDashboard()
          set({ dashboard, isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors du chargement du dashboard",
            isLoading: false,
          })
        }
      },

      fetchCreditRequests: async (status, limit = 50, offset = 0) => {
        set({ isLoading: true, error: null })
        try {
          const response = await adminService.getCreditRequests(status, limit, offset)
          set({
            creditRequests: response.requests,
            creditRequestsPagination: response.pagination,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors du chargement des demandes",
            isLoading: false,
          })
        }
      },

      approveRequest: async (id, note) => {
        set({ isLoading: true, error: null })
        try {
          await adminService.approveCreditRequest(id, note)
          // Refresh lists
          await get().fetchCreditRequests()
          await get().fetchDashboard()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors de l'approbation",
            isLoading: false,
          })
          throw error
        }
      },

      rejectRequest: async (id, note) => {
        set({ isLoading: true, error: null })
        try {
          await adminService.rejectCreditRequest(id, note)
          // Refresh lists
          await get().fetchCreditRequests()
          await get().fetchDashboard()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors du rejet",
            isLoading: false,
          })
          throw error
        }
      },

      fetchOrganizations: async (search, limit = 50, offset = 0) => {
        set({ isLoading: true, error: null })
        try {
          const response = await adminService.getOrganizations(search, limit, offset)
          set({
            organizations: response.organizations,
            organizationsPagination: response.pagination,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors du chargement des organisations",
            isLoading: false,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "admin-storage",
      partialize: (state) => ({
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
