"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { dashboardService } from "@/services"
import type { Broadcast } from "@/types"
import { formatNumber, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Send, Eye, RefreshCw } from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  processing: "En cours",
  completed: "Terminé",
  failed: "Échoué",
  cancelled: "Annulé",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  pending: "secondary",
  processing: "warning",
  completed: "success",
  failed: "destructive",
  cancelled: "default",
}

export default function CampaignsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadBroadcasts = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await dashboardService.getRecentBroadcasts(50)
      setBroadcasts(result.broadcasts)
    } catch (error) {
      console.error("Error loading broadcasts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBroadcasts()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campagnes</h1>
          <p className="text-muted-foreground">
            Gérez vos campagnes SMS et suivez leurs performances
          </p>
        </div>
        <Link href="/campaigns/new">
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
              <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Aucune campagne</p>
              <p className="text-muted-foreground mb-4">
                Créez votre première campagne SMS
              </p>
              <Link href="/campaigns/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle campagne
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Destinataires</TableHead>
                    <TableHead className="text-right">Livrés</TableHead>
                    <TableHead className="text-right">Progression</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.filter(Boolean).map((broadcast, index) => (
                    <TableRow key={(broadcast.broadcast_id || (broadcast as { id?: string }).id) || `${broadcast.created_at}-${index}`}>
                      <TableCell className="font-medium">
                        {broadcast.campaign_name || "Sans nom"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[broadcast.status]}>
                          {STATUS_LABELS[broadcast.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(broadcast.total_recipients)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(broadcast.sent_count)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={broadcast.progress_percent}
                            className="w-16"
                          />
                          <span className="text-sm text-muted-foreground w-12">
                            {broadcast.progress_percent.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(broadcast.created_at)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/campaigns/${broadcast.broadcast_id || (broadcast as { id?: string }).id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
