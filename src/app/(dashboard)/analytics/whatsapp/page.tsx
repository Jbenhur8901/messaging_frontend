"use client"

import { useState, useEffect, useCallback } from "react"
import { whatsappService } from "@/services/whatsapp"
import { handleApiError } from "@/services"
import type { TemplateAnalytics, DeliveryRatePoint, ReadRatePoint, ResponseTimeStats } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { BarChart3, Download, Send, CheckCheck, Eye, Clock } from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`
  return `${(seconds / 3600).toFixed(1)}h`
}

function getDateRange(days: number): { start: string; end: string } {
  const end = new Date()
  const start = new Date(end.getTime() - days * 86400000)
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

export default function WhatsAppAnalyticsPage() {
  const [period, setPeriod] = useState(30)
  const [isLoading, setIsLoading] = useState(true)
  const [templateAnalytics, setTemplateAnalytics] = useState<TemplateAnalytics[]>([])
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRatePoint[]>([])
  const [readRates, setReadRates] = useState<ReadRatePoint[]>([])
  const [responseTimes, setResponseTimes] = useState<ResponseTimeStats | null>(null)
  const [totalSent, setTotalSent] = useState(0)
  const [avgDeliveryRate, setAvgDeliveryRate] = useState(0)
  const [avgReadRate, setAvgReadRate] = useState(0)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { start, end } = getDateRange(period)
      const [templatesRes, deliveryRes, readRes, responseRes] = await Promise.all([
        whatsappService.getTemplateAnalytics(start, end),
        whatsappService.getDeliveryRates(start, end),
        whatsappService.getReadRates(start, end),
        whatsappService.getResponseTimes(start, end),
      ])
      setTemplateAnalytics(templatesRes.analytics || [])
      setDeliveryRates(deliveryRes.data || [])
      setReadRates(readRes.data || [])
      setResponseTimes(responseRes)

      const sent = templatesRes.analytics.reduce((s, t) => s + t.total_sent, 0)
      setTotalSent(sent)
      const delivered = templatesRes.analytics.reduce((s, t) => s + t.delivered, 0)
      setAvgDeliveryRate(sent > 0 ? delivered / sent : 0)
      const read = templatesRes.analytics.reduce((s, t) => s + t.read, 0)
      setAvgReadRate(delivered > 0 ? read / delivered : 0)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = async () => {
    try {
      const { start, end } = getDateRange(period)
      const blob = await whatsappService.exportAnalytics("full", start, end)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `whatsapp-analytics-${start}-${end}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Export t\u00e9l\u00e9charg\u00e9")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Statistiques de performance de vos messages WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={period === d ? "default" : "ghost"}
                size="sm"
                className="rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => setPeriod(d)}
              >
                {d}j
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages envoy&eacute;s</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{totalSent.toLocaleString("fr-FR")}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de livraison</CardTitle>
            <CheckCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{formatPercent(avgDeliveryRate)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de lecture</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{formatPercent(avgReadRate)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps de r&eacute;ponse moyen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">
                {responseTimes ? formatDuration(responseTimes.avg_response_time_seconds) : "-"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taux de livraison</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={deliveryRates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" name="Envoy\u00e9s" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="delivered" name="Livr\u00e9s" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="failed" name="\u00c9chou\u00e9s" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taux de lecture</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={readRates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="delivered" name="Livr\u00e9s" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="read" name="Lus" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance par template</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Envoy&eacute;s</TableHead>
                  <TableHead className="text-right">Livr&eacute;s</TableHead>
                  <TableHead className="text-right">Lus</TableHead>
                  <TableHead className="text-right">&Eacute;chou&eacute;s</TableHead>
                  <TableHead className="text-right">Taux livraison</TableHead>
                  <TableHead className="text-right">Taux lecture</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateAnalytics.map((t) => (
                  <TableRow key={t.template_id}>
                    <TableCell className="font-medium">{t.template_name}</TableCell>
                    <TableCell className="text-right">{t.total_sent}</TableCell>
                    <TableCell className="text-right">{t.delivered}</TableCell>
                    <TableCell className="text-right">{t.read}</TableCell>
                    <TableCell className="text-right">{t.failed}</TableCell>
                    <TableCell className="text-right">{formatPercent(t.delivery_rate)}</TableCell>
                    <TableCell className="text-right">{formatPercent(t.read_rate)}</TableCell>
                  </TableRow>
                ))}
                {templateAnalytics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucune donn&eacute;e pour cette p&eacute;riode
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
