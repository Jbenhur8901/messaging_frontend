"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { creditsService, whatsappService } from "@/services"
import { authStorage } from "@/lib/auth-storage"
import type { CreditBalance, CreditTransaction, CreditUsage, Pagination, WhatsAppCreditBalance } from "@/types"
import { formatNumber, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  History,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
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

export default function CreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [walletBalance, setWalletBalance] = useState<WhatsAppCreditBalance | null>(null)
  const [usage, setUsage] = useState<CreditUsage | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 20

  useEffect(() => {
    const loadData = async () => {
      // Check for token before making API calls
      const token = authStorage.getItem("access_token")
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const [balanceData, usageData, walletData] = await Promise.all([
          creditsService.getBalance(),
          creditsService.getUsage(30),
          whatsappService.getWhatsAppBalance().catch(() => null),
        ])
        setBalance(balanceData)
        setUsage(usageData)
        if (walletData) setWalletBalance(walletData)
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    const loadTransactions = async () => {
      // Check for token before making API calls
      const token = authStorage.getItem("access_token")
      if (!token) {
        return
      }

      try {
        const offset = (page - 1) * limit
        const result = await creditsService.getHistory(limit, offset)
        setTransactions(result.transactions)
        setPagination(result.pagination)
      } catch (error) {
      }
    }

    loadTransactions()
  }, [page])

  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 1

  // Prepare chart data
  const chartData = usage
    ? Object.entries(usage.daily_breakdown)
        .map(([date, value]) => ({ date, credits: value }))
        .reverse()
    : []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Crédits</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos crédits et consultez votre consommation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/credits/requests">
              Mes demandes
            </Link>
          </Button>
          <Button asChild>
            <Link href="/credits/request">
              <CreditCard className="mr-2 h-4 w-4" />
              Demander des crédits
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/whatsapp/credits" className="block">
          <Card className="transition-colors hover:border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wallet WhatsApp
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatNumber(
                  walletBalance
                    ? walletBalance.marketing.available + walletBalance.utility.available + walletBalance.authentication.available + walletBalance.free.available
                    : (balance?.whatsapp_credit_available ?? balance?.whatsapp_credit_balance ?? 0)
                )} <span className="text-sm font-normal text-muted-foreground">FCFA</span>
              </div>
              {walletBalance && (
                <div className="flex gap-2 mt-2 text-[11px] text-muted-foreground">
                  <span className="text-violet-600">M:{formatNumber(walletBalance.marketing.available)}</span>
                  <span className="text-blue-600">U:{formatNumber(walletBalance.utility.available)}</span>
                  <span className="text-emerald-600">A:{formatNumber(walletBalance.authentication.available)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Consommation (30j)
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatNumber(usage?.total_consumed || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ~{formatNumber(Math.round(usage?.average_daily_consumption || 0))}/jour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Autonomie estimée
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {usage?.estimated_days_remaining
                ? `${formatNumber(usage.estimated_days_remaining)} jours`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Au rythme actuel
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Consommation quotidienne</CardTitle>
          <CardDescription>Crédits utilisés sur les 30 derniers jours</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0b5fff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0b5fff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    formatter={(value) => [formatNumber(value as number), "Crédits"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="credits"
                    stroke="#0b5fff"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCredits)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Aucune donnée de consommation disponible
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Historique des transactions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(tx.created_at)}
                  </TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tx.type === "recharge"
                          ? "success"
                          : tx.type === "consumption"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {tx.type === "recharge"
                        ? "Recharge"
                        : tx.type === "consumption"
                        ? "Consommation"
                        : tx.type === "refund"
                        ? "Remboursement"
                        : "Ajustement"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`flex items-center justify-end gap-1 font-medium ${
                        tx.amount > 0 ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {tx.amount > 0 ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {tx.amount > 0 ? "+" : ""}
                      {formatNumber(tx.amount)}
                    </span>
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
