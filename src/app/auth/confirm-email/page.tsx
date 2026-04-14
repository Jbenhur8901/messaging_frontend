"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MailCheck } from "lucide-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")?.trim()

  return (
    <Card className="w-full border-0 bg-transparent p-0 shadow-none">
      <CardHeader className="space-y-4 p-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E0D112]/20 bg-[#E0D112]/10 text-[#E0D112]">
          <MailCheck className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-[22px] font-bold tracking-tight text-white">
            Confirmez votre adresse email
          </h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Un email de confirmation vient d&apos;être envoyé
            {email ? <> à <span className="font-semibold text-white">{email}</span></> : null}.
            Ouvrez-le puis cliquez sur le lien pour activer votre compte.
          </p>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0 pt-7">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[13px] leading-relaxed text-white/70">
          Pensez à vérifier vos spams ou courriers indésirables si vous ne voyez pas le message dans les prochaines minutes.
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 px-0 pb-0 pt-7">
        <Button
          asChild
          className="h-11 w-full rounded-xl bg-[#E0D112] text-[13px] font-bold text-black shadow-lg shadow-[#E0D112]/15 hover:bg-[#E0D112]/90"
        >
          <Link href="/auth/login">Aller à la connexion</Link>
        </Button>

        <p className="text-center text-[13px] text-muted-foreground">
          Pas reçu d&apos;email ?{" "}
          <Link
            href="/auth/register"
            className="font-bold text-[#E0D112] transition-colors hover:text-[#E0D112]/80 hover:underline"
          >
            Recommencer l&apos;inscription
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
