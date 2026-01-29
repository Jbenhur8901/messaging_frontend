"use client"

import { useEffect, useRef } from "react"
import { ThemeProvider } from "next-themes"
import { useRouter } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuthStore } from "@/stores/auth-store"

interface ProvidersProps {
  children: React.ReactNode
}

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000
const LAST_ACTIVITY_KEY = "last_activity_at"

export function Providers({ children }: ProvidersProps) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const logout = useAuthStore((state) => state.logout)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isAuthenticated) {
      localStorage.removeItem(LAST_ACTIVITY_KEY)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const readLastActivity = () => {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY)
      const parsed = stored ? Number(stored) : NaN
      return Number.isFinite(parsed) ? parsed : Date.now()
    }

    const writeLastActivity = (timestamp: number) => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp))
      lastActivityRef.current = timestamp
    }

    const scheduleLogout = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      const last = readLastActivity()
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_MS - (Date.now() - last))
      timerRef.current = setTimeout(async () => {
        try {
          await logout()
        } finally {
          router.replace("/auth/login")
        }
      }, remaining)
    }

    const handleActivity = () => {
      const now = Date.now()
      if (now - lastActivityRef.current < 30_000) return
      writeLastActivity(now)
      scheduleLogout()
    }

    writeLastActivity(readLastActivity())
    scheduleLogout()

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ]
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }))
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        handleActivity()
      }
    }
    document.addEventListener("visibilitychange", visibilityHandler)

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity))
      document.removeEventListener("visibilitychange", visibilityHandler)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isAuthenticated, logout, router])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        {children}
        <Toaster position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
