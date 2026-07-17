"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { creditsService, whatsappService, handleApiError } from "@/services"
import { creditRequestsService } from "@/services/credit-requests"
import { authStorage } from "@/lib/auth-storage"
import { useOrganizationStore } from "@/stores"
import type {
  CreditBalance,
  CreditTransaction,
  CreditUsage,
  CreditRequest,
  CreditRequestStatus,
  Pagination,
  WhatsAppCreditBalance,
} from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { toast } from "sonner"
import {
  Loader2,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  XCircle,
  AlertTriangle,
  History,
  Gift,
  Clock,
  CheckCircle,
  Ban,
  Upload,
  FileImage,
  FileText,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
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

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

const formatNumber = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n)

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const requestStatusMeta: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  pending: { label: "En attente", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  approved: { label: "Approuvée", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  rejected: { label: "Rejetée", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  cancelled: { label: "Annulée", color: "text-foreground/80", bg: "bg-muted border-border", icon: Ban },
}

export default function CreditsPage() {
  const { currentOrganization } = useOrganizationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [walletBalance, setWalletBalance] = useState<WhatsAppCreditBalance | null>(null)
  const [usage, setUsage] = useState<CreditUsage | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [txPagination, setTxPagination] = useState<Pagination | null>(null)
  const [txPage, setTxPage] = useState(1)
  const [txLoading, setTxLoading] = useState(false)

  // Requests state
  const [requests, setRequests] = useState<CreditRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestStatusFilter, setRequestStatusFilter] = useState<CreditRequestStatus | "all">("all")

  // Request dialog state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestAmount, setRequestAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("mobile_money")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detail dialog
  const [detailRequest, setDetailRequest] = useState<CreditRequest | null>(null)

  const TX_LIMIT = 20

  const loadTransactions = useCallback(async (page: number) => {
    setTxLoading(true)
    try {
      const offset = (page - 1) * TX_LIMIT
      const result = await creditsService.getHistory(TX_LIMIT, offset)
      setTransactions(result.transactions)
      setTxPagination(result.pagination)
    } catch {
      toast.error("Impossible de charger les transactions")
    } finally {
      setTxLoading(false)
    }
  }, [])

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const data = await creditRequestsService.getRequests(
        requestStatusFilter === "all" ? undefined : requestStatusFilter,
        50,
        0
      )
      setRequests(data.requests || [])
    } catch {
      toast.error("Impossible de charger les demandes")
    } finally {
      setRequestsLoading(false)
    }
  }, [requestStatusFilter])

  useEffect(() => {
    const token = authStorage.getItem("access_token")
    if (!token) {
      setIsLoading(false)
      return
    }

    const loadAll = async () => {
      try {
        const [balanceResult, usageResult, walletResult, txResult, reqResult] = await Promise.allSettled([
          creditsService.getBalance(),
          creditsService.getUsage(30),
          whatsappService.getWhatsAppBalance(),
          creditsService.getHistory(TX_LIMIT, 0),
          creditRequestsService.getRequests(undefined, 50, 0),
        ])
        if (balanceResult.status === "fulfilled") setBalance(balanceResult.value)
        if (usageResult.status === "fulfilled") setUsage(usageResult.value)
        if (walletResult.status === "fulfilled") setWalletBalance(walletResult.value)
        if (txResult.status === "fulfilled") {
          setTransactions(txResult.value.transactions)
          setTxPagination(txResult.value.pagination)
        }
        if (reqResult.status === "fulfilled") setRequests(reqResult.value.requests || [])
      } finally {
        setIsLoading(false)
      }
    }
    loadAll()
  }, [currentOrganization?.id])

  useEffect(() => {
    if (!isLoading) void loadRequests()
  }, [requestStatusFilter, currentOrganization?.id])

  const handleSubmitRequest = async () => {
    const amountNum = parseInt(requestAmount, 10)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Veuillez entrer un montant valide")
      return
    }
    if (!paymentProof) {
      toast.error("La preuve de paiement est obligatoire")
      return
    }
    setIsSubmitting(true)
    try {
      await creditRequestsService.createRequest(
        amountNum,
        paymentMethod as "mobile_money" | "airtel_money" | "cash",
        paymentReference || undefined,
        paymentProof
      )
      toast.success("Demande envoyée ! Elle sera traitée par un administrateur.")
      setRequestDialogOpen(false)
      setRequestAmount("")
      setPaymentReference("")
      setPaymentProof(null)
      void loadRequests()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRequest = async (id: string) => {
    setCancellingId(id)
    try {
      await creditRequestsService.cancelRequest(id)
      toast.success("Demande annulée")
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "cancelled" as CreditRequestStatus } : r))
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setCancellingId(null)
    }
  }

  // Chart data
  const chartData = usage
    ? Object.entries(usage.daily_breakdown)
        .map(([date, value]) => ({ date, credits: value }))
        .reverse()
    : []

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-44" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    )
  }

  const isLowBalance = balance && (balance.whatsapp_credit_available ?? balance.whatsapp_credit_balance ?? 0) > 0 && (balance.whatsapp_credit_available ?? balance.whatsapp_credit_balance ?? 0) < 1000
  const isEmptyBalance = balance && (balance.whatsapp_credit_available ?? balance.whatsapp_credit_balance ?? 0) === 0
  const pendingRequests = requests.filter((r) => r.status === "pending")
  const totalPages = txPagination ? Math.ceil(txPagination.total / TX_LIMIT) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={stagger(0)}>
        <h1 className="text-xl font-semibold tracking-tight">Crédits</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Gérez vos crédits et consultez votre consommation
        </p>
      </div>

      {/* Balance + Stats */}
      <div className="grid gap-4 sm:grid-cols-3" style={stagger(1)}>
        {/* WhatsApp Wallet Card */}
        <Link href="/whatsapp/credits" className="block">
          <div className={`rounded-xl border p-5 transition-all hover:shadow-md ${
            isEmptyBalance
              ? "border-red-200 bg-gradient-to-br from-red-50/80 to-orange-50/60"
              : isLowBalance
              ? "border-amber-200 bg-gradient-to-br from-amber-50/80 to-yellow-50/60"
              : "border-border/40 bg-gradient-to-br from-emerald-50/60 to-green-50/40"
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isEmptyBalance ? "bg-red-100" : isLowBalance ? "bg-amber-100" : "bg-emerald-100"
              }`}>
                {isEmptyBalance ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <Wallet className={`h-5 w-5 ${isLowBalance ? "text-amber-600" : "text-emerald-600"}`} />
                )}
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Wallet WhatsApp
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {formatNumber(
                    walletBalance
                      ? walletBalance.marketing.available + walletBalance.utility.available + walletBalance.authentication.available + walletBalance.free.available
                      : (balance?.whatsapp_credit_available ?? balance?.whatsapp_credit_balance ?? 0)
                  )}
                </p>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">
              FCFA disponibles
            </p>
            {walletBalance && (
              <div className="flex gap-2 mt-2 text-[11px]">
                <span className="text-violet-600 font-medium">M:{formatNumber(walletBalance.marketing.available)}</span>
                <span className="text-blue-600 font-medium">U:{formatNumber(walletBalance.utility.available)}</span>
                <span className="text-emerald-600 font-medium">A:{formatNumber(walletBalance.authentication.available)}</span>
              </div>
            )}
            {isEmptyBalance && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-100/60 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <p className="text-[11px] text-red-700">
                  Solde épuisé. Rechargez pour continuer vos envois.
                </p>
              </div>
            )}
            {isLowBalance && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-100/60 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-700">
                  Solde faible. Rechargez pour éviter une interruption.
                </p>
              </div>
            )}
          </div>
        </Link>

        {/* Consumption Card */}
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-blue-50/50 to-sky-50/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <TrendingDown className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Consommation (30j)
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {formatNumber(usage?.total_consumed || 0)}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">
            ~{formatNumber(Math.round(usage?.average_daily_consumption || 0))}/jour en moyenne
          </p>
        </div>

        {/* Autonomy Card */}
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-violet-50/50 to-purple-50/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Autonomie estimée
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {usage?.estimated_days_remaining
                  ? `${formatNumber(usage.estimated_days_remaining)} j`
                  : "—"}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">
            au rythme actuel
          </p>
          {pendingRequests.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50/80 border border-amber-200/60 px-3 py-2">
              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <p className="text-[11px] text-amber-700">
                {pendingRequests.length} demande{pendingRequests.length > 1 ? "s" : ""} en attente de validation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Usage Chart */}
      <div style={stagger(2)}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Consommation quotidienne
          </h2>
        </div>
        <div className="rounded-xl border border-border/40 p-5">
          {chartData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#12E046" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#12E046" stopOpacity={0} />
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
                    stroke="#12E046"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCredits)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-[13px]">
              Aucune donnée de consommation disponible
            </div>
          )}
        </div>
      </div>

      {/* Request CTA */}
      <div style={stagger(3)}>
        <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 to-[rgba(225,87,1,0.08)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Besoin de crédits ?
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Effectuez votre paiement puis soumettez votre demande avec la preuve
              </p>
            </div>
          </div>
          <Button
            className="h-9 rounded-lg px-5 text-[13px] gap-2"
            onClick={() => setRequestDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Demander des crédits
          </Button>
        </div>
      </div>

      {/* My Requests Section */}
      <div style={stagger(4)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
              Mes demandes
            </h2>
          </div>
          <select
            className="h-7 rounded-lg border border-border bg-card px-2 text-[11px]"
            value={requestStatusFilter}
            onChange={(e) => setRequestStatusFilter(e.target.value as CreditRequestStatus | "all")}
          >
            <option value="all">Toutes</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvées</option>
            <option value="rejected">Rejetées</option>
            <option value="cancelled">Annulées</option>
          </select>
        </div>

        {requestsLoading && requests.length === 0 ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card className="border-transparent">
            <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">Aucune demande</p>
              <p className="text-[11px] text-muted-foreground/60">
                Cliquez sur &quot;Demander des crédits&quot; pour envoyer une demande.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => {
              const meta = requestStatusMeta[req.status] || requestStatusMeta.pending
              const StatusIcon = meta.icon
              return (
                <div
                  key={req.id}
                  className="rounded-xl border border-border/40 p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setDetailRequest(req)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">
                          {formatNumber(req.amount)} crédits
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {req.payment_method === "mobile_money" ? "Mobile Money" : req.payment_method === "airtel_money" ? "Airtel Money" : "Cash"}
                          {req.payment_reference ? ` · ${req.payment_reference}` : ""}
                          {" · "}
                          {formatDate(req.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {req.payment_proof_url && (
                        <a
                          href={req.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          title="Voir la preuve"
                        >
                          <FileImage className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      {req.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          disabled={cancellingId === req.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelRequest(req.id)
                          }}
                        >
                          {cancellingId === req.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Ban className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {req.status === "rejected" && req.review_note && (
                    <div className="mt-2 rounded-lg bg-red-50/60 border border-red-200/60 px-3 py-2">
                      <p className="text-[11px] text-red-700">
                        <span className="font-semibold">Motif :</span> {req.review_note}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div style={stagger(5)}>
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Historique des transactions
          </h2>
        </div>

        {transactions.length === 0 && !txLoading ? (
          <Card className="border-transparent">
            <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
              <History className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">Aucune transaction</p>
              <p className="text-[11px] text-muted-foreground/60">
                Vos transactions de crédits apparaîtront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {txLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                        <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : (
                    transactions.map((tx) => {
                      const isPositive = tx.amount > 0
                      const typeLabel = tx.type === "recharge" ? "Recharge" : tx.type === "consumption" ? "Consommation" : tx.type === "refund" ? "Remboursement" : "Ajustement"
                      const typeBg = tx.type === "recharge"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : tx.type === "consumption"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-muted border-border text-foreground/80"
                      return (
                        <tr key={tx.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                            {formatDate(tx.created_at)}
                          </td>
                          <td className="px-4 py-3 text-[12px] text-foreground max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${typeBg}`}>
                              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {typeLabel}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right text-[13px] font-semibold whitespace-nowrap ${
                            isPositive ? "text-emerald-600" : "text-red-500"
                          }`}>
                            {isPositive ? "+" : ""}{formatNumber(tx.amount)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">
                  Page {txPage} sur {totalPages}
                </p>
                <PaginationControls
                  page={txPage}
                  totalPages={totalPages}
                  onPageChange={(nextPage) => {
                    setTxPage(nextPage)
                    loadTransactions(nextPage)
                  }}
                  disabled={txLoading}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Request Dialog ── */}
      {requestDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          onClick={() => {
            setRequestDialogOpen(false)
            setPaymentProof(null)
            setRequestAmount("")
            setPaymentReference("")
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setRequestDialogOpen(false)
              setPaymentProof(null)
              setRequestAmount("")
              setPaymentReference("")
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                  <CreditCard className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">
                    Demander des crédits
                  </h3>
                  <p className="text-[11px] text-muted-foreground/60">
                    Votre demande sera validée par un administrateur
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
                onClick={() => {
                  setRequestDialogOpen(false)
                  setPaymentProof(null)
                  setRequestAmount("")
                  setPaymentReference("")
                }}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">Montant (crédits)</Label>
                <Input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="5000"
                  min="1"
                  className="h-9 rounded-lg text-[13px]"
                />
                <p className="text-[10px] text-muted-foreground/60">Crédits utilises pour WhatsApp et l'automatisation IA.</p>
              </div>

              {/* Payment method */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">Moyen de paiement</Label>
                <select
                  className="w-full h-9 rounded-lg border border-border bg-card px-3 text-[13px]"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="mobile_money">Mobile Money</option>
                  <option value="airtel_money">Airtel Money</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Payment reference */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">Référence de paiement</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="TXN123456 ou numéro de transaction"
                  className="h-9 rounded-lg text-[13px]"
                />
              </div>

              {/* Payment proof */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">Preuve de paiement *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setPaymentProof(e.target.files[0])
                  }}
                />
                <div
                  className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-4 cursor-pointer hover:border-border transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {paymentProof ? (
                    <div className="flex items-center gap-2 text-center">
                      <FileImage className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[12px] font-medium text-foreground/80">{paymentProof.name}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {(paymentProof.size / 1024).toFixed(0)} Ko
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1" />
                      <p className="text-[12px] text-muted-foreground/60">
                        Capture d&apos;écran ou reçu de paiement
                      </p>
                      <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                        Image ou PDF
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* How it works */}
              <div className="rounded-lg bg-muted border border-border/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">Comment ça marche ?</p>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-muted-foreground/60">
                  <li>Effectuez votre paiement via le mode choisi</li>
                  <li>Joignez la preuve de paiement ci-dessus</li>
                  <li>Un administrateur vérifiera et approuvera</li>
                  <li>Les crédits seront ajoutés à votre compte</li>
                </ol>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-lg px-4 text-[13px]"
                  onClick={() => {
                    setRequestDialogOpen(false)
                    setPaymentProof(null)
                    setRequestAmount("")
                    setPaymentReference("")
                  }}
                >
                  Annuler
                </Button>
                <Button
                  className="h-9 rounded-lg px-5 text-[13px] gap-2"
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting || !requestAmount || !paymentProof}
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Envoyer la demande
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Dialog ── */}
      {detailRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          onClick={() => setDetailRequest(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDetailRequest(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-foreground">Détail de la demande</h3>
              <button
                type="button"
                className="rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
                onClick={() => setDetailRequest(null)}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">Montant</p>
                  <p className="text-[13px] font-medium">{formatNumber(detailRequest.amount)} crédits</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">Paiement</p>
                  <p className="text-[13px] font-medium">
                    {detailRequest.payment_method === "mobile_money" ? "Mobile Money" : detailRequest.payment_method === "airtel_money" ? "Airtel Money" : "Cash"}
                  </p>
                </div>
                {detailRequest.payment_reference && (
                  <div className="col-span-2">
                    <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">Référence</p>
                    <p className="text-[13px] font-mono">{detailRequest.payment_reference}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">Date</p>
                  <p className="text-[13px]">{formatDate(detailRequest.created_at)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">Statut</p>
                  {(() => {
                    const meta = requestStatusMeta[detailRequest.status] || requestStatusMeta.pending
                    const StatusIcon = meta.icon
                    return (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    )
                  })()}
                </div>
              </div>
              {detailRequest.payment_proof_url && (
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide mb-1">Preuve de paiement</p>
                  <a
                    href={detailRequest.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline"
                  >
                    <FileImage className="h-3.5 w-3.5" />
                    Voir la preuve
                  </a>
                </div>
              )}
              {detailRequest.review_note && (
                <div className={`rounded-lg px-3 py-2 ${
                  detailRequest.status === "rejected" ? "bg-red-50/60 border border-red-200/60" : "bg-emerald-50/60 border border-emerald-200/60"
                }`}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                    Note de l&apos;administrateur
                  </p>
                  <p className={`text-[12px] ${detailRequest.status === "rejected" ? "text-red-700" : "text-emerald-700"}`}>
                    {detailRequest.review_note}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="outline" className="h-9 rounded-lg px-4 text-[13px]" onClick={() => setDetailRequest(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
