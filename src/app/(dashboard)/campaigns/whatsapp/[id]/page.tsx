"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { whatsappService, handleApiError } from "@/services"
import type { WhatsAppBroadcast, WhatsAppBroadcastMessage, WhatsAppMessageStatus } from "@/types"
import { formatNumber, formatDate } from "@/lib/utils"
import { BroadcastStatusBadge, MessageStatusBadge } from "@/components/whatsapp/whatsapp-status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PaginationControls } from "@/components/ui/pagination-controls"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  Send,
  CheckCircle2,
  Eye,
  XCircle,
  Clock,
  Users,
  Download,
} from "lucide-react"

/* ── Stagger animation ── */
const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

const MSG_PAGE_SIZE = 25

const MSG_FILTERS: { label: string; value: WhatsAppMessageStatus | "all" }[] = [
  { label: "Tous", value: "all" },
  { label: "Livrés", value: "delivered" },
  { label: "Lus", value: "read" },
  { label: "Échoués", value: "failed" },
  { label: "En attente", value: "queued" },
]

export default function WhatsAppCampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const broadcastId = params.id as string

  const [broadcast, setBroadcast] = useState<WhatsAppBroadcast | null>(null)
  const [messages, setMessages] = useState<WhatsAppBroadcastMessage[]>([])
  const [allMessages, setAllMessages] = useState<WhatsAppBroadcastMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRelaunching, setIsRelaunching] = useState(false)
  const [msgFilter, setMsgFilter] = useState<WhatsAppMessageStatus | "all">("all")
  const [msgPage, setMsgPage] = useState(0)

  useEffect(() => {
    loadBroadcast()
  }, [broadcastId])

  const loadBroadcast = async () => {
    setIsLoading(true)
    try {
      const [broadcastResult, messagesResult] = await Promise.all([
        whatsappService.getBroadcast(broadcastId),
        whatsappService.getBroadcastMessages(broadcastId, 500, 0),
      ])
      setBroadcast(broadcastResult)
      setAllMessages(messagesResult.messages || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      const [broadcastResult, messagesResult] = await Promise.all([
        whatsappService.getBroadcast(broadcastId),
        whatsappService.getBroadcastMessages(broadcastId, 500, 0),
      ])
      setBroadcast(broadcastResult)
      setAllMessages(messagesResult.messages || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter messages client-side
  useEffect(() => {
    const filtered = msgFilter === "all"
      ? allMessages
      : allMessages.filter((m) => m.status === msgFilter)
    setMessages(filtered)
    setMsgPage(0)
  }, [allMessages, msgFilter])

  const pagedMessages = messages.slice(msgPage * MSG_PAGE_SIZE, (msgPage + 1) * MSG_PAGE_SIZE)
  const totalMsgPages = Math.ceil(messages.length / MSG_PAGE_SIZE)

  const exportCSV = () => {
    if (!broadcast || messages.length === 0) return
    const headers = ["Téléphone", "Statut", "Envoyé", "Livré", "Lu", "Échoué", "Erreur"]
    const rows = messages.map((m) => [
      m.to_phone || m.phone || "",
      m.status,
      m.sent_at || "",
      m.delivered_at || "",
      m.read_at || "",
      m.failed_at || "",
      (m.error_message || m.error || "").replace(/"/g, '""'),
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const suffix = msgFilter === "all" ? "tous" : msgFilter
    a.download = `${broadcast.campaign_name || "campagne"}-${suffix}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRelaunch = async () => {
    if (!broadcast) return
    const phones = allMessages
      .map((m) => m.to_phone || m.phone)
      .filter((p): p is string => Boolean(p))
    if (phones.length === 0) {
      toast.error("Aucun destinataire trouvé pour la relance")
      return
    }
    setIsRelaunching(true)
    try {
      const result = await whatsappService.createBroadcast(
        phones,
        broadcast.template_name,
        broadcast.template_language,
        `${broadcast.campaign_name || "Campagne"} (relancée)`,
      )
      if (result.success) {
        toast.success(`Campagne relancée — ${phones.length} destinataires`)
        router.push(`/campaigns/whatsapp/${result.broadcast_id}`)
      } else {
        toast.error("Erreur lors de la relance")
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsRelaunching(false)
    }
  }

  const deliveryRate = broadcast && broadcast.sent_count > 0
    ? ((broadcast.delivered_count / broadcast.sent_count) * 100)
    : 0

  const readRate = broadcast && broadcast.delivered_count > 0
    ? ((broadcast.read_count / broadcast.delivered_count) * 100)
    : 0

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  /* ── Not found ── */
  if (!broadcast) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3" style={stagger(0)}>
          <Link href="/campaigns/whatsapp">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Campagne non trouvée</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Cette campagne n&apos;existe pas ou a été supprimée.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const kpis = [
    { label: "Destinataires", value: broadcast.total_recipients ?? 0, icon: Users, color: "#6b7280" },
    { label: "Envoyés", value: broadcast.sent_count ?? 0, icon: Send, color: "#E15701" },
    { label: "Livrés", value: broadcast.delivered_count ?? 0, icon: CheckCircle2, color: "#12E046" },
    { label: "Lus", value: broadcast.read_count ?? 0, icon: Eye, color: "#E15701" },
    { label: "Échoués", value: broadcast.failed_count ?? 0, icon: XCircle, color: "#ef4444" },
    { label: "En attente", value: broadcast.pending_count ?? 0, icon: Clock, color: "#9ca3af" },
  ]

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between" style={stagger(0)}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/campaigns/whatsapp">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight truncate">
                {broadcast.campaign_name || "Campagne sans nom"}
              </h1>
              <BroadcastStatusBadge status={broadcast.status} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[13px] text-muted-foreground">
                {broadcast.template_name}
              </span>
              {broadcast.template_language && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-border/50">
                  {broadcast.template_language}
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground">
                · Créé le {formatDate(broadcast.created_at)}
              </span>
              {broadcast.completed_at && (
                <span className="text-[11px] text-muted-foreground">
                  · Terminé le {formatDate(broadcast.completed_at)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg border-border/60 px-3 text-[12px] font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                disabled={isRelaunching}
              >
                {isRelaunching
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  : <RotateCcw className="h-3.5 w-3.5" />}
                Relancer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Relancer cette campagne ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Une nouvelle campagne sera créée avec le même modèle{" "}
                  <span className="font-medium text-foreground">{broadcast.template_name}</span>{" "}
                  et les mêmes {allMessages.length} destinataires. La campagne actuelle reste inchangée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleRelaunch} disabled={isRelaunching}>
                  Relancer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={stagger(1)}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-medium text-muted-foreground">Progression</span>
          <span className="text-[12px] font-medium tabular-nums">
            {(broadcast.progress_percent ?? 0).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${broadcast.progress_percent ?? 0}%`,
              background: broadcast.status === "failed" ? "#ef4444" : "#12E046",
            }}
          />
        </div>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" style={stagger(2)}>
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                <span className="text-[11px] text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-[22px] font-semibold tracking-tight tabular-nums" style={{ color: kpi.color }}>
                {formatNumber(kpi.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Rates ── */}
      <div className="grid gap-3 sm:grid-cols-2" style={stagger(3)}>
        <Card className="border-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-muted-foreground">Taux de livraison</span>
              <span className="text-[20px] font-semibold tabular-nums" style={{ color: "#12E046" }}>
                {deliveryRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${deliveryRate}%`, background: "#12E046" }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-muted-foreground">Taux de lecture</span>
              <span className="text-[20px] font-semibold tabular-nums" style={{ color: "#E15701" }}>
                {readRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${readRate}%`, background: "#E15701" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Messages section ── */}
      <div style={stagger(4)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Messages
            <span className="text-muted-foreground font-normal ml-1.5">({messages.length})</span>
          </h2>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
              onClick={exportCSV}
            >
              <Download className="h-3.5 w-3.5" />
              Exporter CSV
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 mb-3">
          {MSG_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setMsgFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                msgFilter === f.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {messages.length === 0 ? (
          <Card className="border-transparent">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Send className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-[14px] font-medium">Aucun message</p>
              <p className="text-[12px] text-muted-foreground">
                {msgFilter === "all"
                  ? "Les messages apparaîtront ici une fois envoyés"
                  : "Aucun message avec ce statut"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Column headers */}
            <div className="flex items-center gap-4 px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <div className="w-36">Téléphone</div>
              <div className="flex-1 hidden sm:block">Envoyé</div>
              <div className="flex-1 hidden sm:block">Livré</div>
              <div className="flex-1 hidden md:block">Lu</div>
              <div className="flex-1 hidden lg:block">Erreur</div>
              <div className="w-24 text-center">Statut</div>
            </div>

            {/* Rows */}
            <div className="space-y-0.5">
              {pagedMessages.map((message, i) => {
                const phone = message.to_phone || message.phone || "—"
                return (
                <div
                  key={message.message_id || i}
                  className="flex items-center gap-4 rounded-xl px-4 py-2.5 transition-colors duration-200 hover:bg-accent/50"
                  style={stagger(i + 5)}
                >
                  {/* Phone */}
                  <span className="text-[13px] font-mono w-36 truncate">
                    {phone}
                  </span>

                  {/* Sent at */}
                  <span className="flex-1 hidden sm:block text-[11px] text-muted-foreground">
                    {message.sent_at ? formatDate(message.sent_at) : "—"}
                  </span>

                  {/* Delivered at */}
                  <span className="flex-1 hidden sm:block text-[11px] text-muted-foreground">
                    {message.delivered_at ? formatDate(message.delivered_at) : "—"}
                  </span>

                  {/* Read at */}
                  <span className="flex-1 hidden md:block text-[11px] text-muted-foreground">
                    {message.read_at ? formatDate(message.read_at) : "—"}
                  </span>

                  {/* Error */}
                  <div className="flex-1 hidden lg:block">
                    {(message.error_message || message.error) ? (
                      <span className="text-[11px]" style={{ color: "#ef4444" }}>
                        {message.error_message || message.error}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="w-24 flex justify-center">
                    <MessageStatusBadge status={message.status} />
                  </div>
                </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalMsgPages > 1 && (
              <div className="flex items-center justify-between pt-4 px-4">
                <span className="text-[12px] text-muted-foreground">
                  {messages.length} message{messages.length > 1 ? "s" : ""} · Page {msgPage + 1} / {totalMsgPages}
                </span>
                <PaginationControls
                  page={msgPage + 1}
                  totalPages={totalMsgPages}
                  onPageChange={(nextPage) => setMsgPage(nextPage - 1)}
                  compact
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
