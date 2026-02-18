"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { WhatsAppTemplateCard } from "@/components/whatsapp/whatsapp-template-card"
import type { WhatsAppTemplate, PreSendCheck } from "@/types"
import {
  Loader2,
  Send,
  Wallet,
  CircleCheck,
  CircleX,
} from "lucide-react"

interface CostEstimation {
  rate: number
  totalCost: number
  recipientCount: number
  category: string
}

interface CampaignSummaryProps {
  selectedTemplate: WhatsAppTemplate | undefined
  campaignName: string
  sendMode: "standard" | "personalized"
  recipientCount: number
  costEstimation: CostEstimation | null
  creditCheck: PreSendCheck | null
  creditCheckLoading: boolean
  contactsLimitReached: boolean
  tagContactsLimitReached: boolean
  isSending: boolean
  canSend: boolean
  onSend: () => void
  onRechargeWallet: () => void
}

export function CampaignSummary({
  selectedTemplate,
  campaignName,
  sendMode,
  recipientCount,
  costEstimation,
  creditCheck,
  creditCheckLoading,
  contactsLimitReached,
  tagContactsLimitReached,
  isSending,
  canSend,
  onSend,
  onRechargeWallet,
}: CampaignSummaryProps) {
  return (
    <div className="space-y-4">
      {selectedTemplate && (
        <Card className="border-transparent">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-[14px] font-semibold tracking-tight">Aperçu du template</h2>
            <WhatsAppTemplateCard template={selectedTemplate} />
          </CardContent>
        </Card>
      )}

      <Card className="border-transparent">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-[14px] font-semibold tracking-tight">Résumé</h2>

          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">Campagne</span>
            <span className="font-medium truncate ml-4">
              {campaignName || <span className="text-muted-foreground/60 italic">Non nommée</span>}
            </span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">Template</span>
            <span className="font-medium">
              {selectedTemplate?.name || "Non sélectionné"}
            </span>
          </div>
          <div className="flex justify-between text-[13px] items-center">
            <span className="text-muted-foreground">Mode d&apos;envoi</span>
            <Badge variant={sendMode === "personalized" ? "default" : "secondary"} className="text-[11px]">
              {sendMode === "personalized" ? "Personnalisé" : "Standard"}
            </Badge>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">Langue</span>
            <span className="font-medium">
              {selectedTemplate?.language || "-"}
            </span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">Destinataires</span>
            <span className="font-medium">{recipientCount}</span>
          </div>

          {(contactsLimitReached || tagContactsLimitReached) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Limite 10&nbsp;000 : l&apos;envoi est restreint aux 10&nbsp;000 premiers destinataires chargés.
            </div>
          )}

          {costEstimation && (
            <div className="border-t border-border/40 pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" />
                Estimation du coût
              </div>

              <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Catégorie</span>
                  <Badge variant="outline" className="text-xs">
                    {costEstimation.category}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarif unitaire</span>
                  <span>{costEstimation.rate} FCFA / msg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {costEstimation.recipientCount} message{costEstimation.recipientCount > 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold text-base">
                    {costEstimation.totalCost.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              </div>

              {/* Credit status indicator */}
              {creditCheckLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Vérification du solde...
                </div>
              )}

              {!creditCheckLoading && creditCheck && (
                creditCheck.can_send ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                    <CircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400">Solde suffisant</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">
                      <CircleX className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                      <span className="text-[12px] font-medium text-red-700 dark:text-red-400">Solde insuffisant</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={onRechargeWallet}
                    >
                      <Wallet className="mr-1.5 h-3 w-3" />
                      Recharger le wallet
                    </Button>
                  </div>
                )
              )}
            </div>
          )}

          <div className="border-t border-border/40 pt-4">
            <Button
              className="w-full h-9 text-[13px] rounded-lg gap-2"
              onClick={onSend}
              disabled={!canSend}
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Envoyer la campagne
              {costEstimation && (
                <span className="text-[11px] opacity-75">
                  ({costEstimation.totalCost.toLocaleString("fr-FR")} FCFA)
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
