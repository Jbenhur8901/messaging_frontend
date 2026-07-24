"use client"

import { useRouter } from "next/navigation"
import { FilePdf, User, CaretRight } from "@phosphor-icons/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { PdfTemplateType } from "@/services/pdf-templates"

const TYPE_OPTIONS: {
  type: PdfTemplateType
  Icon: React.ElementType
  label: string
  description: string
}[] = [
  {
    type: "facturation",
    Icon: FilePdf,
    label: "Facturation",
    description: "Devis, facture, bon de commande, proforma… mise en page personnalisable (couleurs, logo, tableau, totaux).",
  },
  {
    type: "kyc",
    Icon: User,
    label: "Formulaire KYC",
    description: "Fiche d'identification client (identité, pièce d'identité, adresse, employeur). Mise en page fixe.",
  },
]

export function TemplateTypeDialog({
  agentId, open, onOpenChange,
}: {
  agentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()

  const handleSelect = (type: PdfTemplateType) => {
    onOpenChange(false)
    router.push(`/agents/${agentId}/devis/new?type=${type}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau modèle</DialogTitle>
          <DialogDescription>Quel type de document veux-tu créer ?</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {TYPE_OPTIONS.map(({ type, Icon, label, description }) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" weight="fill" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </div>
              <CaretRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" weight="bold" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
