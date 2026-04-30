"use client"

import Link from "next/link"
import { XCircle } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

export default function StripeCancelPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/12 ring-1 ring-amber-500/25">
        <XCircle className="h-6 w-6 text-amber-500" weight="fill" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Paiement annulé</h1>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Aucun débit n&apos;a été confirmé. Vous pouvez relancer la recharge quand vous voulez.
      </p>
      <Button asChild className="mt-5 h-9 rounded-xl px-5 text-[13px]">
        <Link href="/whatsapp/credits">Retour aux crédits</Link>
      </Button>
    </div>
  )
}
