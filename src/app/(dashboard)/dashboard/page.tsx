"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { dashboardService, creditsService } from "@/services"
import type { DashboardOverview, DailyStat, Broadcast } from "@/types"
import { formatNumber, formatDate } from "@/lib/utils"
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

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [recentBroadcasts, setRecentBroadcasts] = useState<Broadcast[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      // Check for token before making API calls
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const [overviewData, statsData, broadcastsData] = await Promise.all([
          dashboardService.getOverview(),
          dashboardService.getDailyStats(14),
          dashboardService.getRecentBroadcasts(5),
        ])
        setOverview(overviewData)
        const statsArray = Array.isArray(statsData)
          ? statsData
          : statsData?.stats || (statsData as { daily_stats?: DailyStat[] }).daily_stats || []
        setDailyStats([...statsArray].reverse())
        setRecentBroadcasts(broadcastsData.broadcasts || [])
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Vue d&apos;ensemble de votre activité SMS
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle campagne
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Crédits disponibles
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(overview?.credits.available || 0)}
            </div>
            {overview?.credits.expiring_soon && overview.credits.expiring_soon > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatNumber(overview.credits.expiring_soon)} expirent dans{" "}
                {overview.credits.expiring_in_days} jours
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Messages aujourd&apos;hui
            </CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(overview?.today.messages_sent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(overview?.today.messages_delivered || 0)} livrés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taux de livraison
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(overview?.today.delivery_rate || 0).toFixed(1)}%
            </div>
            <Progress
              value={overview?.today.delivery_rate || 0}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cette semaine
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(overview?.week.messages_sent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(overview?.week.delivery_rate || 0).toFixed(1)}% de livraison
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
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
                      stroke="#1800ad"
                      strokeWidth={2}
                      dot={false}
                      name="Envoyés"
                    />
                    <Line
                      type="monotone"
                      dataKey="messages_delivered"
                      stroke="#22c55e"
                      strokeWidth={2}
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

        {/* Recent Broadcasts */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Campagnes récentes</CardTitle>
            <Link href="/campaigns">
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
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
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
