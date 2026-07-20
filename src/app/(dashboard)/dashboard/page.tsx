"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { dashboardService, whatsappService } from "@/services"
import type { DailyStat, Broadcast, WhatsAppStats } from "@/types"
import { formatNumber } from "@/lib/utils"
import { authStorage } from "@/lib/auth-storage"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Wallet,
  Send,
  CheckCircle,
  ArrowRight,
  Plus,
  Eye,
  BarChart3,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useCreditsStore, useOrganizationStore } from "@/stores"

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.07}s forwards`,
})

const PERIOD_DAYS = 14

const finiteNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const campaignBaseCount = (broadcast: Broadcast) => {
  const sentCount = finiteNumber(broadcast.sent_count)
  return sentCount > 0 ? sentCount : finiteNumber(broadcast.total_recipients)
}

const campaignMetricCount = (broadcast: Broadcast, count: number | undefined, rate: number | undefined) => {
  const parsedCount = finiteNumber(count)
  if (parsedCount > 0) return parsedCount

  const base = campaignBaseCount(broadcast)
  const parsedRate = finiteNumber(rate)
  return base > 0 && parsedRate > 0 ? Math.round((base * parsedRate) / 100) : 0
}

export default function DashboardPage() {
  const { currentOrganization } = useOrganizationStore()
  const { walletBalance, walletTotal, fetchBalance } = useCreditsStore()

  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [recentBroadcasts, setRecentBroadcasts] = useState<Broadcast[]>([])
  const [whatsappStats, setWhatsappStats] = useState<WhatsAppStats | null>(null)
  const [campaignStats, setCampaignStats] = useState({ deliveryRate: 0, readRate: 0, read: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const token = authStorage.getItem("access_token")
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        await fetchBalance().catch(() => undefined)

        const [statsData, broadcastsData, waBroadcastsData, fallbackStats] = await Promise.all([
          dashboardService.getDailyStats(PERIOD_DAYS, "whatsapp").catch(() => null),
          dashboardService.getRecentBroadcasts(100, "whatsapp").catch(() => ({ broadcasts: [] })),
          whatsappService.getBroadcasts(100).catch(() => ({ broadcasts: [] })),
          whatsappService.getStats(PERIOD_DAYS).catch(() => null),
        ])

        // Prefer dashboard endpoint; fall back to whatsapp broadcasts if empty
        let allBroadcasts = broadcastsData.broadcasts || []
        if (allBroadcasts.length === 0 && waBroadcastsData.broadcasts.length > 0) {
          allBroadcasts = waBroadcastsData.broadcasts.map((b) => ({
            broadcast_id: b.id,
            status: b.status,
            total_recipients: b.total_recipients,
            sent_count: b.sent_count,
            failed_count: b.failed_count,
            pending_count: b.pending_count,
            progress_percent: b.progress_percent,
            segments_per_message: 1,
            total_segments: 0,
            credits_consumed: 0,
            credits_reserved: 0,
            message_encoding: "GSM-7" as const,
            campaign_name: b.campaign_name,
            template_name: b.template_name,
            created_at: b.created_at,
            completed_at: b.completed_at,
            channel: "whatsapp" as const,
            delivered_count: b.delivered_count,
            read_count: b.read_count,
            delivery_rate: b.sent_count > 0 ? (b.delivered_count / b.sent_count) * 100 : 0,
            read_rate: b.sent_count > 0 ? (b.read_count / b.sent_count) * 100 : 0,
          }))
        }

        setRecentBroadcasts(allBroadcasts.slice(0, 5))

        // Use campaign counters directly, with rates as a fallback when the API only exposes percentages.
        const campaignTotalSent = allBroadcasts.reduce((s, b) => s + campaignBaseCount(b), 0)
        const campaignDelivered = allBroadcasts.reduce(
          (s, b) => s + campaignMetricCount(b, b.delivered_count, b.delivery_rate),
          0
        )
        const campaignRead = allBroadcasts.reduce(
          (s, b) => s + campaignMetricCount(b, b.read_count, b.read_rate),
          0
        )
        setCampaignStats({
          deliveryRate: campaignTotalSent > 0 ? (campaignDelivered / campaignTotalSent) * 100 : 0,
          readRate: campaignTotalSent > 0 ? (campaignRead / campaignTotalSent) * 100 : 0,
          read: campaignRead,
        })

        if (statsData) {
          const statsArray = statsData.stats || []
          const sorted = [...statsArray].sort((a: DailyStat, b: DailyStat) => a.date.localeCompare(b.date))
          setDailyStats(sorted)

          const totals = statsData.whatsapp_totals
          if (totals) {
            setWhatsappStats({
              total_messages: totals.messages_sent ?? 0,
              delivered: totals.messages_delivered ?? 0,
              read: totals.messages_read ?? 0,
              failed: totals.messages_failed ?? 0,
              delivery_rate: totals.delivery_rate ?? 0,
              read_rate: totals.read_rate ?? 0,
              period_days: PERIOD_DAYS,
            })
          }
        }

        if (!statsData?.whatsapp_totals && fallbackStats) {
          setWhatsappStats({ ...fallbackStats, period_days: PERIOD_DAYS })
        }
      } catch (error) {
        console.error("[Dashboard] loadData failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [currentOrganization?.id, fetchBalance])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-72 rounded-xl lg:col-span-3" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
      </div>
    )
  }

  const whatsappSummary: WhatsAppStats = whatsappStats ?? {
    total_messages: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    delivery_rate: 0,
    read_rate: 0,
    period_days: PERIOD_DAYS,
  }

  const deliveryRate = Number.isFinite(whatsappSummary.delivery_rate) ? whatsappSummary.delivery_rate : 0
  const readRate = Number.isFinite(whatsappSummary.read_rate) ? whatsappSummary.read_rate : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" style={stagger(0)}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Vue d&apos;ensemble de vos campagnes WhatsApp et de vos agents IA.
          </p>
        </div>
        <Link href="/campaigns/whatsapp/new">
          <Button size="sm" className="h-8 gap-1.5 text-[13px] rounded-lg">
            <Plus className="h-3.5 w-3.5" />
            Nouvelle campagne
          </Button>
        </Link>
      </div>

      <div style={stagger(1)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/whatsapp/credits" className="block focus-visible:outline-none" style={stagger(2)}>
            <Card className="group h-full border-0 transition-all duration-300 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium text-muted-foreground">Wallet WhatsApp</span>
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary/60 transition-colors duration-300" />
                </div>
                <p className="text-xl font-semibold tracking-tight">
                  {formatNumber(walletTotal)}
                  <span className="text-[11px] font-normal text-muted-foreground ml-1">FCFA</span>
                </p>
                {walletTotal > 0 && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-medium">~{formatNumber(Math.floor(walletTotal / 18))} mkt</span>
                    <span className="text-[10px] text-muted-foreground font-medium">~{formatNumber(Math.floor(walletTotal / 6))} util</span>
                    <span className="text-[10px] text-muted-foreground font-medium">~{formatNumber(Math.floor(walletTotal / 6))} auth</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          <Card className="group border-0 transition-all duration-300" style={stagger(4)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-muted-foreground">Messages</span>
                <Send className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary/60 transition-colors duration-300" />
              </div>
              <p className="text-xl font-semibold tracking-tight">{formatNumber(whatsappSummary.total_messages || 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatNumber(whatsappSummary.delivered || 0)} livrés
              </p>
            </CardContent>
          </Card>

          <Card className="group border-0 transition-all duration-300" style={stagger(4)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-muted-foreground">Livraison</span>
                <CheckCircle className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary/60 transition-colors duration-300" />
              </div>
              <p className="text-xl font-semibold tracking-tight">{campaignStats.deliveryRate.toFixed(1)}%</p>
              <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(campaignStats.deliveryRate, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="group border-0 transition-all duration-300" style={stagger(5)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-muted-foreground">Lecture</span>
                <Eye className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary/60 transition-colors duration-300" />
              </div>
              <p className="text-xl font-semibold tracking-tight">{campaignStats.readRate.toFixed(1)}%</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatNumber(campaignStats.read)} lus
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5" style={stagger(6)}>
        <Card className="lg:col-span-3 border-0 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[13px] font-medium">Activité — 14 derniers jours</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                  Envoyés
                </span>
                <span className="flex items-center gap-1 text-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground" />
                  Livrés
                </span>
              </div>
            </div>
            {dailyStats.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyStats}>
                    <defs>
                      <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "var(--shadow-md)",
                      }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      formatter={(value) => [formatNumber(value as number), ""]}
                    />
                    <Area type="monotone" dataKey="messages_sent" stroke="var(--color-primary)" strokeWidth={1.5} fill="url(#gradSent)" dot={false} name="Envoyés" />
                    <Area type="monotone" dataKey="messages_delivered" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} fill="url(#gradDelivered)" dot={false} name="Livrés" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-[13px] text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium">Campagnes récentes</span>
              <Link href="/campaigns/whatsapp">
                <Button variant="ghost" size="sm" className="h-7 text-[12px] text-muted-foreground hover:text-foreground gap-1 px-2">
                  Tout voir
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-1">
              {recentBroadcasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Send className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-[13px] text-muted-foreground">Aucune campagne récente</p>
                </div>
              ) : (
                recentBroadcasts.map((broadcast) => (
                  <Link
                    key={broadcast.broadcast_id}
                    href={`/campaigns/whatsapp/${broadcast.broadcast_id}`}
                    className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate group-hover:text-foreground transition-colors">
                        {broadcast.campaign_name || "Sans nom"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span>{formatNumber(broadcast.total_recipients)} dest.</span>
                        {broadcast.delivery_rate != null && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span>{broadcast.delivery_rate.toFixed(0)}% livré</span>
                          </>
                        )}
                        {broadcast.read_rate != null && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span>{broadcast.read_rate.toFixed(0)}% lu</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        broadcast.status === "completed"
                          ? "success"
                          : broadcast.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[10px] ml-2 shrink-0"
                    >
                      {broadcast.status === "completed"
                        ? "Terminé"
                        : broadcast.status === "processing"
                          ? "En cours"
                          : broadcast.status === "pending"
                            ? "En attente"
                            : broadcast.status}
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
