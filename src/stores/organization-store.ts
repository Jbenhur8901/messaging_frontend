import { create } from "zustand"
import type { Organization, OrganizationMember, OrganizationRole } from "@/types"
import { organizationsService } from "@/services/organizations"

interface OrganizationState {
  currentOrganization: Organization | null
  organizations: (Organization & { role: OrganizationRole; joined_at: string })[]
  members: OrganizationMember[]
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentOrganization: (org: Organization | null) => void
  fetchOrganizations: () => Promise<void>
  fetchMembers: () => Promise<void>
  inviteMember: (email: string, role: OrganizationRole) => Promise<void>
  updateMemberRole: (memberId: string, role: OrganizationRole) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  updateOrganization: (name: string) => Promise<void>
  clearError: () => void
}

export const useOrganizationStore = create<OrganizationState>()(
    (set, get) => ({
      currentOrganization: null,
      organizations: [],
      members: [],
      isLoading: false,
      error: null,

      setCurrentOrganization: (org) => set({ currentOrganization: org }),

      fetchOrganizations: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await organizationsService.getOrganizations()
          const orgs = response.organizations
          set({ organizations: orgs, isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur lors du chargement des organisations",
            isLoading: false,
          })
        }
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
          await organizationsService.inviteMember(org.id, email, role)
          // Refresh members list
          await get().fetchMembers()
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
            currentOrganization: response.organization,
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
    })
)
