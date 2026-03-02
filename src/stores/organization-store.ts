import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type {
  OrganizationInvitation,
  OrganizationMember,
  OrganizationRole,
  OrganizationSummary,
} from "@/types"
import { organizationsService } from "@/services/organizations"

let fetchOrganizationsPromise: Promise<void> | null = null

interface OrganizationState {
  currentOrganization: OrganizationSummary | null
  organizations: OrganizationSummary[]
  members: OrganizationMember[]
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentOrganization: (org: OrganizationSummary | null) => void
  fetchOrganizations: () => Promise<void>
  fetchMembers: () => Promise<void>
  inviteMember: (email: string, role: OrganizationRole) => Promise<OrganizationInvitation>
  updateMemberRole: (memberId: string, role: OrganizationRole) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  updateOrganization: (name: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      currentOrganization: null,
      organizations: [],
      members: [],
      isLoading: false,
      error: null,

      setCurrentOrganization: (org) => set({ currentOrganization: org }),

      fetchOrganizations: async () => {
        if (fetchOrganizationsPromise) {
          return fetchOrganizationsPromise
        }

        set({ isLoading: true, error: null })
        fetchOrganizationsPromise = (async () => {
          try {
            const response = await organizationsService.getOrganizations()
            const orgs = response.organizations
            const currentOrgId = get().currentOrganization?.id
            const nextCurrentOrganization = currentOrgId
              ? orgs.find((org) => org.id === currentOrgId) || null
              : null
            set({
              organizations: orgs,
              currentOrganization: nextCurrentOrganization,
              isLoading: false,
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Erreur lors du chargement des organisations",
              isLoading: false,
            })
            throw error
          } finally {
            fetchOrganizationsPromise = null
          }
        })()

        return fetchOrganizationsPromise
      },

      fetchMembers: async () => {
        const org = get().currentOrganization
        if (!org) return

        set({ isLoading: true, error: null })
        try {
          const response = await organizationsService.getMembers(org.id)
          set({ members: response.members, isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors du chargement des membres",
            isLoading: false,
          })
        }
      },

      inviteMember: async (email, role) => {
        const org = get().currentOrganization
        if (!org) throw new Error("Aucune organisation sélectionnée")

        set({ isLoading: true, error: null })
        try {
          const response = await organizationsService.inviteMember(org.id, email, role)
          // Refresh members list
          await get().fetchMembers()
          return response.invitation
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors de l'invitation",
            isLoading: false,
          })
          throw error
        }
      },

      updateMemberRole: async (memberId, role) => {
        const org = get().currentOrganization
        if (!org) throw new Error("Aucune organisation sélectionnée")

        set({ isLoading: true, error: null })
        try {
          await organizationsService.updateMemberRole(org.id, memberId, role)
          // Refresh members list
          await get().fetchMembers()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors de la modification du rôle",
            isLoading: false,
          })
          throw error
        }
      },

      removeMember: async (memberId) => {
        const org = get().currentOrganization
        if (!org) throw new Error("Aucune organisation sélectionnée")

        set({ isLoading: true, error: null })
        try {
          await organizationsService.removeMember(org.id, memberId)
          // Refresh members list
          await get().fetchMembers()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors de la suppression du membre",
            isLoading: false,
          })
          throw error
        }
      },

      updateOrganization: async (name) => {
        const org = get().currentOrganization
        if (!org) throw new Error("Aucune organisation sélectionnée")

        set({ isLoading: true, error: null })
        try {
          const response = await organizationsService.updateOrganization(org.id, name)
          set({
            currentOrganization: {
              ...org,
              name: response.organization.name,
            },
            isLoading: false,
          })
          // Refresh organizations list
          await get().fetchOrganizations()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors de la modification",
            isLoading: false,
          })
          throw error
        }
      },

      clearError: () => set({ error: null }),

      reset: () => set({
        currentOrganization: null,
        organizations: [],
        members: [],
        isLoading: false,
        error: null,
      }),
    }),
    {
      name: "organization-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
      }),
    }
  )
)
