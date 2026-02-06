"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { whatsappService, handleApiError } from "@/services"
import type { WhatsAppBroadcast } from "@/types"
import { formatNumber, formatDate } from "@/lib/utils"
import { ChannelTabs } from "@/components/channel-tabs"
import { BroadcastStatusBadge } from "@/components/whatsapp/whatsapp-status-badge"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Eye, RefreshCw, MessageSquareMore, AlertTriangle, Settings } from "lucide-react"

export default function WhatsAppCampaignsPage() {
  const { currentOrganization } = useOrganizationStore()
  const [broadcasts, setBroadcasts] = useState<WhatsAppBroadcast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    if (!currentOrganization?.id) {
      setIsConfigured(false)
      setIsLoading(false)
      return
    }
    checkConfigAndLoadBroadcasts()
  }, [currentOrganization?.id])

  const checkConfigAndLoadBroadcasts = async () => {
    try {
      if (!currentOrganization?.id) return
      const configResult = await whatsappService.getConfig(currentOrganization.id)
      setIsConfigured(configResult.is_configured)

      if (configResult.is_configured) {
        await loadBroadcasts()
      }
    } catch (error) {
      console.error("Error checking config:", error)
      setIsConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBroadcasts = async () => {
    setIsLoading(true)
    try {
      const result = await whatsappService.getBroadcasts(50, 0)
      setBroadcasts(result.broadcasts || [])
    } catch (error) {
      console.error("Error loading broadcasts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && isConfigured === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not configured state
  if (isConfigured === false) {
    return (
      <div className="space-y-8">
        <section className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                Campagnes
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">Campagnes WhatsApp</h1>
              <p className="text-muted-foreground">
                Gérez vos campagnes et suivez leurs performances.
              </p>
            </div>
            <ChannelTabs basePath="campaigns" />
          </div>
        </section>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-amber-600 mb-4" />
            <p className="text-lg font-medium">WhatsApp non configuré</p>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Configurez vos credentials WhatsApp Business API pour créer des campagnes
            </p>
            <Link href="/whatsapp/config">
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Configurer WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              Campagnes
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Campagnes WhatsApp</h1>
            <p className="text-muted-foreground">
              Gérez vos campagnes WhatsApp et suivez leurs performances.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ChannelTabs basePath="campaigns" />
            <Link href="/campaigns/whatsapp/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle campagne
              </Button>
            </Link>
            <Button variant="outline" onClick={loadBroadcasts} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </section>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <MessageSquareMore className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Aucune campagne WhatsApp</p>
              <p className="text-muted-foreground mb-4">
                Créez votre première campagne WhatsApp
              </p>
              <Link href="/campaigns/whatsapp/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle campagne
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Destinataires</TableHead>
                  <TableHead className="text-right">Livrés</TableHead>
                  <TableHead className="text-right">Lus</TableHead>
                  <TableHead className="text-right">Progression</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((broadcast) => (
                  <TableRow key={broadcast.id}>
                    <TableCell className="font-medium">
                      {broadcast.campaign_name || "Sans nom"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{broadcast.template_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {broadcast.template_language}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <BroadcastStatusBadge status={broadcast.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(broadcast.total_recipients)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-emerald-600">
                        {formatNumber(broadcast.delivered_count)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sky-600">
                        {formatNumber(broadcast.read_count)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={broadcast.progress_percent}
                          className="w-16"
                        />
                        <span className="text-sm text-muted-foreground w-12">
                          {typeof broadcast.progress_percent === "number"
                            ? `${broadcast.progress_percent.toFixed(0)}%`
                            : "0%"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(broadcast.created_at)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/campaigns/whatsapp/${broadcast.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
