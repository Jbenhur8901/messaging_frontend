"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { establishAuthSessionFromUrl } from "@/lib/password-reset"
import { useAuthStore } from "@/stores"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

type CallbackState = "loading" | "success" | "invalid"

export default function AuthCallbackPage() {
  const router = useRouter()
  const { fetchProfile } = useAuthStore()
  const [state, setState] = useState<CallbackState>("loading")

  useEffect(() => {
    let active = true

    async function handleCallback() {
      const hasSession = await establishAuthSessionFromUrl()
      if (!active) return

      if (!hasSession) {
        setState("invalid")
        return
      }

      try {
        await fetchProfile()
        const { isAuthenticated } = useAuthStore.getState()
        if (!isAuthenticated) {
          setState("invalid")
          return
        }
        setState("success")
        toast.success("Email confirmé — bienvenue sur Flow")
        router.replace("/onboarding")
      } catch {
        setState("invalid")
      }
    }

    void handleCallback()
    return () => {
      active = false
    }
  }, [fetchProfile, router])

  if (state === "loading" || state === "success") {
    return (
      <Card className="w-full rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7 text-white shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)] backdrop-blur sm:p-9">
        <CardContent className="flex flex-col items-center gap-4 px-0 py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] text-white/60">
            {state === "success"
              ? "Redirection vers votre espace…"
              : "Confirmation de votre email en cours…"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7 text-white shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)] backdrop-blur sm:p-9">
      <CardContent className="space-y-4 px-0 pb-0 pt-0 text-center">
        <h1 className="text-[22px] font-extrabold tracking-tight">
          Lien invalide ou expiré
        </h1>
        <p className="text-[13px] leading-relaxed text-white/60">
          Ce lien de confirmation n&apos;est plus valide. Reconnectez-vous ou
          recommencez l&apos;inscription pour recevoir un nouvel email.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 px-0 pb-0 pt-7">
        <Button
          asChild
          className="h-11 w-full rounded-full bg-primary text-[13px] font-extrabold text-black shadow-[0_18px_52px_-28px_rgba(255,204,0,0.85)] hover:bg-primary/90"
        >
          <Link href="/auth/login">Aller à la connexion</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="h-11 w-full rounded-full text-[13px] text-white/60 hover:bg-white/[0.06] hover:text-white"
        >
          <Link href="/auth/register">Créer un compte</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
