"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { X, Download } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "flow-pwa-dismissed"
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) return

    // Don't show if recently dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      // Short delay so it doesn't feel intrusive on first load
      setTimeout(() => setVisible(true), 2500)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt.current) return
    setInstalling(true)
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    deferredPrompt.current = null
    if (outcome === "accepted") {
      setVisible(false)
    } else {
      setInstalling(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
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
            {/* Header */}
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
                }}
              >
                <Image
                  src="/icon-192.png"
                  alt="Flow"
                  width={40}
                  height={40}
                  style={{ objectFit: "contain" }}
                />
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

            {/* Body */}
            <div
              style={{
                padding: "10px 16px",
              }}
            >
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

            {/* Divider */}
            <div style={{ height: "1px", background: "#27272A", margin: "0 16px" }} />

            {/* Actions */}
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
            @media (prefers-reduced-motion: reduce) {
              .flow-pwa-banner * {
                animation: none !important;
                transition: none !important;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
