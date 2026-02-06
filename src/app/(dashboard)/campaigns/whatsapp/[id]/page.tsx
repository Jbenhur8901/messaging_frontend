"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { whatsappService, handleApiError } from "@/services"
import type { WhatsAppBroadcast, WhatsAppBroadcastMessage } from "@/types"
import { formatNumber, formatDate } from "@/lib/utils"
import { BroadcastStatusBadge, MessageStatusBadge } from "@/components/whatsapp/whatsapp-status-badge"
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
import { toast } from "sonner"
import {
  ArrowLeft,
  RefreshCw,
  Send,
  CheckCircle2,
  Eye,
  XCircle,
  Clock,
  Users,
} from "lucide-react"

export default function WhatsAppCampaignDetailPage() {
  const params = useParams()
  const broadcastId = params.id as string

  const [broadcast, setBroadcast] = useState<WhatsAppBroadcast | null>(null)
  const [messages, setMessages] = useState<WhatsAppBroadcastMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  useEffect(() => {
    loadBroadcast()
  }, [broadcastId])

  const loadBroadcast = async () => {
    setIsLoading(true)
    try {
      const [broadcastResult, messagesResult] = await Promise.all([
        whatsappService.getBroadcast(broadcastId),
        whatsappService.getBroadcastMessages(broadcastId, 100, 0),
      ])
      setBroadcast(broadcastResult)
      setMessages(messagesResult.messages || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshMessages = async () => {
    setIsLoadingMessages(true)
    try {
      const [broadcastResult, messagesResult] = await Promise.all([
        whatsappService.getBroadcast(broadcastId),
        whatsappService.getBroadcastMessages(broadcastId, 100, 0),
      ])
      setBroadcast(broadcastResult)
      setMessages(messagesResult.messages || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!broadcast) {
    return (
      <div className="space-y-8">
        <section className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-4">
            <Link href="/campaigns/whatsapp">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                Campagnes
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">Campagne non trouvée</h1>
              <p className="text-muted-foreground">
                Cette campagne n&apos;existe pas ou a été supprimée.
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const stats = [
    {
      name: "Destinataires",
      value: broadcast.total_recipients,
      icon: Users,
      color: "text-sky-600",
    },
    {
      name: "Envoyés",
      value: broadcast.sent_count,
      icon: Send,
      color: "text-amber-600",
    },
    {
      name: "Livrés",
      value: broadcast.delivered_count,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      name: "Lus",
      value: broadcast.read_count,
      icon: Eye,
      color: "text-sky-600",
    },
    {
      name: "Échoués",
      value: broadcast.failed_count,
      icon: XCircle,
      color: "text-destructive",
    },
    {
      name: "En attente",
      value: broadcast.pending_count,
      icon: Clock,
      color: "text-muted-foreground",
    },
  ]

  const deliveryRate = broadcast.sent_count > 0
    ? ((broadcast.delivered_count / broadcast.sent_count) * 100).toFixed(1)
    : "0"

  const readRate = broadcast.delivered_count > 0
    ? ((broadcast.read_count / broadcast.delivered_count) * 100).toFixed(1)
    : "0"

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/campaigns/whatsapp">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                Campagnes
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {broadcast.campaign_name || "Campagne sans nom"}
                </h1>
                <BroadcastStatusBadge status={broadcast.status} />
              </div>
              <p className="text-muted-foreground">
                Template: {broadcast.template_name} ({broadcast.template_language})
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={refreshMessages}
            disabled={isLoadingMessages}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingMessages ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </section>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression</span>
            <span className="text-sm text-muted-foreground">
              {broadcast.progress_percent.toFixed(0)}%
            </span>
          </div>
          <Progress value={broadcast.progress_percent} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Créé le {formatDate(broadcast.created_at)}</span>
            {broadcast.completed_at && (
              <span>Terminé le {formatDate(broadcast.completed_at)}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className={`text-2xl font-semibold ${stat.color}`}>
                  {formatNumber(stat.value)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stat.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Taux de livraison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-emerald-600">{deliveryRate}%</span>
              <Progress value={parseFloat(deliveryRate)} className="flex-1 h-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Taux de lecture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-sky-600">{readRate}%</span>
              <Progress value={parseFloat(readRate)} className="flex-1 h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Messages ({messages.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Aucun message</p>
              <p className="text-muted-foreground">
                Les messages apparaîtront ici une fois envoyés
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Envoyé</TableHead>
                  <TableHead>Livré</TableHead>
                  <TableHead>Lu</TableHead>
                  <TableHead>Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((message, index) => (
                  <TableRow key={message.message_id || index}>
                    <TableCell className="font-mono text-sm">
                      {message.phone || (message as { phone_number?: string }).phone_number || "-"}
                    </TableCell>
                    <TableCell>
                      <MessageStatusBadge status={message.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {message.sent_at ? formatDate(message.sent_at) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {message.delivered_at ? formatDate(message.delivered_at) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {message.read_at ? formatDate(message.read_at) : "-"}
                    </TableCell>
                    <TableCell>
                      {message.error && (
                        <Badge variant="destructive" className="text-xs">
                          {message.error}
                        </Badge>
                      )}
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
