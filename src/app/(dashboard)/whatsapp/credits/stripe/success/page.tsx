"use client"

import Link from "next/link"
import { CheckCircle } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

export default function StripeSuccessPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/12 ring-1 ring-emerald-500/25">
        <CheckCircle className="h-6 w-6 text-emerald-500" weight="fill" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Paiement Stripe confirmé</h1>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Votre recharge est en cours de synchronisation. Le wallet sera crédité dès confirmation finale.
      </p>
      <Button asChild className="mt-5 h-9 rounded-xl px-5 text-[13px]">
        <Link href="/whatsapp/credits">Retour aux crédits</Link>
      </Button>
    </div>
  )
}
