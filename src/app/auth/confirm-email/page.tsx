"use client"

import Link from "next/link"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { MailCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

function ConfirmEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")?.trim()

  return (
    <Card className="w-full rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7 text-white shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)] backdrop-blur sm:p-9">
      <CardContent className="space-y-5 px-0 pb-0 pt-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <MailCheck className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-[22px] font-extrabold tracking-tight">
            Confirmez votre adresse email
          </h1>
          <p className="text-[13px] leading-relaxed text-white/60">
            Un email de confirmation vient d&apos;être envoyé
            {email ? (
              <>
                {" "}
                à <span className="font-semibold text-white">{email}</span>
              </>
            ) : null}
            . Ouvrez-le puis cliquez sur le lien pour activer votre compte.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[13px] leading-relaxed text-white/70">
          Pensez à vérifier vos spams ou courriers indésirables si vous ne voyez
          pas le message dans les prochaines minutes.
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 px-0 pb-0 pt-7">
        <Button
          asChild
          className="h-11 w-full rounded-full bg-primary text-[13px] font-extrabold text-black shadow-[0_18px_52px_-28px_rgba(255,204,0,0.85)] hover:bg-primary/90"
        >
          <Link href="/auth/login">Aller à la connexion</Link>
        </Button>

        <p className="text-center text-[13px] text-white/60">
          Pas reçu d&apos;email ?{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-primary hover:underline"
          >
            Recommencer l&apos;inscription
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailContent />
    </Suspense>
  )
}
