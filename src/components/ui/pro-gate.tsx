"use client"

import { usePlan } from "@/hooks"
import { Button } from "./button"
import { Lock } from "lucide-react"
import Link from "next/link"

interface ProGateProps {
  children: React.ReactNode
  feature?: string
}

/**
 * Wraps Pro-only pages. Shows an upgrade wall if the org is not on Pro plan.
 */
export function ProGate({ children, feature }: ProGateProps) {
  const { isPro } = usePlan()

  if (isPro) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-6">
      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Lock className="size-7 text-primary" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-semibold">
          {feature ? `${feature} — ` : ""}Fonctionnalité Pro
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Cette fonctionnalité est disponible avec l'abonnement Pro à{" "}
          <span className="font-semibold text-foreground">$199/mois</span>.
          Accédez à tous les segments, automations, agents IA et génération de devis PDF.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button asChild>
          <Link href="/organization">Passer à Pro</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Retour au dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Inline badge shown on locked nav items or feature cards.
 */
export function ProBadge() {
  return (
    <span className="ml-auto text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
      PRO
    </span>
  )
}
