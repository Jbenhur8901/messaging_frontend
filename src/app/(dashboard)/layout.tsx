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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const authCheckStartedRef = useRef(false)

  const checkAuth = useCallback(async () => {
    if (authCheckStartedRef.current) return
    authCheckStartedRef.current = true

    // Check if we have a token
    const token = authStorage.getItem("access_token")
    const mfaRequired =
      typeof window !== "undefined" && sessionStorage.getItem("mfa_required") === "1"

    if (!token) {
      router.replace("/auth/login")
      return
    }

    // Check if MFA verification is pending (only if not already authenticated)
    if ((requiresMFAVerification || mfaRequired) && !isAuthenticated) {
      router.replace("/auth/verify-2fa")
      return
    }

    // If we have a token but no user, fetch the profile
    let currentUser = user
    if (!user) {
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

        authCheckStartedRef.current = false
        return
      }
    }

    // Load organizations and decide if onboarding is required
    await fetchOrganizations()
    const orgState = useOrganizationStore.getState()
    const orgs = orgState.organizations
    setSessionOrganizations(orgs)

    if (orgs.length === 0) {
      router.replace("/onboarding")
      return
    }

    let activeOrganization = orgs.find((org) => org.id === activeOrgId) || orgs[0]

    if (!activeOrganization) {
      router.replace("/onboarding")
      return
    }

    try {
      await organizationsService.switchOrganization(activeOrganization.id)
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      if (status === 403 || status === 404) {
        await fetchOrganizations()
        const refreshedOrgs = useOrganizationStore.getState().organizations
        setSessionOrganizations(refreshedOrgs)
        if (refreshedOrgs.length === 0) {
          router.replace("/onboarding")
          return
        }
        activeOrganization = refreshedOrgs[0]
        try {
          await organizationsService.switchOrganization(activeOrganization.id)
        } catch {
          router.replace("/onboarding")
          return
        }
      }
    }

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

    // User has organization, load balance
    fetchBalance()
    setIsReady(true)

    setAuthChecked(true)
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
  if (!authChecked || !isReady || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
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
      <div className={isSidebarCollapsed ? "transition-[padding] duration-200 lg:pl-[60px]" : "transition-[padding] duration-200 lg:pl-56"}>
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onSidebarToggle={toggleSidebar}
        />
        <main className={isEditorRoute ? "" : "py-4"}>
          <div className={isEditorRoute ? "animate-fade-in" : "animate-fade-in px-4 sm:px-5 lg:px-6"}>
            {children}
          </div>
        </main>
      </div>
      <MFARecommendationDialog />
    </div>
  )
}
