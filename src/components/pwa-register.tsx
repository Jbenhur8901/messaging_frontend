"use client"

import { useEffect } from "react"
import {
  type BeforeInstallPromptEvent,
  PWA_INSTALL_READY_EVENT,
} from "@/lib/pwa-install"

export function PwaRegister() {
  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      window.__flowDeferredInstallPrompt = event as BeforeInstallPromptEvent
      window.dispatchEvent(new Event(PWA_INSTALL_READY_EVENT))
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
  }, [])

  return null
}
