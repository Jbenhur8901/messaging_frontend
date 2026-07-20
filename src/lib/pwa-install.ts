export const PWA_INSTALL_READY_EVENT = "flow-installprompt-ready"
export const PWA_DISMISS_KEY = "flow-pwa-dismissed"
export const PWA_DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
  interface Window {
    __flowDeferredInstallPrompt?: BeforeInstallPromptEvent
  }
}

export function isPwaStandalone() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isPwaDismissedRecently() {
  if (typeof window === "undefined") return false
  const dismissed = localStorage.getItem(PWA_DISMISS_KEY)
  if (!dismissed) return false
  return Date.now() - Number(dismissed) < PWA_DISMISS_DURATION_MS
}
