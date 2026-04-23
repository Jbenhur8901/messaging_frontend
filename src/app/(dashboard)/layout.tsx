"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import axios from "axios"
import { useAuthStore, useCreditsStore, useOrganizationStore } from "@/stores"
import { Sidebar, Header, MobileNav } from "@/components/layout"
import { MFARecommendationDialog } from "@/components/mfa-recommendation-dialog"
import { Loader2 } from "lucide-react"
import { authStorage } from "@/lib/auth-storage"
import { organizationsService } from "@/services/organizations"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isEditorRoute = Boolean(pathname?.match(/^\/scenarios\/[^/]+$/))
  const {
    user,
    isAuthenticated,
    fetchProfile,
    isLoading,
    requiresMFAVerification,
    setUser,
    activeOrgId,
    setActiveOrgId,
    setOrganizations: setSessionOrganizations,
  } = useAuthStore()
  const { fetchBalance } = useCreditsStore()
  const { fetchOrganizations, setCurrentOrganization } = useOrganizationStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const authCheckStartedRef = useRef(false)

  const checkAuth = useCallback(async () => {
    if (authCheckStartedRef.current) return
    authCheckStartedRef.current = true
    setAuthError(null)

    // Check if we have a token
    const token = authStorage.getItem("access_token")
    const mfaRequired =
      typeof window !== "undefined" && sessionStorage.getItem("mfa_required") === "1"

    if (!token) {
      setAuthChecked(true)
      router.replace("/auth/login")
      return
    }

    // Check if MFA verification is pending (only if not already authenticated)
    if ((requiresMFAVerification || mfaRequired) && !isAuthenticated) {
      setAuthChecked(true)
      router.replace("/auth/verify-2fa")
      return
    }

    // If we have a token but no user, check storage first (avoids race with Zustand rehydration)
    let currentUser = user
    if (!currentUser) {
      const storedUserStr = authStorage.getItem("user")
      if (storedUserStr) {
        try {
          currentUser = JSON.parse(storedUserStr)
        } catch {
          // Invalid JSON in storage, will fetch from API below
        }
      }
    }

    if (!currentUser) {
      try {
        await fetchProfile()
        const storedUser = authStorage.getItem("user")
        currentUser = storedUser ? JSON.parse(storedUser) : null
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        if (status === 401 || status === 403) {
          authStorage.removeItem("access_token")
          authStorage.removeItem("refresh_token")
          authStorage.removeItem("user")
          router.replace("/auth/login")
          return
        }

        setAuthError("Impossible de vérifier votre session. Vérifiez votre connexion puis réessayez.")
        setAuthChecked(true)
        authCheckStartedRef.current = false
        return
      }
    }

    try {
      // Load organizations and decide if onboarding is required
      await fetchOrganizations()
      const orgState = useOrganizationStore.getState()
      const orgs = orgState.organizations
      setSessionOrganizations(orgs)

      if (orgs.length === 0) {
        setAuthChecked(true)
        router.replace("/onboarding")
        return
      }

      let activeOrganization = orgs.find((org) => org.id === activeOrgId) || orgs[0]

      if (!activeOrganization) {
        setAuthChecked(true)
        router.replace("/onboarding")
        return
      }

      await organizationsService.switchOrganization(activeOrganization.id)
      setActiveOrgId(activeOrganization.id)
      setCurrentOrganization(activeOrganization)

      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          organization_id: activeOrganization.id,
          organization_name: activeOrganization.name,
        }
        authStorage.setItem("user", JSON.stringify(updatedUser))
        setUser(updatedUser)
      }

      // User has organization, load balance without blocking the initial dashboard render.
      void fetchBalance()
      setIsReady(true)
      setAuthChecked(true)
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined

      if (status === 401) {
        authStorage.removeItem("access_token")
        authStorage.removeItem("refresh_token")
        authStorage.removeItem("user")
        setAuthChecked(true)
        router.replace("/auth/login")
        return
      }

      if (status === 403 || status === 404) {
        try {
          await fetchOrganizations()
          const refreshedOrgs = useOrganizationStore.getState().organizations
          setSessionOrganizations(refreshedOrgs)
          if (refreshedOrgs.length === 0) {
            setAuthChecked(true)
            router.replace("/onboarding")
            return
          }
          const activeOrganization = refreshedOrgs[0]
          await organizationsService.switchOrganization(activeOrganization.id)

          setActiveOrgId(activeOrganization.id)
          setCurrentOrganization(activeOrganization)

          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              organization_id: activeOrganization.id,
              organization_name: activeOrganization.name,
            }
            authStorage.setItem("user", JSON.stringify(updatedUser))
            setUser(updatedUser)
          }

          void fetchBalance()
          setIsReady(true)
          setAuthChecked(true)
          return
        } catch {
          setAuthChecked(true)
          router.replace("/onboarding")
          return
        }
      }

      setAuthError("Impossible de charger votre espace. Vérifiez votre connexion puis réessayez.")
      setAuthChecked(true)
      authCheckStartedRef.current = false
    }
  }, [user, fetchProfile, fetchBalance, router, requiresMFAVerification, isAuthenticated, fetchOrganizations, setCurrentOrganization, setUser, activeOrgId, setActiveOrgId, setSessionOrganizations])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("dashboard:sidebar-collapsed")
    if (stored === "1") {
      setIsSidebarCollapsed(true)
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        window.localStorage.setItem("dashboard:sidebar-collapsed", next ? "1" : "0")
      }
      return next
    })
  }, [])

  // Show loading while checking auth
  if (authError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] px-6">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-2xl">
          <p className="text-base font-semibold text-white">Chargement interrompu</p>
          <p className="mt-2 text-sm text-white/60">{authError}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAuthChecked(false)
                setIsReady(false)
                void checkAuth()
              }}
              className="rounded-full bg-[#E0D112] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#f2e73a]"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => router.replace("/auth/login")}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Reconnexion
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!authChecked || !isReady || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-white/40">Chargement...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated && !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-dashboard">
      <Sidebar collapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div
        className={
          isSidebarCollapsed
            ? "min-w-0 overflow-x-hidden transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:pl-[60px]"
            : "min-w-0 overflow-x-hidden transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:pl-[248px]"
        }
      >
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onSidebarToggle={toggleSidebar}
        />
        <main className={isEditorRoute ? "min-w-0" : "min-w-0 py-4"}>
          <div
            className={
              isEditorRoute ? "min-w-0" : "min-w-0 px-4 sm:px-5 lg:px-6"
            }
          >
            {children}
          </div>
        </main>
      </div>
      <MFARecommendationDialog />
    </div>
  )
}
