"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { dashboardService, whatsappService, creditsService } from "@/services"
import type { DashboardOverview, DailyStat, Broadcast, WhatsAppStats, CreditBalance } from "@/types"
import { formatNumber, formatDate } from "@/lib/utils"
import { authStorage } from "@/lib/auth-storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CreditCard,
  Send,
  CheckCircle,
  XCircle,
  TrendingUp,
  ArrowRight,
  Plus,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useOrganizationStore } from "@/stores"
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

const buildOverviewFromDailyStats = (stats: DailyStat[]): DashboardOverview => {
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayStat = stats.find((stat) => stat.date === todayStr)
  const recent = stats.slice(-7)
  const weekSent = recent.reduce((sum, stat) => sum + (stat.messages_sent || 0), 0)
  const weekDelivered = recent.reduce((sum, stat) => sum + (stat.messages_delivered || 0), 0)
  const weekRate = weekSent > 0 ? (weekDelivered / weekSent) * 100 : 0

  return {
    credits: {
      balance: 0,
      reserved: 0,
      available: 0,
      expiring_soon: 0,
      expiring_in_days: 0,
    },
    today: {
      messages_sent: todayStat?.messages_sent || 0,
      messages_delivered: todayStat?.messages_delivered || 0,
      delivery_rate: todayStat?.delivery_rate || (todayStat?.messages_sent ? (todayStat.messages_delivered / todayStat.messages_sent) * 100 : 0),
    },
    week: {
      messages_sent: weekSent,
      messages_delivered: weekDelivered,
      delivery_rate: weekRate,
    },
    broadcasts: {
      active: 0,
    },
    generated_at: new Date().toISOString(),
  }
}

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

export default function DashboardPage() {
  const { currentOrganization } = useOrganizationStore()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [recentBroadcasts, setRecentBroadcasts] = useState<Broadcast[]>([])
  const [whatsappStats, setWhatsappStats] = useState<WhatsAppStats | null>(null)
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const broadcastTotals = calculateBroadcastTotals(recentBroadcasts)
  const derivedDeliveryRate = calculateDeliveryRateFromBroadcasts(recentBroadcasts)
  const deliveryRateToDisplay = derivedDeliveryRate

  useEffect(() => {
    const loadData = async () => {
      // Check for token or API key before making API calls
      const token = authStorage.getItem("access_token")
      const apiKey = getStoredApiKey()
      if (!token && !apiKey) {
        setIsLoading(false)
        return
      }

      try {
        const whatsappStatsPromise = whatsappService.getStats(7).catch(() => null)
        const creditsBalancePromise = creditsService.getBalance().catch(() => null)
        const [
          overviewData,
          statsData,
          broadcastsData,
          whatsappStatsData,
          creditsBalanceData,
        ] = await Promise.all([
          dashboardService.getOverview(),
          dashboardService.getDailyStats(14),
          dashboardService.getRecentBroadcasts(5),
          whatsappStatsPromise,
          creditsBalancePromise,
        ])
        const statsArray = Array.isArray(statsData)
          ? statsData
          : statsData?.stats ||
            (statsData as { daily_stats?: DailyStat[] }).daily_stats ||
            (statsData as { daily?: DailyStat[] }).daily ||
            []
        setDailyStats([...statsArray].reverse())
        setRecentBroadcasts(broadcastsData.broadcasts || [])

        const hasOverviewActivity =
          (overviewData?.today.messages_sent || 0) > 0 ||
          (overviewData?.today.messages_delivered || 0) > 0 ||
          (overviewData?.week.messages_sent || 0) > 0
        if (hasOverviewActivity) {
          setOverview(overviewData)
        } else if (statsArray.length > 0) {
          const derived = buildOverviewFromDailyStats(statsArray)
          setOverview({
            ...derived,
            credits: overviewData?.credits || derived.credits,
            broadcasts: overviewData?.broadcasts || derived.broadcasts,
          })
        } else {
          setOverview(overviewData)
        }
        if (whatsappStatsData) {
          setWhatsappStats(whatsappStatsData)
        }
        if (creditsBalanceData) {
          setCreditBalance(creditsBalanceData)
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [currentOrganization?.id])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
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
    period_days: 7,
  }
  const whatsappCreditsAvailable =
    creditBalance?.whatsapp_credit_available ??
    creditBalance?.whatsapp_credit_balance ??
    overview?.credits.available ??
    0

  return (
    <div className="space-y-8">
      {/* Simple Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Vue d&apos;ensemble de votre activité
          </p>
        </div>
        <Link href={featureFlags.SMS_ENABLED ? "/campaigns/new" : "/campaigns/whatsapp/new"}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle campagne
          </Button>
        </Link>
      </div>

      {/* SMS Stats Grid */}
      {featureFlags.SMS_ENABLED && (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crédits disponibles
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatNumber(overview?.credits.available || 0)}
            </div>
            {overview?.credits.expiring_soon && overview.credits.expiring_soon > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {formatNumber(overview.credits.expiring_soon)} expirent dans{" "}
                {overview.credits.expiring_in_days} jours
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Messages aujourd&apos;hui
            </CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatNumber(overview?.today.messages_sent || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatNumber(overview?.today.messages_delivered || 0)} livrés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de livraison
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {deliveryRateToDisplay.toFixed(1)}%
            </div>
            <Progress
              value={deliveryRateToDisplay}
              className="mt-3 h-1.5"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cette semaine
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatNumber(broadcastTotals.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {deliveryRateToDisplay.toFixed(1)}% de livraison
            </p>
          </CardContent>
        </Card>
      </div>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Indicateurs des {whatsappSummary.period_days} derniers jours
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Crédits WhatsApp
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatNumber(whatsappCreditsAvailable)}
            </div>
          </CardContent>
        </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Messages WhatsApp
              </CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatNumber(whatsappSummary.total_messages || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatNumber(whatsappSummary.delivered || 0)} livrés
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taux de livraison WhatsApp
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {Number.isFinite(whatsappSummary.delivery_rate)
                  ? whatsappSummary.delivery_rate.toFixed(1)
                  : "0.0"}
                %
              </div>
              <Progress value={whatsappSummary.delivery_rate || 0} className="mt-3 h-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taux de lecture WhatsApp
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {Number.isFinite(whatsappSummary.read_rate)
                  ? whatsappSummary.read_rate.toFixed(1)
                  : "0.0"}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatNumber(whatsappSummary.read || 0)} lus
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SMS Chart */}
        {featureFlags.SMS_ENABLED && (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Activité des 14 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyStats.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                        })
                      }
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                        })
                      }
                      formatter={(value) => [formatNumber(value as number), ""]}
                    />
                    <Line
                      type="monotone"
                      dataKey="messages_sent"
                      stroke="#0b5fff"
                      strokeWidth={2.5}
                      dot={false}
                      name="Envoyés"
                    />
                    <Line
                      type="monotone"
                      dataKey="messages_delivered"
                      stroke="#1f9d55"
                      strokeWidth={2.5}
                      dot={false}
                      name="Livrés"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Recent Broadcasts */}
        <Card className={featureFlags.SMS_ENABLED ? "lg:col-span-1" : "lg:col-span-2"}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Campagnes récentes</CardTitle>
            <Link href={featureFlags.SMS_ENABLED ? "/campaigns" : "/campaigns/whatsapp"}>
              <Button variant="ghost" size="sm">
                Voir tout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBroadcasts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune campagne récente
                </p>
              ) : (
                recentBroadcasts.map((broadcast) => (
                  <Link
                    key={broadcast.broadcast_id}
                    href={`/campaigns/${broadcast.broadcast_id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background p-4 transition-colors hover:bg-accent/50">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {broadcast.campaign_name || "Sans nom"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(broadcast.total_recipients)} destinataires
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            broadcast.status === "completed"
                              ? "success"
                              : broadcast.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {broadcast.status === "completed"
                            ? "Terminé"
                            : broadcast.status === "processing"
                            ? "En cours"
                            : broadcast.status === "pending"
                            ? "En attente"
                            : broadcast.status}
                        </Badge>
                      </div>
                    </div>
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
