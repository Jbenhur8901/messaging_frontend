"use client"

import { useEffect, useRef, useState } from "react"
import { Smartphone, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { whatsappService, handleApiError } from "@/services"

type MetaSession = { waba_id: string; phone_number_id: string }
type MetaLoginResponse = { authResponse?: { code?: string }; status?: string }

declare global {
  interface Window {
    fbAsyncInit?: () => void
    FB?: {
      init: (options: Record<string, unknown>) => void
      login: (
        callback: (response: MetaLoginResponse) => void,
        options: Record<string, unknown>
      ) => void
    }
  }
}

interface CoexistenceSignupButtonProps {
  onConnected: () => void | Promise<void>
}

export function CoexistenceSignupButton({ onConnected }: CoexistenceSignupButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)
  const sessionRef = useRef<MetaSession | null>(null)

  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return

      let payload = event.data
      if (typeof payload === "string") {
        try { payload = JSON.parse(payload) } catch { return }
      }
      if (payload?.type !== "WA_EMBEDDED_SIGNUP" || payload?.event !== "FINISH") return

      const { waba_id, phone_number_id } = payload.data || {}
      if (waba_id && phone_number_id) {
        sessionRef.current = { waba_id: String(waba_id), phone_number_id: String(phone_number_id) }
      }
    }

    window.addEventListener("message", receiveMessage)
    return () => window.removeEventListener("message", receiveMessage)
  }, [])

  const waitForSession = async (): Promise<MetaSession> => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (sessionRef.current) return sessionRef.current
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error("Meta n’a pas retourné les identifiants du numéro sélectionné.")
  }

  const loadFacebookSdk = (appId: string, version: string): Promise<void> => {
    if (window.FB) return Promise.resolve()
    return new Promise((resolve, reject) => {
      window.fbAsyncInit = () => {
        window.FB?.init({ appId, autoLogAppEvents: true, xfbml: true, version })
        resolve()
      }
      const existing = document.getElementById("facebook-jssdk")
      if (existing) {
        existing.addEventListener("load", () => {
          if (!window.FB) reject(new Error("Le SDK Meta n’est pas disponible."))
        }, { once: true })
        existing.addEventListener("error", () => reject(new Error("Impossible de charger le SDK Meta.")), { once: true })
        return
      }
      const script = document.createElement("script")
      script.id = "facebook-jssdk"
      script.src = "https://connect.facebook.net/fr_FR/sdk.js"
      script.async = true
      script.defer = true
      script.onerror = () => reject(new Error("Impossible de charger le SDK Meta."))
      document.head.appendChild(script)
    })
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    sessionRef.current = null
    try {
      const config = await whatsappService.getEmbeddedSignupConfig()
      if (!config.enabled || !config.app_id || !config.config_id) {
        setIsAvailable(false)
        throw new Error("La connexion Coexistence n’est pas encore configurée sur le serveur.")
      }
      await loadFacebookSdk(config.app_id, config.graph_api_version)

      const code = await new Promise<string>((resolve, reject) => {
        if (!window.FB) {
          reject(new Error("Le SDK Meta n’est pas disponible."))
          return
        }
        window.FB.login((response) => {
          const receivedCode = response.authResponse?.code
          if (receivedCode) resolve(receivedCode)
          else reject(new Error("Connexion Meta annulée ou non terminée."))
        }, {
          config_id: config.config_id,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            featureType: "whatsapp_business_app_onboarding",
            sessionInfoVersion: "3",
          },
        })
      })

      const session = await waitForSession()
      await whatsappService.completeEmbeddedSignup({ code, ...session })
      toast.success("Numéro existant connecté en mode Coexistence")
      await onConnected()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl bg-muted/35 p-3">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">Conserver l’app WhatsApp Business</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Connectez le numéro déjà utilisé sur votre téléphone, sans supprimer l’application.
          </p>
        </div>
      </div>
      <Button
        type="button"
        className="h-9 w-full rounded-lg text-[13px]"
        onClick={handleConnect}
        disabled={isConnecting || !isAvailable}
      >
        {isConnecting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {isConnecting ? "Connexion à Meta…" : "Connecter un numéro existant"}
      </Button>
      {!isAvailable && (
        <p className="text-[11px] text-destructive" role="alert">
          Embedded Signup doit être configuré par un administrateur.
        </p>
      )}
    </div>
  )
}
