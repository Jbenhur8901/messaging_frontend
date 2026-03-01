"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { handleApiError } from "@/services"
import { aiCreditsService } from "@/services/ai-credits"
import { useOrganizationStore } from "@/stores"
import type {
  AICreditsBalance,
  AIPackage,
  AITransaction,
  AITransactionsPagination,
} from "@/services/ai-credits"
import type { AICreditRequest, CreditRequestStatus } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Loader2,
  Bot,
  Sparkles,
  Zap,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  XCircle,
  AlertTriangle,
  CreditCard,
  History,
  Package,
  Gift,
  Clock,
  CheckCircle,
  Ban,
  Upload,
  FileImage,
  FileText,
} from "lucide-react"

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

const AI_PRICING_TIERS = [
  { min: 1_000, max: 10_000, rate: 5, label: "1 000 à 10 000 messages" },
  { min: 10_001, max: 25_000, rate: 4, label: "10 001 à 25 000 messages" },
  { min: 25_001, max: 40_000, rate: 3, label: "25 001 à 40 000 messages" },
  { min: 40_001, max: Number.POSITIVE_INFINITY, rate: 2, label: "40 001 messages et plus" },
]

const getAIRate = (messageCount: number) =>
  AI_PRICING_TIERS.find((tier) => messageCount >= tier.min && messageCount <= tier.max)?.rate ?? 5

const getAITotalPrice = (messageCount: number) => messageCount * getAIRate(messageCount)

const txTypeMeta: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof CreditCard }
> = {
  purchase: {
    label: "Achat",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: CreditCard,
  },
  bonus: {
    label: "Bonus",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: Gift,
  },
  consumption: {
    label: "Consommation",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Zap,
  },
  adjustment: {
    label: "Ajustement",
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
    icon: TrendingUp,
  },
}

const requestStatusMeta: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  pending: { label: "En attente", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  approved: { label: "Approuvée", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  rejected: { label: "Rejetée", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  cancelled: { label: "Annulée", color: "text-gray-700", bg: "bg-gray-50 border-gray-200", icon: Ban },
}

export default function AICreditsPage() {
  const router = useRouter()
  const { organizations, currentOrganization } = useOrganizationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [balance, setBalance] = useState<AICreditsBalance | null>(null)
  const [packages, setPackages] = useState<AIPackage[]>([])
  const [transactions, setTransactions] = useState<AITransaction[]>([])
  const [pagination, setPagination] = useState<AITransactionsPagination | null>(null)
  const [txOffset, setTxOffset] = useState(0)
  const [txLoading, setTxLoading] = useState(false)

  // Requests state
  const [requests, setRequests] = useState<AICreditRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestStatusFilter, setRequestStatusFilter] = useState<CreditRequestStatus | "all">("all")

  // Purchase request dialog state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<AIPackage | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("mobile_money")
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detail dialog
  const [detailRequest, setDetailRequest] = useState<AICreditRequest | null>(null)

  const TX_LIMIT = 20
  const userRole = organizations.find((org) => org.id === currentOrganization?.id)?.role

  const loadTransactions = useCallback(async (offset: number) => {
    setTxLoading(true)
    try {
      const data = await aiCreditsService.getTransactions(TX_LIMIT, offset)
      setTransactions(data.transactions || [])
      setPagination(data.pagination || null)
    } catch {
      toast.error("Impossible de charger les transactions")
    } finally {
      setTxLoading(false)
    }
  }, [])

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const data = await aiCreditsService.listRequests(
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
    const loadAll = async () => {
      try {
        const [balanceResult, packagesResult, txResult, reqResult] = await Promise.allSettled([
          aiCreditsService.getBalance(),
          aiCreditsService.getPackages(),
          aiCreditsService.getTransactions(TX_LIMIT, 0),
          aiCreditsService.listRequests(undefined, 50, 0),
        ])
        if (balanceResult.status === "fulfilled") setBalance(balanceResult.value)
        if (packagesResult.status === "fulfilled") setPackages(packagesResult.value.packages || [])
        if (txResult.status === "fulfilled") {
          setTransactions(txResult.value.transactions || [])
          setPagination(txResult.value.pagination || null)
        }
        if (reqResult.status === "fulfilled") setRequests(reqResult.value.requests || [])
      } finally {
        setIsLoading(false)
      }
    }
    loadAll()
  }, [currentOrganization?.id])

  useEffect(() => {
    if (!isLoading) loadRequests()
  }, [requestStatusFilter, currentOrganization?.id])

  useEffect(() => {
    if (currentOrganization && userRole && userRole !== "owner") {
      toast.error("La facturation est réservée au propriétaire de l'organisation")
      router.replace("/dashboard")
    }
  }, [currentOrganization, router, userRole])

  const handleSubmitRequest = async () => {
    if (!selectedPackage) return
    setIsSubmitting(true)
    try {
      await aiCreditsService.createRequest(
        selectedPackage.code,
        paymentMethod,
        paymentProof || undefined
      )
      toast.success("Demande envoyée ! Elle sera traitée par un administrateur.")
      setRequestDialogOpen(false)
      setSelectedPackage(null)
      setPaymentProof(null)
      loadRequests()
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
      await aiCreditsService.cancelRequest(id)
      toast.success("Demande annulée")
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "cancelled" as CreditRequestStatus } : r))
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setCancellingId(null)
    }
  }

  const handlePrevPage = () => {
    const newOffset = Math.max(0, txOffset - TX_LIMIT)
    setTxOffset(newOffset)
    loadTransactions(newOffset)
  }

  const handleNextPage = () => {
    if (pagination?.has_more) {
      const newOffset = txOffset + TX_LIMIT
      setTxOffset(newOffset)
      loadTransactions(newOffset)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-44" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    )
  }

  if (currentOrganization && userRole && userRole !== "owner") {
    return null
  }

  const isLowBalance = balance && balance.balance > 0 && balance.balance < 100
  const isEmptyBalance = balance && balance.balance === 0
  const pendingRequests = requests.filter((r) => r.status === "pending")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={stagger(0)}>
        <h1 className="text-xl font-semibold tracking-tight">Crédits IA</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Gérez vos crédits pour les réponses automatiques de l&apos;agent IA
        </p>
      </div>

      {/* Balance + Stats */}
      <div className="grid gap-4 sm:grid-cols-2" style={stagger(1)}>
        {/* Balance Card */}
        <div className={`rounded-xl border p-5 ${
          isEmptyBalance
            ? "border-red-200 bg-gradient-to-br from-red-50/80 to-orange-50/60"
            : isLowBalance
            ? "border-amber-200 bg-gradient-to-br from-amber-50/80 to-yellow-50/60"
            : "border-border/40 bg-gradient-to-br from-blue-50/60 to-sky-50/40"
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isEmptyBalance ? "bg-red-100" : isLowBalance ? "bg-amber-100" : "bg-blue-100"
            }`}>
              {isEmptyBalance ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <Sparkles className={`h-5 w-5 ${isLowBalance ? "text-amber-600" : "text-blue-600"}`} />
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Solde disponible
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {formatNumber(balance?.balance ?? 0)}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">
            crédits IA restants
          </p>
          {isEmptyBalance && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-100/60 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
              <p className="text-[11px] text-red-700">
                L&apos;auto-reply IA est désactivée car votre solde est épuisé.
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

        {/* Usage Card */}
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-blue-50/50 to-sky-50/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Réponses IA générées
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {formatNumber(balance?.total_used ?? 0)}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">
            messages traités par l&apos;IA
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

      {/* Packages Section */}
      <div style={stagger(2)}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Packs de crédits IA
          </h2>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {AI_PRICING_TIERS.map((tier) => (
            <div
              key={tier.label}
              className="rounded-xl border border-blue-200/70 bg-blue-50/50 p-4"
            >
              <p className="text-[12px] font-semibold text-slate-900">{tier.label}</p>
              <p className="mt-1 text-[20px] font-bold text-blue-700">{tier.rate} FCFA</p>
              <p className="text-[11px] text-slate-500">par message IA</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {packages.map((pkg, i) => {
            const effectiveUnitPrice = getAIRate(pkg.message_count)
            const effectiveTotalPrice = getAITotalPrice(pkg.message_count)
            const isBest = effectiveUnitPrice === 2
            return (
              <div
                key={pkg.id || pkg.code}
                className={`relative rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${
                  isBest
                    ? "border-blue-300 bg-gradient-to-b from-blue-50 to-sky-50/50 ring-1 ring-blue-200"
                    : "border-border/40 bg-white hover:border-border"
                }`}
                style={stagger(i + 3)}
                onClick={() => {
                  setSelectedPackage(pkg)
                  setRequestDialogOpen(true)
                }}
              >
                {isBest && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-[10px] px-2 py-0.5 font-semibold">
                      Meilleur prix
                    </Badge>
                  </div>
                )}
                {pkg.discount_percent > 0 && !isBest && (
                  <div className="absolute -top-2 right-3">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
                      -{pkg.discount_percent}%
                    </Badge>
                  </div>
                )}

                <div className="text-center space-y-2 pt-1">
                  <p className="text-[12px] font-semibold text-muted-foreground">
                    {pkg.code}
                  </p>
                  <p className="text-[22px] font-bold tracking-tight">
                    {formatNumber(pkg.message_count)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">messages IA</p>

                  <div className="border-t border-border/40 pt-3 mt-3">
                    <p className="text-[16px] font-bold text-foreground">
                      {formatNumber(effectiveTotalPrice)}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground">FCFA</span>
                    </p>
                    <p className={`text-[11px] mt-0.5 ${
                      isBest ? "text-primary font-semibold" : "text-muted-foreground"
                    }`}>
                      {effectiveUnitPrice} FCFA/msg
                    </p>
                  </div>

                  <Button
                    size="sm"
                    className="w-full h-8 text-[12px] rounded-lg mt-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPackage(pkg)
                      setRequestDialogOpen(true)
                    }}
                  >
                    Demander
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50/60 border border-emerald-200/60 px-3 py-2.5">
          <Gift className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-[12px] text-emerald-700">
            <span className="font-semibold">Bonus :</span> Chaque achat ou recharge WhatsApp vous offre automatiquement{" "}
            <span className="font-semibold">3 000 crédits IA gratuits</span> !
          </p>
        </div>
      </div>

      {/* My Requests Section */}
      <div style={stagger(3)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
              Mes demandes
            </h2>
          </div>
          <select
            className="h-7 rounded-lg border border-gray-200 bg-white px-2 text-[11px]"
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
                Sélectionnez un pack ci-dessus pour envoyer une demande.
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
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">
                          {req.package_name || req.package_code}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatNumber(req.credits_amount)} crédits &middot; {formatNumber(req.total_price_fcfa)} FCFA &middot; {formatDate(req.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
      <div style={stagger(4)}>
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
                Vos transactions de crédits IA apparaîtront ici.
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
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Détails</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Crédits</th>
                  </tr>
                </thead>
                <tbody>
                  {txLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                        <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : (
                    transactions.map((tx) => {
                      const meta = txTypeMeta[tx.type] || txTypeMeta.adjustment
                      const Icon = meta.icon
                      const isPositive = tx.amount > 0
                      return (
                        <tr key={tx.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                            {formatDate(tx.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}>
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-foreground max-w-xs truncate">
                            {tx.description}
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

            {pagination && pagination.total > TX_LIMIT && (
              <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">
                  {txOffset + 1}–{Math.min(txOffset + TX_LIMIT, pagination.total)} sur {formatNumber(pagination.total)}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" disabled={txOffset === 0 || txLoading} onClick={handlePrevPage}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" disabled={!pagination.has_more || txLoading} onClick={handleNextPage}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Request Dialog ── */}
      {requestDialogOpen && selectedPackage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          onClick={() => {
            setRequestDialogOpen(false)
            setSelectedPackage(null)
            setPaymentProof(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setRequestDialogOpen(false)
              setSelectedPackage(null)
              setPaymentProof(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                  <CreditCard className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900">
                    Demander des crédits IA
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Votre demande sera validée par un administrateur
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                onClick={() => {
                  setRequestDialogOpen(false)
                  setSelectedPackage(null)
                  setPaymentProof(null)
                }}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Selected package summary */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">
                    {selectedPackage.name}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {formatNumber(selectedPackage.message_count)} messages &middot; {getAIRate(selectedPackage.message_count)} FCFA/msg
                  </p>
                </div>
                <p className="text-[18px] font-bold text-blue-700">
                  {formatNumber(getAITotalPrice(selectedPackage.message_count))}{" "}
                  <span className="text-[11px] font-normal">FCFA</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Payment method */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">Moyen de paiement</Label>
                <select
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="mobile_money">Mobile Money</option>
                  <option value="airtel_money">Airtel Money</option>
                  <option value="bank_transfer">Virement bancaire</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Payment proof */}
              <div className="space-y-1.5">
                <Label className="text-[13px]">Preuve de paiement</Label>
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
                  className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {paymentProof ? (
                    <div className="flex items-center gap-2 text-center">
                      <FileImage className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[12px] font-medium text-gray-700">{paymentProof.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {(paymentProof.size / 1024).toFixed(0)} Ko
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-5 w-5 text-gray-300 mx-auto mb-1" />
                      <p className="text-[12px] text-gray-400">
                        Capture d&apos;écran ou reçu de paiement
                      </p>
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        Image ou PDF
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-lg px-4 text-[13px]"
                  onClick={() => {
                    setRequestDialogOpen(false)
                    setSelectedPackage(null)
                    setPaymentProof(null)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  className="h-9 rounded-lg px-5 text-[13px] gap-2"
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
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
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-gray-900">Détail de la demande</h3>
              <button
                type="button"
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setDetailRequest(null)}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Pack</p>
                  <p className="text-[13px] font-medium">{detailRequest.package_name || detailRequest.package_code}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Crédits</p>
                  <p className="text-[13px] font-medium">{formatNumber(detailRequest.credits_amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Montant</p>
                  <p className="text-[13px] font-medium">{formatNumber(detailRequest.total_price_fcfa)} FCFA</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Paiement</p>
                  <p className="text-[13px] font-medium">
                    {detailRequest.payment_method === "mobile_money"
                      ? "Mobile Money"
                      : detailRequest.payment_method === "airtel_money"
                      ? "Airtel Money"
                      : detailRequest.payment_method === "bank_transfer"
                      ? "Virement bancaire"
                      : "Cash"}
                  </p>
                </div>
                {detailRequest.payment_reference && (
                  <div className="col-span-2">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide">Référence</p>
                    <p className="text-[13px] font-mono">{detailRequest.payment_reference}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Date</p>
                  <p className="text-[13px]">{formatDate(detailRequest.created_at)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Statut</p>
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
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Preuve de paiement</p>
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
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
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
