"use client"

import { useEffect, useRef } from "react"
import { ThemeProvider } from "next-themes"
import { useRouter } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuthStore } from "@/stores/auth-store"
import { authStorage } from "@/lib/auth-storage"

interface ProvidersProps {
  children: React.ReactNode
  nonce?: string
}

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 60 * 1000
const LAST_ACTIVITY_KEY = "last_activity_at"
const SESSION_STARTED_KEY = "session_started_at"

export function Providers({ children, nonce }: ProvidersProps) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const logout = useAuthStore((state) => state.logout)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isAuthenticated) {
      localStorage.removeItem(LAST_ACTIVITY_KEY)
      authStorage.removeItem(SESSION_STARTED_KEY)
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

    const readSessionStarted = () => {
      const stored = authStorage.getItem(SESSION_STARTED_KEY)
      const parsed = stored ? Number(stored) : NaN
      return Number.isFinite(parsed) ? parsed : Date.now()
    }

    const writeSessionStarted = (timestamp: number) => {
      authStorage.setItem(SESSION_STARTED_KEY, String(timestamp))
    }

    const scheduleLogout = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      const last = readLastActivity()
      const started = readSessionStarted()
      const sessionRemaining = Math.max(0, INACTIVITY_TIMEOUT_MS - (Date.now() - started))
      const inactivityRemaining = Math.max(0, INACTIVITY_TIMEOUT_MS - (Date.now() - last))
      const remaining = Math.min(sessionRemaining, inactivityRemaining)
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

    const sessionStarted = readSessionStarted()
    if (!authStorage.getItem(SESSION_STARTED_KEY)) {
      writeSessionStarted(sessionStarted)
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
      nonce={nonce}
    >
      <TooltipProvider>
        {children}
        <Toaster position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
