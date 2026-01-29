"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAdminStore } from "@/stores"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { Providers } from "@/components/providers"
import { Sheet, SheetContent } from "@/components/ui/sheet"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, fetchProfile } = useAdminStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [hasToken, setHasToken] = useState(false)

  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoginPage) {
        setIsChecking(false)
        return
      }

      // Check if admin token exists
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null
      if (!token) {
        router.push("/admin/login")
        return
      }
      setHasToken(true)

      try {
        await fetchProfile()
      } catch {
        // If profile endpoint is missing or fails, allow access with existing token
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [isLoginPage, fetchProfile, router])

  // Login page doesn't need the admin layout
  if (isLoginPage) {
    return <Providers>{children}</Providers>
  }

  if (isChecking) {
    return (
      <Providers>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </Providers>
    )
  }

  if (!isAuthenticated && !hasToken) {
    return null
  }

  return (
    <Providers>
      <div className="min-h-screen bg-background">
        <AdminSidebar />

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <AdminSidebar />
          </SheetContent>
        </Sheet>

        <div className="lg:pl-64">
          <AdminHeader onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </Providers>
  )
}
