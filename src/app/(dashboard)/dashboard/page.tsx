"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { dashboardService, whatsappService } from "@/services"
import type { DashboardOverview, DailyStat, Broadcast, WhatsAppStats } from "@/types"
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
  TrendingUp,
  ArrowRight,
  Plus,
  CreditCard,
  Eye,
  BarChart3,
  MessageSquare,
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
import { featureFlags } from "@/config/features"

const getStoredApiKey = () => {
  if (typeof window === "undefined") return null
  try {
    const storedAuth = authStorage.getItem("auth-storage")
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth)
      const storedKey = parsed.state?.apiKey
      if (typeof storedKey === "string" && storedKey.length > 0) {
        return storedKey
      }
    }
  } catch {
    // Ignore parse errors
  }
  try {
    const user = authStorage.getItem("user")
    if (user) {
      const parsedUser = JSON.parse(user)
      const apiKey = parsedUser.api_key
      if (typeof apiKey === "string") return apiKey
      if (apiKey && typeof apiKey === "object" && typeof apiKey.key === "string") {
        return apiKey.key
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/* ── SMS-only helpers ── */
const calculateBroadcastTotals = (broadcasts: Broadcast[]) =>
  broadcasts.reduce(
    (acc, broadcast) => {
      const total = broadcast.total_recipients || 0
      const failed = broadcast.failed_count || 0
      const pending = broadcast.pending_count || 0
      let delivered = broadcast.sent_count || 0
      if (delivered === 0 && total > 0) {
        delivered = Math.max(total - failed - pending, 0)
      }
      acc.total += total
      acc.delivered += delivered
      return acc
    },
    { total: 0, delivered: 0 }
  )

const calculateDeliveryRateFromBroadcasts = (broadcasts: Broadcast[]) => {
  const totals = calculateBroadcastTotals(broadcasts)
  if (totals.total === 0) return 0
  return (totals.delivered / totals.total) * 100
}

/* ── Stagger animation helper ── */
const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.07}s forwards`,
})

export default function DashboardPage() {
  const { currentOrganization } = useOrganizationStore()
  const { walletBalance, walletTotal } = useCreditsStore()

  // ── Shared state ──
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [recentBroadcasts, setRecentBroadcasts] = useState<Broadcast[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ── WhatsApp state ──
  const [whatsappStats, setWhatsappStats] = useState<WhatsAppStats | null>(null)

  // ── SMS-only state (only used when SMS_ENABLED) ──
  const [overview, setOverview] = useState<DashboardOverview | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const token = authStorage.getItem("access_token")
      const apiKey = getStoredApiKey()
      if (!token && !apiKey) {
        setIsLoading(false)
        return
      }

      try {
        const PERIOD_DAYS = 14
        const channel = featureFlags.SMS_ENABLED ? undefined : "whatsapp" as const

        // ── Common fetches ──
        const promises: Promise<any>[] = [
          dashboardService.getDailyStats(PERIOD_DAYS, channel).catch(() => null),        // 0
          dashboardService.getRecentBroadcasts(5, channel).catch(() => ({ broadcasts: [] })), // 1
        ]

        // ── SMS-only fetches (only when SMS is enabled) ──
        if (featureFlags.SMS_ENABLED) {
          promises.push(
            dashboardService.getOverview("sms").catch(() => null),                        // 2
          )
        }

        const results = await Promise.all(promises)

        const statsData = results[0]
        const broadcastsData = results[1]

        // ── Broadcasts ──
        setRecentBroadcasts(broadcastsData.broadcasts || [])

        // ── Daily stats for chart ──
        if (statsData) {
          const statsArray = statsData.stats || []
          const sorted = [...statsArray].sort((a: DailyStat, b: DailyStat) => a.date.localeCompare(b.date))
          setDailyStats(sorted)

          // Use whatsapp_totals from daily-stats response as KPI source
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

        // WhatsApp KPIs fallback only when daily-stats does not provide totals
        if (!statsData?.whatsapp_totals) {
          const whatsappStatsData = await whatsappService.getStats(PERIOD_DAYS).catch(() => null)
          if (whatsappStatsData) {
            setWhatsappStats({ ...whatsappStatsData, period_days: PERIOD_DAYS })
          }
        }

        // ── SMS-only processing ──
        if (featureFlags.SMS_ENABLED) {
          const overviewData = results[2] as DashboardOverview | null
          if (overviewData) setOverview(overviewData)
        }
      } catch (error) {
        console.error("[Dashboard] loadData failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [currentOrganization?.id])

  /* ── Loading skeleton ── */
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

  // ── Derived values ──
  const whatsappSummary: WhatsAppStats = whatsappStats ?? {
    total_messages: 0, delivered: 0, read: 0, failed: 0,
    delivery_rate: 0, read_rate: 0, period_days: 14,
  }

  const deliveryRate = Number.isFinite(whatsappSummary.delivery_rate) ? whatsappSummary.delivery_rate : 0
  const readRate = Number.isFinite(whatsappSummary.read_rate) ? whatsappSummary.read_rate : 0

  // SMS-only derived (computed only when needed in render)
  const smsBroadcastTotals = featureFlags.SMS_ENABLED ? calculateBroadcastTotals(recentBroadcasts) : { total: 0, delivered: 0 }
  const smsDeliveryRate = featureFlags.SMS_ENABLED ? calculateDeliveryRateFromBroadcasts(recentBroadcasts) : 0

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between" style={stagger(0)}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Vue d&apos;ensemble de votre activité
          </p>
        </div>
        <Link href={featureFlags.SMS_ENABLED ? "/campaigns/new" : "/campaigns/whatsapp/new"}>
          <Button size="sm" className="h-8 gap-1.5 text-[13px] rounded-lg">
            <Plus className="h-3.5 w-3.5" />
            Nouvelle campagne
          </Button>
        </Link>
      </div>

      {/* ── SMS Stats (only when SMS_ENABLED) ── */}
      {featureFlags.SMS_ENABLED && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Crédits SMS",
              value: formatNumber(overview?.credits.available || 0),
              icon: CreditCard,
              sub: overview?.credits.expiring_soon && overview.credits.expiring_soon > 0
                ? `${formatNumber(overview.credits.expiring_soon)} expirent bientôt`
                : undefined,
            },
            {
              label: "SMS aujourd'hui",
              value: formatNumber(overview?.today.messages_sent || 0),
              icon: Send,
              sub: `${formatNumber(overview?.today.messages_delivered || 0)} livrés`,
            },
            {
              label: "Taux SMS",
              value: `${smsDeliveryRate.toFixed(1)}%`,
              icon: CheckCircle,
            },
            {
              label: "SMS cette semaine",
              value: formatNumber(smsBroadcastTotals.total || 0),
              icon: TrendingUp,
              sub: `${smsDeliveryRate.toFixed(1)}% de livraison`,
            },
          ].map((item, i) => (
            <Card key={item.label} className="group border-transparent hover:border-border/50 transition-all duration-300" style={stagger(i + 1)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium text-muted-foreground">{item.label}</span>
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                </div>
                <p className="text-xl font-semibold tracking-tight">{item.value}</p>
                {item.sub && (
                  <p className="text-[11px] text-muted-foreground mt-1">{item.sub}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── WhatsApp KPIs ── */}
      <div style={stagger(featureFlags.SMS_ENABLED ? 5 : 1)}>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            WhatsApp &middot; {whatsappSummary.period_days}j
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Wallet */}
          <Link href="/whatsapp/credits" className="block" style={stagger(featureFlags.SMS_ENABLED ? 6 : 2)}>
            <Card className="group h-full border-transparent hover:border-border/50 transition-all duration-300 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium text-muted-foreground">Wallet</span>
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary/60 transition-colors duration-300" />
                </div>
                <p className="text-xl font-semibold tracking-tight">
                  {formatNumber(walletTotal)}
                  <span className="text-[11px] font-normal text-muted-foreground ml-1">FCFA</span>
                </p>
                {walletBalance && (
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <span className="text-[10px] text-blue-500/80 font-medium">M {formatNumber(walletBalance.marketing.available)}</span>
                    <span className="text-[10px] text-blue-500/80 font-medium">U {formatNumber(walletBalance.utility.available)}</span>
                    <span className="text-[10px] text-emerald-500/80 font-medium">A {formatNumber(walletBalance.authentication.available)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Messages */}
          <Card className="border-transparent hover:border-border/50 transition-all duration-300" style={stagger(featureFlags.SMS_ENABLED ? 7 : 3)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-muted-foreground">Messages</span>
                <Send className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
              <p className="text-xl font-semibold tracking-tight">
                {formatNumber(whatsappSummary.total_messages || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatNumber(whatsappSummary.delivered || 0)} livrés
              </p>
            </CardContent>
          </Card>

          {/* Delivery rate */}
          <Card className="border-transparent hover:border-border/50 transition-all duration-300" style={stagger(featureFlags.SMS_ENABLED ? 8 : 4)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-muted-foreground">Livraison</span>
                <CheckCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
              <p className="text-xl font-semibold tracking-tight">{deliveryRate.toFixed(1)}%</p>
              <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500/70 transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(deliveryRate, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Read rate */}
          <Card className="border-transparent hover:border-border/50 transition-all duration-300" style={stagger(featureFlags.SMS_ENABLED ? 9 : 5)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-muted-foreground">Lecture</span>
                <Eye className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
              <p className="text-xl font-semibold tracking-tight">{readRate.toFixed(1)}%</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatNumber(whatsappSummary.read || 0)} lus
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Chart + Recent campaigns ── */}
      <div className="grid gap-4 lg:grid-cols-5" style={stagger(featureFlags.SMS_ENABLED ? 10 : 6)}>
        {/* Activity chart */}
        <Card className="lg:col-span-3 border-transparent hover:border-border/50 transition-all duration-300">
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
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
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
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
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
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
                      }
                      formatter={(value) => [formatNumber(value as number), ""]}
                    />
                    <Area
                      type="monotone"
                      dataKey="messages_sent"
                      stroke="var(--color-primary)"
                      strokeWidth={1.5}
                      fill="url(#gradSent)"
                      dot={false}
                      name="Envoyés"
                    />
                    <Area
                      type="monotone"
                      dataKey="messages_delivered"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      fill="url(#gradDelivered)"
                      dot={false}
                      name="Livrés"
                    />
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

        {/* Recent campaigns */}
        <Card className="lg:col-span-2 border-transparent hover:border-border/50 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium">Campagnes récentes</span>
              <Link href={featureFlags.SMS_ENABLED ? "/campaigns" : "/campaigns/whatsapp"}>
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
                  <p className="text-[13px] text-muted-foreground">
                    Aucune campagne récente
                  </p>
                </div>
              ) : (
                recentBroadcasts.map((broadcast) => (
                  <Link
                    key={broadcast.broadcast_id}
                    href={`/campaigns/${broadcast.broadcast_id}`}
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
                            <span className="text-muted-foreground/40">&middot;</span>
                            <span>{broadcast.delivery_rate.toFixed(0)}% livré</span>
                          </>
                        )}
                        {broadcast.read_rate != null && (
                          <>
                            <span className="text-muted-foreground/40">&middot;</span>
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
