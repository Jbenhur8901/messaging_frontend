"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FlowLogo } from "@/components/brand/flow-logo"
import { X, Download } from "lucide-react"
import {
  type BeforeInstallPromptEvent,
  isPwaDismissedRecently,
  isPwaStandalone,
  PWA_DISMISS_KEY,
  PWA_INSTALL_READY_EVENT,
} from "@/lib/pwa-install"

const SHOW_DELAY_MS = 2500

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleShow = useCallback(() => {
    if (showTimer.current) return
    if (!window.__flowDeferredInstallPrompt) return

    deferredPrompt.current = window.__flowDeferredInstallPrompt
    showTimer.current = setTimeout(() => {
      setVisible(true)
      showTimer.current = null
    }, SHOW_DELAY_MS)
  }, [])

  useEffect(() => {
    if (isPwaStandalone()) return
    if (isPwaDismissedRecently()) return

    if (window.__flowDeferredInstallPrompt) {
      scheduleShow()
    }

    const onReady = () => scheduleShow()

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      window.__flowDeferredInstallPrompt = event as BeforeInstallPromptEvent
      scheduleShow()
    }

    window.addEventListener(PWA_INSTALL_READY_EVENT, onReady)
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)

    return () => {
      window.removeEventListener(PWA_INSTALL_READY_EVENT, onReady)
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      if (showTimer.current) {
        clearTimeout(showTimer.current)
        showTimer.current = null
      }
    }
  }, [scheduleShow])

  const handleInstall = async () => {
    const prompt = deferredPrompt.current ?? window.__flowDeferredInstallPrompt
    if (!prompt) return

    setInstalling(true)
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    deferredPrompt.current = null
    window.__flowDeferredInstallPrompt = undefined

    if (outcome === "accepted") {
      setVisible(false)
    } else {
      setInstalling(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "110%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          role="dialog"
          aria-label="Installer Flow"
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:bottom-6 md:w-[380px]"
        >
          <div
            style={{
              background: "#121212",
              border: "1px solid rgba(255,204,0,0.18)",
              borderRadius: "16px",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px 16px 0",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "12px",
                  background: "#1A1A1A",
                  border: "1px solid #27272A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                  padding: "6px",
                }}
              >
                <FlowLogo size={28} priority className="max-w-full" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "Inter, ui-sans-serif, sans-serif",
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                  }}
                >
                  Installer Flow
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontFamily: "Inter, ui-sans-serif, sans-serif",
                    fontSize: "0.75rem",
                    color: "#A1A1AA",
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Accès rapide depuis votre écran d&apos;accueil
                </p>
              </div>

              <button
                onClick={handleDismiss}
                aria-label="Fermer"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "6px",
                  cursor: "pointer",
                  color: "#A1A1AA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "8px",
                  flexShrink: 0,
                  transition: "color 150ms, background 150ms",
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF"
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.06)"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "#A1A1AA"
                  ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "10px 16px" }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "Inter, ui-sans-serif, sans-serif",
                  fontSize: "0.8125rem",
                  color: "#A1A1AA",
                  lineHeight: 1.5,
                }}
              >
                Lancez vos campagnes WhatsApp sans ouvrir le navigateur. Fonctionne
                hors connexion.
              </p>
            </div>

            <div style={{ height: "1px", background: "#27272A", margin: "0 16px" }} />

            <div
              style={{
                display: "flex",
                gap: "8px",
                padding: "12px 16px 16px",
              }}
            >
              <button
                onClick={handleDismiss}
                style={{
                  flex: 1,
                  height: 38,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  fontFamily: "Inter, ui-sans-serif, sans-serif",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "#A1A1AA",
                  cursor: "pointer",
                  transition: "border-color 150ms, color 150ms",
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(255,255,255,0.2)"
                  ;(e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(255,255,255,0.1)"
                  ;(e.currentTarget as HTMLButtonElement).style.color = "#A1A1AA"
                }}
              >
                Plus tard
              </button>

              <button
                onClick={handleInstall}
                disabled={installing}
                style={{
                  flex: 2,
                  height: 38,
                  background: installing ? "#E6B800" : "#FFCC00",
                  border: "none",
                  borderRadius: "10px",
                  fontFamily: "Inter, ui-sans-serif, sans-serif",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#080808",
                  cursor: installing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "background 150ms, transform 80ms",
                  boxShadow: "0 6px 20px -10px rgba(255,204,0,0.65)",
                }}
                onMouseEnter={(e) => {
                  if (!installing)
                    (e.currentTarget as HTMLButtonElement).style.background = "#E6B800"
                }}
                onMouseLeave={(e) => {
                  if (!installing)
                    (e.currentTarget as HTMLButtonElement).style.background = "#FFCC00"
                }}
                onMouseDown={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)"
                }}
                onMouseUp={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"
                }}
              >
                {installing ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid #080808",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "flow-spin 0.7s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Installation…
                  </>
                ) : (
                  <>
                    <Download size={14} strokeWidth={2.5} />
                    Installer l&apos;app
                  </>
                )}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes flow-spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
