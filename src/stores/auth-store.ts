import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import axios from "axios"
import type { OrganizationSummary, User, AuthResponse } from "@/types"
import { authService } from "@/services/auth"
import { authStorage } from "@/lib/auth-storage"
import {
  clearAllInvitationTokens,
  markInvitationAccepted,
  resolveInvitationToken,
  savePersistentInvitationToken,
  setPendingInvitationToken,
} from "@/lib/invitation-auth"
import { clearAllCachedContacts } from "@/lib/contacts-cache"
import { useContactsStore } from "./contacts-store"
import { useConversationsStore } from "./conversations-store"
import { useCreditsStore } from "./credits-store"
import { useCreditRequestsStore } from "./credit-requests-store"
import { useOrganizationStore } from "./organization-store"

const sanitizeUser = (user: User | null): User | null => {
  if (!user) return null
  const { api_key: _apiKey, ...rest } = user as User & { api_key?: unknown }
  return rest as User
}

async function syncInvitationAcceptance(
  response: AuthResponse,
  set: (partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>)) => void,
): Promise<boolean> {
  if (!response.invitation_acceptance?.success) return false

  markInvitationAccepted()
  clearAllInvitationTokens()
  await syncSessionOrganizations(response, set)
  return true
}

async function syncSessionOrganizations(
  response: AuthResponse,
  set: (partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>)) => void,
): Promise<string | null> {
  try {
    await useOrganizationStore.getState().fetchOrganizations()
  } catch {
    // Keep going with whatever org data is already available.
  }

  const orgs = useOrganizationStore.getState().organizations
  const preferredOrgId =
    response.invitation_acceptance?.organization_id ||
    response.user?.organization_id ||
    useOrganizationStore.getState().currentOrganization?.id ||
    null

  const activeOrganization =
    (preferredOrgId ? orgs.find((org) => org.id === preferredOrgId) : null) ||
    orgs[0] ||
    null

  if (activeOrganization) {
    useOrganizationStore.getState().setCurrentOrganization(activeOrganization)
    set({ organizations: orgs, activeOrgId: activeOrganization.id })
    return activeOrganization.id
  }

  set({ organizations: orgs, activeOrgId: null })
  return null
}

interface AuthState {
  user: User | null
  apiKey: string | null
  organizations: OrganizationSummary[]
  activeOrgId: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  showMFARecommendation: boolean
  requiresMFAVerification: boolean
  mfaPreAuthToken: string | null

  // Actions
  setUser: (user: User | null) => void
  setApiKey: (apiKey: string | null) => void
  setOrganizations: (organizations: OrganizationSummary[]) => void
  setActiveOrgId: (activeOrgId: string | null) => void
  setShowMFARecommendation: (show: boolean) => void
  setRequiresMFAVerification: (requires: boolean, preAuthToken?: string) => void
  completeMFA: () => void
  login: (
    email: string,
    password: string,
    options?: { invitationToken?: string },
  ) => Promise<{ requiresMFA: boolean; invitationAccepted?: boolean }>
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    organizationName?: string,
    options?: { invitationToken?: string },
  ) => Promise<{
    emailVerified: boolean
    isAuthenticated: boolean
    invitationAccepted?: boolean
  }>
  logout: () => Promise<void>
  fetchProfile: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      apiKey: null,
      organizations: [],
      activeOrgId: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      showMFARecommendation: false,
      requiresMFAVerification: false,
      mfaPreAuthToken: null,

      setUser: (user) => {
        const safeUser = sanitizeUser(user)
        set({ user: safeUser, isAuthenticated: !!safeUser })
      },

      setApiKey: (apiKey) => set({ apiKey }),

      setOrganizations: (organizations) => set({ organizations }),

      setActiveOrgId: (activeOrgId) => set({ activeOrgId }),

      setShowMFARecommendation: (show) => set({ showMFARecommendation: show }),

      setRequiresMFAVerification: (requires, preAuthToken) => set((state) => {
        const newIsAuthenticated = requires ? state.isAuthenticated : !!state.user
        if (typeof window !== "undefined") {
          if (requires) {
            sessionStorage.setItem("mfa_required", "1")
            if (preAuthToken) {
              sessionStorage.setItem("mfa_pre_auth_token", preAuthToken)
            }
          } else {
            sessionStorage.removeItem("mfa_required")
            sessionStorage.removeItem("mfa_pre_auth_token")
          }
        }
        return {
          requiresMFAVerification: requires,
          mfaPreAuthToken: preAuthToken || null,
          // When MFA verification is complete (requires=false), set authenticated if user exists
          isAuthenticated: newIsAuthenticated,
        }
      }),

      completeMFA: () => set((state) => {
        const storedUser = authService.getStoredUser()
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("mfa_required")
          sessionStorage.removeItem("mfa_pre_auth_token")
        }
        return {
          requiresMFAVerification: false,
          mfaPreAuthToken: null,
          isAuthenticated: true,
          user: state.user || storedUser,
        }
      }),

      login: async (email, password, options) => {
        set({ isLoading: true, error: null })
        try {
          const invitationToken = resolveInvitationToken(options?.invitationToken)
          const response = await authService.signin(email, password, {
            invitationToken,
          })
          const effectiveUser = sanitizeUser(response.user)

          if (response.mfa_required) {
            if (invitationToken) {
              setPendingInvitationToken(invitationToken)
              savePersistentInvitationToken(invitationToken)
            }
            set({
              isLoading: false,
              requiresMFAVerification: true,
              mfaPreAuthToken: response.pre_auth_token || null,
              user: sanitizeUser(effectiveUser),
              apiKey: null,
            })
            if (typeof window !== "undefined") {
              sessionStorage.setItem("mfa_required", "1")
              if (response.pre_auth_token) {
                sessionStorage.setItem("mfa_pre_auth_token", response.pre_auth_token)
              }
            }
            return { requiresMFA: true }
          }

          const showMFARecommendation = response.user.is_first_login && !response.user.mfa_enabled
          const invitationAccepted = await syncInvitationAcceptance(response, set)
          const activeOrgId = invitationAccepted
            ? useOrganizationStore.getState().currentOrganization?.id || null
            : await syncSessionOrganizations(response, set)

          if (typeof window !== "undefined") {
            try { localStorage.removeItem("organization-storage") } catch {}
          }

          if (invitationAccepted) {
            clearAllInvitationTokens()
          }

          set({
            user: sanitizeUser(effectiveUser),
            apiKey: null,
            organizations: useOrganizationStore.getState().organizations,
            activeOrgId,
            isAuthenticated: true,
            isLoading: false,
            showMFARecommendation,
          })

          return { requiresMFA: false, invitationAccepted }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur de connexion",
            isLoading: false,
          })
          throw error
        }
      },

      signup: async (email, password, firstName, lastName, organizationName, options) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authService.signup(
            email,
            password,
            firstName,
            lastName,
            organizationName || "",
            { invitationToken: options?.invitationToken },
          )

          const safeUser = sanitizeUser({ ...response.user, is_first_login: true })
          const isAuthenticated = !!response.session
          const invitationAccepted = isAuthenticated
            ? await syncInvitationAcceptance(response, set)
            : false
          const activeOrgId = isAuthenticated
            ? invitationAccepted
              ? useOrganizationStore.getState().currentOrganization?.id || null
              : await syncSessionOrganizations(response, set)
            : null

          if (!isAuthenticated && options?.invitationToken && typeof window !== "undefined") {
            savePersistentInvitationToken(options.invitationToken)
          }

          if (!isAuthenticated && typeof window !== "undefined") {
            authStorage.removeItem("access_token")
            authStorage.removeItem("refresh_token")
            authStorage.removeItem("user")
            authStorage.removeItem("auth-storage")
            sessionStorage.removeItem("mfa_required")
            sessionStorage.removeItem("mfa_pre_auth_token")
            try { localStorage.removeItem("organization-storage") } catch {}
          }

          set({
            user: isAuthenticated ? safeUser : null,
            apiKey: null,
            organizations: isAuthenticated ? useOrganizationStore.getState().organizations : [],
            activeOrgId,
            isAuthenticated,
            isLoading: false,
            showMFARecommendation: isAuthenticated && !response.user.mfa_enabled,
          })

          return {
            emailVerified: !!response.user.email_verified,
            isAuthenticated,
            invitationAccepted,
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Erreur d'inscription",
            isLoading: false,
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await authService.signout()
        } finally {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("mfa_required")
            sessionStorage.removeItem("mfa_pre_auth_token")
            clearAllInvitationTokens()
            try { localStorage.removeItem("organization-storage") } catch {}
          }
          clearAllCachedContacts()
          // Reset all stores to prevent data leakage between accounts
          useContactsStore.getState().reset()
          useConversationsStore.getState().reset()
          useCreditsStore.getState().reset()
          useCreditRequestsStore.getState().reset()
          useOrganizationStore.getState().reset()
          set({
            user: null,
            apiKey: null,
            organizations: [],
            activeOrgId: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
          if (typeof window !== "undefined") {
            window.location.replace("/auth/login")
          }
        }
      },

      fetchProfile: async () => {
        set({ isLoading: true })
        try {
          const user = await authService.getProfile()
          set({ user: sanitizeUser(user), isAuthenticated: true, isLoading: false })
        } catch (error) {
          const status = axios.isAxiosError(error) ? error.response?.status : undefined
          if (status === 401 || status === 403) {
            set({
              user: null,
              organizations: [],
              activeOrgId: null,
              isAuthenticated: false,
              isLoading: false,
            })
            return
          }
          set({
            error: error instanceof Error ? error.message : "Erreur lors du chargement du profil",
            isLoading: false,
          })
          throw error
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({
        user: state.user,
        organizations: state.organizations,
        activeOrgId: state.activeOrgId,
        isAuthenticated: state.isAuthenticated,
        // Don't persist MFA verification state - it's only for current session
      }),
    }
  )
)
