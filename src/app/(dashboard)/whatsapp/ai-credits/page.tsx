"use client"

import { useEffect, useState, useCallback } from "react"
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
import { PaginationControls } from "@/components/ui/pagination-controls"
import { toast } from "sonner"
import type { Icon } from "@phosphor-icons/react"
import {
  ChartLineUp,
  CheckCircle,
  Clock,
  ClockCounterClockwise,
  CreditCard,
  FileImage,
  FileText,
  Gift,
  Lightning,
  Package,
  Prohibit,
  Robot,
  Sparkle,
  Spinner,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react"

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

const formatNumber = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n)

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const resolveCreditsAmount = (request: AICreditRequest): number => {
  const direct = toFiniteNumber(request.credits_amount)
  if (direct !== null) return direct
  const codeMatch = request.package_code?.match(/(\d+)/)
  const fromCode = codeMatch ? Number(codeMatch[1]) : NaN
  if (Number.isFinite(fromCode)) return fromCode
  return 0
}

const resolveTotalPrice = (request: AICreditRequest): number => {
  const direct = toFiniteNumber(request.total_price_fcfa)
  if (direct !== null) return direct
  return resolveCreditsAmount(request) * AI_UNIT_PRICE_FCFA
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const AI_UNIT_PRICE_FCFA = 3
const ALLOWED_AI_PACKAGE_CODES = ["AI-1000", "AI-5000", "AI-10000", "AI-25000"] as const
const ALLOWED_AI_PACKAGE_CODE_SET = new Set<string>(ALLOWED_AI_PACKAGE_CODES)
const ALLOWED_AI_PACKAGE_ORDER = new Map<string, number>(ALLOWED_AI_PACKAGE_CODES.map((code, index) => [code, index]))
type MobileMoneyOperator = "mtn" | "airtel"

const PHONE_PREFIX_BY_OPERATOR: Record<MobileMoneyOperator, string> = {
  mtn: "24206",
  airtel: "24205",
}
const PHONE_MAX_DIGITS = 12
const getPhonePrefix = (operator: MobileMoneyOperator) => PHONE_PREFIX_BY_OPERATOR[operator]
const getPhoneSuffixMaxDigits = (operator: MobileMoneyOperator) => PHONE_MAX_DIGITS - getPhonePrefix(operator).length

const resolvePackageMessages = (code?: string, fallback?: number): number => {
  if (code && ALLOWED_AI_PACKAGE_CODE_SET.has(code) && typeof fallback === "number" && Number.isFinite(fallback)) {
    return fallback
  }
  if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback
  return 0
}

const resolvePackageUnitPrice = (pkg: Pick<AIPackage, "unit_price_fcfa">): number =>
  toFiniteNumber(pkg.unit_price_fcfa) ?? AI_UNIT_PRICE_FCFA

const resolvePackageTotalPrice = (pkg: Pick<AIPackage, "message_count" | "total_price_fcfa" | "unit_price_fcfa">): number =>
  toFiniteNumber(pkg.total_price_fcfa) ?? (resolvePackageMessages(undefined, pkg.message_count) * resolvePackageUnitPrice(pkg))

const txTypeMeta: Record<string, { label: string; color: string; bg: string; icon: Icon }> = {
  purchase: {
    label: "Achat",
    color: "text-primary",
    bg: "border-primary/30 bg-primary/10",
    icon: CreditCard,
  },
  bonus: {
    label: "Bonus",
    color: "text-foreground",
    bg: "border-border/60 bg-accent/50",
    icon: Gift,
  },
  consumption: {
    label: "Consommation",
    color: "text-muted-foreground",
    bg: "border-border/50 bg-muted/30",
    icon: Lightning,
  },
  adjustment: {
    label: "Ajustement",
    color: "text-muted-foreground",
    bg: "border-border/60 bg-muted/40",
    icon: ChartLineUp,
  },
}

const requestStatusMeta: Record<string, { label: string; color: string; bg: string; icon: Icon }> = {
  pending: {
    label: "En attente",
    color: "text-primary/80",
    bg: "border-primary/20 bg-primary/5",
    icon: Clock,
  },
  approved: {
    label: "Approuvée",
    color: "text-foreground",
    bg: "border-border/60 bg-accent",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejetée",
    color: "text-destructive",
    bg: "border-destructive/30 bg-destructive/10",
    icon: XCircle,
  },
  cancelled: {
    label: "Annulée",
    color: "text-muted-foreground",
    bg: "border-border/60 bg-muted/40",
    icon: Prohibit,
  },
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
  const [paymentStep, setPaymentStep] = useState<"form" | "processing" | "done">("form")
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [payerFirstName, setPayerFirstName] = useState("")
  const [payerLastName, setPayerLastName] = useState("")
  const [payerPhoneSuffix, setPayerPhoneSuffix] = useState("")
  const [payerOperator, setPayerOperator] = useState<MobileMoneyOperator>("mtn")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

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

  const loadAll = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    loadAll()
  }, [currentOrganization?.id, loadAll])

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
    if (isSubmitting) return
    if (!selectedPackage) return
    if (!ALLOWED_AI_PACKAGE_CODE_SET.has(selectedPackage.code)) {
      toast.error("Pack invalide. Veuillez sélectionner un pack autorisé.")
      return
    }
    if (!payerFirstName.trim() || !payerLastName.trim() || !payerPhoneSuffix.trim()) {
      toast.error("Veuillez remplir prénom, nom et téléphone.")
      return
    }
    setIsSubmitting(true)
    setPaymentStep("processing")
    setPaymentIntentId(null)
    try {
      const amount = resolvePackageTotalPrice(selectedPackage)
      const intentRes = await aiCreditsService.createYabetooRechargeIntent(
        selectedPackage.code,
        amount,
        `Pack ${selectedPackage.code}`
      )
      setPaymentIntentId(intentRes.intentId)
      const confirmRes = await aiCreditsService.confirmYabetooPayment(
        {
          intent_id: intentRes.intentId,
          client_secret: intentRes.clientSecret,
          first_name: payerFirstName,
          last_name: payerLastName,
          phone: `${getPhonePrefix(payerOperator)}${payerPhoneSuffix}`,
          operator: payerOperator,
        }
      )
      if (confirmRes.status === "succeeded") {
        toast.success("Payé ! Vos crédits IA ont été ajoutés.")
        closeRequestDialog()
        loadAll()
      } else {
        setPaymentStep("done")
        try {
          const waitRes = await aiCreditsService.waitYabetooPayment(intentRes.intentId)
          if (waitRes.status === "succeeded") {
            toast.success("Payé ! Vos crédits IA ont été ajoutés.")
            closeRequestDialog()
            loadAll()
          } else if (waitRes.status === "failed") {
            toast.error(waitRes.failureMessage ?? "Paiement échoué. Veuillez réessayer.")
            setPaymentIntentId(null)
            setPaymentStep("form")
          }
        } catch {
          // Le paiement reste en attente si le long-poll expire ou perd la connexion.
        }
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
      setPaymentIntentId(null)
      setPaymentStep("form")
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeRequestDialog = () => {
    setRequestDialogOpen(false)
    setSelectedPackage(null)
    setPaymentStep("form")
    setPaymentIntentId(null)
    setPayerFirstName("")
    setPayerLastName("")
    setPayerPhoneSuffix("")
    setPayerOperator("mtn")
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

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-44" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    )
  }

  if (currentOrganization && userRole && userRole !== "owner") {
    return null
  }

  const isLowBalance = balance && balance.balance > 0 && balance.balance < 100
  const isEmptyBalance = balance && balance.balance === 0
  const pendingRequests = requests.filter((r) => r.status === "pending")
  const displayPackages: AIPackage[] = packages
    .filter((pkg) => ALLOWED_AI_PACKAGE_CODE_SET.has(pkg.code))
    .sort((a, b) => (ALLOWED_AI_PACKAGE_ORDER.get(a.code) ?? 999) - (ALLOWED_AI_PACKAGE_ORDER.get(b.code) ?? 999))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div style={stagger(0)}>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Crédits IA</h1>
        <p className="mt-0.5 max-w-xl text-[13px] text-muted-foreground">
          Gérez vos crédits pour les réponses automatiques de l&apos;agent IA
        </p>
      </div>

      {/* Balance + Stats */}
      <div className="grid gap-4 sm:grid-cols-2" style={stagger(1)}>
        {/* Balance Card */}
        <div
          className={`rounded-2xl border p-5 shadow-sm transition-colors duration-300 ${
            isEmptyBalance
              ? "border-destructive/35 bg-destructive/10"
              : isLowBalance
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-border/50 bg-card/60 hover:border-border/70"
          }`}
        >
          <div className="mb-3 flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
                isEmptyBalance
                  ? "bg-destructive/15 ring-destructive/25"
                  : isLowBalance
                    ? "bg-amber-500/15 ring-amber-500/25"
                    : "bg-primary/12 ring-primary/20"
              }`}
            >
              {isEmptyBalance ? (
                <WarningCircle className="h-5 w-5 text-destructive" weight="fill" />
              ) : (
                <Sparkle
                  className={`h-5 w-5 ${isLowBalance ? "text-amber-300" : "text-primary"}`}
                  weight="fill"
                />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Solde disponible
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {formatNumber(balance?.balance ?? 0)}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">crédits IA restants</p>
          {isEmptyBalance && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5">
              <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" weight="fill" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                L&apos;auto-reply IA est désactivée car votre solde est épuisé.
              </p>
            </div>
          )}
          {isLowBalance && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
              <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" weight="fill" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Solde faible. Rechargez pour éviter une interruption.
              </p>
            </div>
          )}
        </div>

        {/* Usage Card */}
        <div className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm transition-all duration-300 hover:border-border/70 hover:bg-card/75">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
              <Robot className="h-5 w-5 text-primary" weight="fill" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Réponses IA générées
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {formatNumber(balance?.total_used ?? 0)}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">messages traités par l&apos;IA</p>
          {pendingRequests.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" weight="bold" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {pendingRequests.length} paiement{pendingRequests.length > 1 ? "s" : ""} en attente
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Packages Section */}
      <div style={stagger(2)}>
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" weight="duotone" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Packs de crédits IA
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayPackages.map((pkg, i) => {
            return (
              <div
                key={pkg.id || pkg.code}
                className="relative cursor-pointer rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/80 hover:shadow-md"
                style={stagger(i + 3)}
                onClick={() => {
                  setSelectedPackage(pkg)
                  setRequestDialogOpen(true)
                }}
              >
                <div className="text-center space-y-2 pt-1">
                  <p className="text-[12px] font-semibold text-muted-foreground">
                    {pkg.code}
                  </p>
                  <p className="text-[22px] font-bold tracking-tight">
                    {formatNumber(pkg.message_count)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">crédits IA</p>

                  <div className="mt-3 border-t border-border/40 pt-3">
                    <p className="text-[16px] font-bold text-foreground">
                      {formatNumber(resolvePackageTotalPrice(pkg))}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground">FCFA</span>
                    </p>
                    <p className="text-[11px] mt-0.5 text-muted-foreground">
                      {resolvePackageUnitPrice(pkg)} FCFA/msg
                    </p>
                  </div>

                  <Button
                    size="sm"
                    className="mt-2 h-8 w-full rounded-xl text-[12px] font-semibold"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedPackage(pkg)
                      setRequestDialogOpen(true)
                    }}
                  >
                    Payer
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm sm:flex-row sm:items-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
            <Gift className="h-4 w-4 text-primary" weight="fill" />
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-primary">Bonus :</span> Chaque achat ou recharge WhatsApp vous offre
            automatiquement <span className="font-semibold text-foreground">3 000 crédits IA gratuits</span> !
          </p>
        </div>
      </div>

      {/* My Requests Section */}
      <div style={stagger(3)}>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" weight="duotone" />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Paiements
            </h2>
          </div>
          <select
            className="h-9 min-w-[8.5rem] rounded-xl border border-border/60 bg-card/80 px-3 text-[12px] text-foreground transition-colors hover:border-border"
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
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border/60 bg-card/40 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 ring-1 ring-border/50">
                <FileText className="h-6 w-6 text-muted-foreground" weight="duotone" />
              </div>
              <p className="text-[13px] font-medium text-foreground">Aucun paiement</p>
              <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground">
                Sélectionnez un pack ci-dessus pour payer.
              </p>
              {displayPackages.length > 0 && (
                <Button
                  size="sm"
                  className="mt-1 rounded-xl font-semibold"
                  onClick={() => {
                    const first = displayPackages[0]
                    if (first) {
                      setSelectedPackage(first)
                      setRequestDialogOpen(true)
                    }
                  }}
                >
                  Choisir un pack
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => {
              const meta = requestStatusMeta[req.status] || requestStatusMeta.pending
              const StatusIcon = meta.icon
              const creditsAmount = resolveCreditsAmount(req)
              const totalPrice = resolveTotalPrice(req)
              return (
                <div
                  key={req.id}
                  className="cursor-pointer rounded-2xl border border-border/50 bg-card/40 p-4 transition-all duration-200 hover:border-border hover:bg-card/60"
                  onClick={() => setDetailRequest(req)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/15">
                        <Package className="h-4 w-4 text-primary" weight="fill" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">
                          {req.package_name || req.package_code}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatNumber(creditsAmount)} crédits &middot; {formatNumber(totalPrice)} FCFA &middot; {formatDate(req.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}
                      >
                        <StatusIcon className="h-3 w-3" weight="bold" />
                        {meta.label}
                      </span>
                      {req.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          disabled={cancellingId === req.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelRequest(req.id)
                          }}
                        >
                          {cancellingId === req.id ? (
                            <Spinner className="h-3 w-3 animate-spin" weight="bold" />
                          ) : (
                            <Prohibit className="h-3 w-3" weight="bold" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {req.status === "rejected" && req.review_note && (
                    <div className="mt-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-destructive">Motif :</span> {req.review_note}
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
        <div className="mb-3 flex items-center gap-2">
          <ClockCounterClockwise className="h-4 w-4 text-muted-foreground" weight="duotone" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Historique des transactions
          </h2>
        </div>

        {transactions.length === 0 && !txLoading ? (
          <Card className="rounded-2xl border border-dashed border-border/60 bg-card/40 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-14">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 ring-1 ring-border/50">
                <ClockCounterClockwise className="h-6 w-6 text-muted-foreground" weight="duotone" />
              </div>
              <p className="text-[13px] font-medium text-foreground">Aucune transaction</p>
              <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground">
                Vos transactions de crédits IA apparaîtront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/30 shadow-sm">
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
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}
                            >
                              <Icon className="h-3 w-3" weight="bold" />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-foreground max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right text-[13px] font-semibold ${
                              isPositive ? "text-primary" : "text-destructive"
                            }`}
                          >
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
                <PaginationControls
                  page={Math.floor(txOffset / TX_LIMIT) + 1}
                  totalPages={Math.max(1, Math.ceil(pagination.total / TX_LIMIT))}
                  onPageChange={(nextPage) => {
                    const newOffset = (nextPage - 1) * TX_LIMIT
                    setTxOffset(newOffset)
                    loadTransactions(newOffset)
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
      {requestDialogOpen && selectedPackage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={closeRequestDialog}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              closeRequestDialog()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
                  <CreditCard className="h-5 w-5 text-primary" weight="fill" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-foreground">
                    Payer des crédits IA
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Recharge immédiate par Mobile Money
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={closeRequestDialog}
                aria-label="Fermer"
              >
                <XCircle className="h-5 w-5" weight="regular" />
              </button>
            </div>

            {/* Selected package summary */}
            <div className="mb-5 rounded-2xl border border-primary/25 bg-primary/10 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {selectedPackage.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatNumber(resolvePackageMessages(selectedPackage.code, selectedPackage.message_count))} messages &middot; {resolvePackageUnitPrice(selectedPackage)} FCFA/msg
                  </p>
                </div>
                <p className="text-[18px] font-bold text-primary">
                  {formatNumber(resolvePackageTotalPrice(selectedPackage))}{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">FCFA</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {paymentStep === "done" ? (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5 text-center space-y-3">
                  <Clock className="h-8 w-8 text-amber-300 mx-auto" weight="duotone" />
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">Paiement en cours de traitement</p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      Validez le paiement sur votre téléphone. Vos crédits IA seront ajoutés dès confirmation de l&apos;opérateur.
                    </p>
                    {paymentIntentId && (
                      <p className="text-[11px] text-muted-foreground/60 mt-2 font-mono">Réf : {paymentIntentId}</p>
                    )}
                  </div>
                  <Button className="h-9 rounded-xl px-5 text-[13px]" onClick={closeRequestDialog}>
                    Fermer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Prénom *</Label>
                      <Input
                        value={payerFirstName}
                        onChange={(e) => setPayerFirstName(e.target.value)}
                        className="h-9 rounded-lg text-[13px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Nom *</Label>
                      <Input
                        value={payerLastName}
                        onChange={(e) => setPayerLastName(e.target.value)}
                        className="h-9 rounded-lg text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Téléphone *</Label>
                    <div className="flex h-9 overflow-hidden rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-center px-3 text-[13px] font-medium text-muted-foreground">
                        {getPhonePrefix(payerOperator)}
                      </div>
                      <div className="w-px bg-border/60" />
                      <input
                        value={payerPhoneSuffix}
                        inputMode="numeric"
                        onChange={(e) => {
                          const digitsOnly = e.currentTarget.value.replace(/\D/g, "")
                          setPayerPhoneSuffix(digitsOnly.slice(0, getPhoneSuffixMaxDigits(payerOperator)))
                        }}
                        placeholder="XXXXXXX"
                        className="h-full w-full bg-transparent px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[13px]">Opérateur</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPayerOperator("mtn")
                          setPayerPhoneSuffix((value) => value.slice(0, getPhoneSuffixMaxDigits("mtn")))
                        }}
                        className={
                          payerOperator === "mtn"
                            ? "h-9 rounded-lg border border-primary/40 bg-primary/10 text-[13px] font-medium text-primary"
                            : "h-9 rounded-lg border border-border/60 bg-card text-[13px] font-medium text-muted-foreground hover:bg-muted/30"
                        }
                      >
                        MTN MoMo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPayerOperator("airtel")
                          setPayerPhoneSuffix((value) => value.slice(0, getPhoneSuffixMaxDigits("airtel")))
                        }}
                        className={
                          payerOperator === "airtel"
                            ? "h-9 rounded-lg border border-primary/40 bg-primary/10 text-[13px] font-medium text-primary"
                            : "h-9 rounded-lg border border-border/60 bg-card text-[13px] font-medium text-muted-foreground hover:bg-muted/30"
                        }
                      >
                        Airtel Money
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="h-9 rounded-xl px-4 text-[13px]"
                      onClick={closeRequestDialog}
                    >
                      Annuler
                    </Button>
                    <Button
                      className="h-9 gap-2 rounded-xl px-5 text-[13px] font-semibold"
                      onClick={handleSubmitRequest}
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" />}
                      Payer {formatNumber(resolvePackageTotalPrice(selectedPackage))} XAF
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Dialog ── */}
      {detailRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setDetailRequest(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDetailRequest(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-foreground">Détail du paiement</h3>
              <button
                type="button"
                className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setDetailRequest(null)}
                aria-label="Fermer"
              >
                <XCircle className="h-5 w-5" weight="regular" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">Pack</p>
                  <p className="text-[13px] font-medium">{detailRequest.package_name || detailRequest.package_code}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">Crédits</p>
                  <p className="text-[13px] font-medium">{formatNumber(resolveCreditsAmount(detailRequest))}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">Montant</p>
                  <p className="text-[13px] font-medium">{formatNumber(resolveTotalPrice(detailRequest))} FCFA</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">Paiement</p>
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
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}
                      >
                        <StatusIcon className="h-3 w-3" weight="bold" />
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
                    <FileImage className="h-3.5 w-3.5" weight="duotone" />
                    Voir la preuve
                  </a>
                </div>
              )}
              {detailRequest.review_note && (
                <div
                  className={`rounded-xl border px-3 py-2 ${
                    detailRequest.status === "rejected"
                      ? "border-destructive/25 bg-destructive/5"
                      : "border-emerald-500/25 bg-emerald-500/10"
                  }`}
                >
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Note de l&apos;administrateur
                  </p>
                  <p
                    className={`text-[12px] leading-relaxed ${
                      detailRequest.status === "rejected" ? "text-destructive" : "text-emerald-300"
                    }`}
                  >
                    {detailRequest.review_note}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="outline" className="h-9 rounded-xl px-4 text-[13px]" onClick={() => setDetailRequest(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
