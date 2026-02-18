"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore, useCreditsStore, useOrganizationStore } from "@/stores"
import { authService } from "@/services"
import { Sidebar, Header, MobileNav } from "@/components/layout"
import { MFARecommendationDialog } from "@/components/mfa-recommendation-dialog"
import { Loader2 } from "lucide-react"
import { authStorage } from "@/lib/auth-storage"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isEditorRoute = Boolean(pathname?.match(/^\/scenarios\/[^/]+$/))
  const { user, isAuthenticated, fetchProfile, isLoading, requiresMFAVerification, setUser } = useAuthStore()
  const { fetchBalance } = useCreditsStore()
  const { fetchOrganizations, setCurrentOrganization } = useOrganizationStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [apiKeyEnsured, setApiKeyEnsured] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const checkAuth = useCallback(async () => {
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
      } catch {
        // Token is invalid, redirect to login
        authStorage.removeItem("access_token")
        authStorage.removeItem("refresh_token")
        authStorage.removeItem("user")
        router.replace("/auth/login")
        return
      }
    }

    // Load organizations and decide if onboarding is required
    await fetchOrganizations()
    const orgState = useOrganizationStore.getState()
    const orgs = orgState.organizations
    const currentOrg = orgState.currentOrganization

    if (orgs.length === 0 && currentUser && !currentUser.organization_id) {
      router.replace("/onboarding")
      return
    }

    if (orgs.length > 0) {
      const userOrg = currentUser?.organization_id
        ? orgs.find((org) => org.id === currentUser.organization_id)
        : null
      setCurrentOrganization(userOrg || orgs[0])
    }

    // User has organization, load balance
    fetchBalance()
    setIsReady(true)

    if (typeof window !== "undefined" && !apiKeyEnsured) {
      const storedUser = authStorage.getItem("user")
      const hasKey = storedUser && JSON.parse(storedUser).api_key
      if (!hasKey) {
        try {
          const createdKey = await authService.createApiKey("Clé par défaut", "live")
          if (createdKey.success) {
            const updatedUser = currentUser ? { ...currentUser, api_key: createdKey.api_key, api_key_id: createdKey.key_id } : null
            if (updatedUser) {
              authStorage.setItem("user", JSON.stringify(updatedUser))
              setUser(updatedUser)
            }
          }
        } catch {
          // Ignore API key creation errors silently
        }
      }
      setApiKeyEnsured(true)
    }

    setAuthChecked(true)
  }, [user, fetchProfile, fetchBalance, router, requiresMFAVerification, isAuthenticated, fetchOrganizations, setCurrentOrganization, apiKeyEnsured, setUser])

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
          <div className={isEditorRoute ? "animate-fade-in" : "px-4 sm:px-5 lg:px-6 animate-fade-in"}>
            {children}
          </div>
        </main>
      </div>
      <MFARecommendationDialog />
    </div>
  )
}
