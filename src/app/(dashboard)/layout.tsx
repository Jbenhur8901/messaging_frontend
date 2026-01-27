"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore, useCreditsStore } from "@/stores"
import { authService } from "@/services"
import { Sidebar, Header, MobileNav } from "@/components/layout"
import { MFARecommendationDialog } from "@/components/mfa-recommendation-dialog"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, fetchProfile, isLoading, requiresMFAVerification } = useAuthStore()
  const { fetchBalance } = useCreditsStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [apiKeyEnsured, setApiKeyEnsured] = useState(false)

  const checkAuth = useCallback(async () => {
    console.log("Dashboard checkAuth:", { requiresMFAVerification, isAuthenticated, user: !!user })

    // Check if we have a token
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    const mfaRequired =
      typeof window !== "undefined" && sessionStorage.getItem("mfa_required") === "1"

    if (!token) {
      router.replace("/auth/login")
      return
    }

    // Check if MFA verification is pending (only if not already authenticated)
    if ((requiresMFAVerification || mfaRequired) && !isAuthenticated) {
      console.log("MFA verification required, redirecting...")
      router.replace("/auth/verify-2fa")
      return
    }

    // If we have a token but no user, fetch the profile
    if (!user) {
      try {
        await fetchProfile()
        await fetchBalance()
        setIsReady(true)
      } catch {
        // Token is invalid, redirect to login
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user")
        router.replace("/auth/login")
        return
      }
    } else {
      // User already loaded
      fetchBalance()
      setIsReady(true)
    }

    if (typeof window !== "undefined" && !apiKeyEnsured) {
      const storedUser = localStorage.getItem("user")
      const hasKey = storedUser && JSON.parse(storedUser).api_key
      if (!hasKey) {
        try {
          const createdKey = await authService.createApiKey("Clé par défaut", "live")
          if (createdKey.success) {
            const updatedUser = user ? { ...user, api_key: createdKey.api_key, api_key_id: createdKey.key_id } : null
            if (updatedUser) {
              localStorage.setItem("user", JSON.stringify(updatedUser))
            }
          }
        } catch {
          // Ignore API key creation errors silently
        }
      }
      setApiKeyEnsured(true)
    }

    setAuthChecked(true)
  }, [user, fetchProfile, fetchBalance, router, requiresMFAVerification, isAuthenticated])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
      <MFARecommendationDialog />
    </div>
  )
}
