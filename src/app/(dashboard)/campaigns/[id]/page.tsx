"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { smsService } from "@/services"
import type { Broadcast, BroadcastMessage, Pagination } from "@/types"
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
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  queued: "En file",
  sending: "Envoi",
  sent: "Envoyé",
  delivered: "Livré",
  undelivered: "Non livré",
  failed: "Échoué",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  queued: "secondary",
  sending: "warning",
  sent: "default",
  delivered: "success",
  undelivered: "warning",
  failed: "destructive",
}

export default function CampaignDetailPage() {
  const params = useParams()
  const broadcastId = params.id as string

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [messages, setMessages] = useState<BroadcastMessage[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 50

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const [broadcastData, messagesData] = await Promise.all([
        smsService.getBroadcast(broadcastId),
        smsService.getBroadcastMessages(broadcastId, limit, (page - 1) * limit),
      ])
      setBroadcast(broadcastData)
      setMessages(messagesData.messages)
      setPagination(messagesData.pagination)
    } catch (error) {
      console.error("Error loading broadcast:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [broadcastId, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh for active broadcasts
  useEffect(() => {
    if (broadcast?.status === "processing" || broadcast?.status === "pending") {
      const interval = setInterval(() => loadData(true), 5000)
      return () => clearInterval(interval)
    }
  }, [broadcast?.status, loadData])

  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 1

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!broadcast) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-medium">Campagne non trouvée</p>
        <Link href="/campaigns">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux campagnes
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {broadcast.campaign_name || "Sans nom"}
            </h1>
            <p className="text-muted-foreground">
              Créée le {formatDate(broadcast.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANTS[broadcast.status] || "secondary"}>
            {broadcast.status === "completed"
              ? "Terminé"
              : broadcast.status === "processing"
              ? "En cours"
              : broadcast.status === "pending"
              ? "En attente"
              : broadcast.status}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(broadcast.total_recipients)}
            </div>
            <p className="text-xs text-muted-foreground">destinataires</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envoyés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(broadcast.sent_count)}
            </div>
            <Progress
              value={(broadcast.sent_count / broadcast.total_recipients) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échoués</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(broadcast.failed_count)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((broadcast.failed_count / broadcast.total_recipients) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(broadcast.pending_count)}
            </div>
            <p className="text-xs text-muted-foreground">
              {broadcast.progress_percent.toFixed(1)}% complété
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Message Preview */}
      {broadcast.body && (
        <Card>
          <CardHeader>
            <CardTitle>Message</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap rounded-md bg-muted p-4">
              {broadcast.body}
            </p>
            <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
              <span>{broadcast.segments_per_message} segment(s)</span>
              <span>{broadcast.message_encoding}</span>
              <span>{formatNumber(broadcast.credits_consumed)} crédits consommés</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des envois</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Segments</TableHead>
                <TableHead>Envoyé le</TableHead>
                <TableHead>Erreur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono">{msg.phone}</TableCell>
                  <TableCell>
                    {(() => {
                      const normalizedStatus =
                        msg.status === "queued" && msg.sent_at ? "sent" : msg.status
                      return (
                        <Badge variant={STATUS_VARIANTS[normalizedStatus] || "secondary"}>
                          {STATUS_LABELS[normalizedStatus] || normalizedStatus}
                        </Badge>
                      )
                    })()}
                  </TableCell>
                  <TableCell>{msg.segments_count}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {msg.sent_at ? formatDate(msg.sent_at) : "-"}
                  </TableCell>
                  <TableCell className="text-destructive max-w-xs truncate">
                    {msg.error || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
