"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"
import { establishRecoverySession } from "@/lib/password-reset"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

type ResetState = "loading" | "ready" | "invalid"

export default function ResetPasswordPage() {
  const [state, setState] = useState<ResetState>("loading")

  useEffect(() => {
    let active = true

    async function init() {
      const hasSession = await establishRecoverySession()
      if (!active) return
      setState(hasSession ? "ready" : "invalid")
    }

    void init()
    return () => {
      active = false
    }
  }, [])

  if (state === "loading") {
    return (
      <Card className="w-full rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7 text-white shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)] backdrop-blur sm:p-9">
        <CardContent className="flex flex-col items-center gap-4 px-0 py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] text-white/60">Vérification du lien de réinitialisation…</p>
        </CardContent>
      </Card>
    )
  }

  if (state === "invalid") {
    return (
      <Card className="w-full rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7 text-white shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)] backdrop-blur sm:p-9">
        <CardContent className="space-y-4 px-0 pb-0 pt-0 text-center">
          <h1 className="text-[22px] font-extrabold tracking-tight">Lien invalide ou expiré</h1>
          <p className="text-[13px] leading-relaxed text-white/60">
            Ce lien de réinitialisation n&apos;est plus valide. Demandez un nouvel email pour
            changer votre mot de passe.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-0 pb-0 pt-7">
          <Button
            asChild
            className="h-11 w-full rounded-full bg-primary text-[13px] font-extrabold text-black shadow-[0_18px_52px_-28px_rgba(255,204,0,0.85)] hover:bg-primary/90"
          >
            <Link href="/auth/forgot-password">Demander un nouveau lien</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="h-11 w-full rounded-full text-[13px] text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            <Link href="/auth/login">Retour à la connexion</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return <ResetPasswordForm />
}
