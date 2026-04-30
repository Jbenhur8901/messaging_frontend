"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { whatsappService } from "@/services/whatsapp"
import { handleApiError } from "@/services"
import { useOrganizationStore } from "@/stores"
import type {
  WhatsAppCreditBalance,
  WhatsAppCreditPackage,
  WhatsAppCreditTransaction,
} from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { toast } from "sonner"
import {
  Wallet,
  Loader2,
  CreditCard,
  XCircle,
  Clock,
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

// ── Bouquets ──

const CAT = {
  marketing: { label: "Marketing", shortLabel: "M", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", rate: 18 },
  utility: { label: "Utility", shortLabel: "U", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", rate: 6 },
  authentication: { label: "Auth", shortLabel: "A", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", rate: 6 },
  topup: { label: "Libres", shortLabel: "F", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", rate: 0 },
} as const

type CatKey = keyof typeof CAT

type PkgItem = { code: string; name: string; messages: number; unitPrice: number; discount: number; totalPrice: number }
type MobileMoneyOperator = "mtn" | "airtel"

const PHONE_PREFIX_BY_OPERATOR: Record<MobileMoneyOperator, string> = {
  mtn: "24206",
  airtel: "24205",
}
const PHONE_MAX_DIGITS = 12
const getPhonePrefix = (operator: MobileMoneyOperator) => PHONE_PREFIX_BY_OPERATOR[operator]
const getPhoneSuffixMaxDigits = (operator: MobileMoneyOperator) => PHONE_MAX_DIGITS - getPhonePrefix(operator).length

const FALLBACK_PACKAGES: Record<CatKey, PkgItem[]> = {
  marketing: [
    { code: "M-500", name: "500 msgs", messages: 500, unitPrice: 18, discount: 0, totalPrice: 9_000 },
    { code: "M-1000", name: "1 000 msgs", messages: 1_000, unitPrice: 18, discount: 0, totalPrice: 18_000 },
    { code: "M-5000", name: "5 000 msgs", messages: 5_000, unitPrice: 18, discount: 0, totalPrice: 90_000 },
    { code: "M-10000", name: "10 000 msgs", messages: 10_000, unitPrice: 18, discount: 0, totalPrice: 180_000 },
    { code: "M-25000", name: "25 000 msgs", messages: 25_000, unitPrice: 17, discount: 6, totalPrice: 425_000 },
    { code: "M-40000", name: "40 000 msgs", messages: 40_000, unitPrice: 16, discount: 11, totalPrice: 640_000 },
  ],
  utility: [
    { code: "U-1000", name: "1 000 msgs", messages: 1_000, unitPrice: 6, discount: 0, totalPrice: 6_000 },
    { code: "U-5000", name: "5 000 msgs", messages: 5_000, unitPrice: 6, discount: 0, totalPrice: 30_000 },
    { code: "U-10000", name: "10 000 msgs", messages: 10_000, unitPrice: 6, discount: 0, totalPrice: 60_000 },
  ],
  authentication: [
    { code: "A-1000", name: "1 000 msgs", messages: 1_000, unitPrice: 6, discount: 0, totalPrice: 6_000 },
    { code: "A-5000", name: "5 000 msgs", messages: 5_000, unitPrice: 6, discount: 0, totalPrice: 30_000 },
    { code: "A-10000", name: "10 000 msgs", messages: 10_000, unitPrice: 6, discount: 0, totalPrice: 60_000 },
  ],
  topup: [
    { code: "TOP-S", name: "5 000 FCFA", messages: 0, unitPrice: 0, discount: 0, totalPrice: 5_000 },
    { code: "TOP-M", name: "15 000 FCFA", messages: 0, unitPrice: 0, discount: 0, totalPrice: 15_000 },
    { code: "TOP-L", name: "30 000 FCFA", messages: 0, unitPrice: 0, discount: 0, totalPrice: 30_000 },
    { code: "TOP-XL", name: "50 000 FCFA", messages: 0, unitPrice: 0, discount: 0, totalPrice: 50_000 },
  ],
}

const txTypeMeta: Record<string, { label: string; color: string; bg: string }> = {
  purchase: { label: "Achat", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  consumption: { label: "Consommation", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  refund: { label: "Remboursement", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  expiration: { label: "Expiration", color: "text-red-700", bg: "bg-red-50 border-red-200" },
}

// ── Page ──

export default function WhatsAppCreditsPage() {
  const router = useRouter()
  const { organizations, currentOrganization } = useOrganizationStore()
  const [balance, setBalance] = useState<WhatsAppCreditBalance | null>(null)
  const [transactions, setTransactions] = useState<WhatsAppCreditTransaction[]>([])
  const [packagesByCategory, setPackagesByCategory] = useState<Record<CatKey, PkgItem[]>>(FALLBACK_PACKAGES)
  const [isLoading, setIsLoading] = useState(true)

  // Purchase dialog state
  const [selectedPkg, setSelectedPkg] = useState<{ item: PkgItem; category: CatKey } | null>(null)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [paymentTab, setPaymentTab] = useState<"mobile_money" | "card">("mobile_money")
  const [purchaseStep, setPurchaseStep] = useState<"form" | "processing" | "done">("form")
  const [purchaseIntentId, setPurchaseIntentId] = useState<string | null>(null)

  // Checkout block state (UI)
  const [payerFirstName, setPayerFirstName] = useState("")
  const [payerLastName, setPayerLastName] = useState("")
  const [payerEmail, setPayerEmail] = useState("")
  const [payerPhoneSuffix, setPayerPhoneSuffix] = useState("")
  const [payerOperator, setPayerOperator] = useState<MobileMoneyOperator>("mtn")

  // Custom top-up dialog
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [isTopping, setIsTopping] = useState(false)
  const [topUpPaymentTab, setTopUpPaymentTab] = useState<"mobile_money" | "card">("mobile_money")
  const [topUpStep, setTopUpStep] = useState<"form" | "processing" | "done">("form")
  const [topUpIntentId, setTopUpIntentId] = useState<string | null>(null)
  const [topUpPayerFirstName, setTopUpPayerFirstName] = useState("")
  const [topUpPayerLastName, setTopUpPayerLastName] = useState("")
  const [topUpPayerPhoneSuffix, setTopUpPayerPhoneSuffix] = useState("")
  const [topUpPayerOperator, setTopUpPayerOperator] = useState<MobileMoneyOperator>("mtn")
  const [topUpPayerEmail, setTopUpPayerEmail] = useState("")

  // Active category tab
  const [activeTab, setActiveTab] = useState<CatKey>("marketing")

  // Transaction pagination
  const [txPage, setTxPage] = useState(1)
  const TX_LIMIT = 20
  const [txTypeFilter, setTxTypeFilter] = useState("all")
  const [txCompartmentFilter, setTxCompartmentFilter] = useState("all")
  const userRole = organizations.find((org) => org.id === currentOrganization?.id)?.role

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [balanceRes, txRes, marketingRes, utilityRes, authRes, topupRes] = await Promise.allSettled([
        whatsappService.getWhatsAppBalance(),
        whatsappService.getWhatsAppTransactions(),
        whatsappService.getPackages("marketing"),
        whatsappService.getPackages("utility"),
        whatsappService.getPackages("authentication"),
        whatsappService.getPackages("topup"),
      ])
      if (balanceRes.status === "fulfilled") setBalance(balanceRes.value)
      if (txRes.status === "fulfilled") setTransactions(txRes.value.transactions || [])
      const mapPackages = (packages: WhatsAppCreditPackage[] | undefined): PkgItem[] =>
        (packages || []).map((pkg) => {
          const messages = pkg.message_count ?? pkg.messages_included ?? 0
          const totalPrice = pkg.total_price_fcfa ?? pkg.price_fcfa ?? 0
          const unitPrice = pkg.unit_price_fcfa ?? (messages > 0 ? Math.round(totalPrice / messages) : 0)
          return {
            code: pkg.code,
            name: pkg.name,
            messages,
            unitPrice,
            discount: pkg.discount_percent ? Math.round(pkg.discount_percent) : 0,
            totalPrice,
          }
        })
      const resolvePackages = (res: typeof marketingRes, fallback: PkgItem[]): PkgItem[] => {
        if (res.status !== "fulfilled") return fallback
        const mapped = mapPackages(res.value.packages)
        return mapped.length > 0 ? mapped : fallback
      }
      setPackagesByCategory({
        marketing: resolvePackages(marketingRes, FALLBACK_PACKAGES.marketing),
        utility: resolvePackages(utilityRes, FALLBACK_PACKAGES.utility),
        authentication: resolvePackages(authRes, FALLBACK_PACKAGES.authentication),
        topup: resolvePackages(topupRes, FALLBACK_PACKAGES.topup),
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (currentOrganization && userRole && userRole !== "owner") {
      toast.error("La facturation est réservée au propriétaire de l'organisation")
      router.replace("/dashboard")
    }
  }, [currentOrganization, router, userRole])

  const handlePurchase = async () => {
    if (!selectedPkg) return
    if (!payerFirstName.trim() || !payerLastName.trim() || !payerPhoneSuffix.trim()) {
      toast.error("Veuillez remplir prénom, nom et téléphone.")
      return
    }
    setIsPurchasing(true)
    setPurchaseStep("processing")
    setPurchaseIntentId(null)
    try {
      const intentRes = await whatsappService.createYabetooRechargeIntent(
        selectedPkg.item.totalPrice,
        "agent_wallet",
        `Pack ${selectedPkg.item.code}`
      )
      setPurchaseIntentId(intentRes.intentId)
      const confirmRes = await whatsappService.confirmYabetooPayment({
        intent_id: intentRes.intentId,
        client_secret: intentRes.clientSecret,
        first_name: payerFirstName,
        last_name: payerLastName,
        phone: `${getPhonePrefix(payerOperator)}${payerPhoneSuffix}`,
        operator: payerOperator,
      })
      if (confirmRes.status === "succeeded") {
        toast.success("Payé ! Votre wallet a été crédité.")
        closePurchaseDialog()
        loadData()
      } else {
        setPurchaseStep("done")
        try {
          const waitRes = await whatsappService.waitYabetooPayment(intentRes.intentId)
          if (waitRes.status === "succeeded") {
            toast.success("Payé ! Votre wallet a été crédité.")
            closePurchaseDialog()
            loadData()
          } else if (waitRes.status === "failed") {
            toast.error(waitRes.failureMessage ?? "Paiement échoué. Veuillez réessayer.")
            setPurchaseIntentId(null)
            setPurchaseStep("form")
          }
        } catch {
          // Le paiement reste en attente si le long-poll expire ou perd la connexion.
        }
        // status "processing" après timeout → l'utilisateur voit l'état "en attente"
      }
    } catch (error) {
      toast.error(handleApiError(error).message)
      setPurchaseIntentId(null)
      setPurchaseStep("form")
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleStripeCheckout = async (amountXaf: number, description: string) => {
    try {
      const origin = window.location.origin
      const checkoutRes = await whatsappService.createStripeCheckout(
        amountXaf,
        `${origin}/whatsapp/credits/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/whatsapp/credits/stripe/cancel`,
        description
      )
      if (checkoutRes.checkoutUrl) {
        window.location.href = checkoutRes.checkoutUrl
        return
      }
      toast.error("Lien de paiement Stripe indisponible.")
    } catch (error) {
      toast.error(handleApiError(error).message)
    }
  }

  const handleTopUp = async () => {
    const amount = Number(topUpAmount)
    if (!amount) { toast.error("Montant requis"); return }
    if (!topUpPayerFirstName.trim() || !topUpPayerLastName.trim() || !topUpPayerPhoneSuffix.trim()) {
      toast.error("Veuillez remplir prénom, nom et téléphone.")
      return
    }
    setIsTopping(true)
    setTopUpStep("processing")
    setTopUpIntentId(null)
    try {
      const intentRes = await whatsappService.createYabetooRechargeIntent(amount, "agent_wallet", "Recharge personnalisée")
      setTopUpIntentId(intentRes.intentId)
      const confirmRes = await whatsappService.confirmYabetooPayment({
        intent_id: intentRes.intentId,
        client_secret: intentRes.clientSecret,
        first_name: topUpPayerFirstName,
        last_name: topUpPayerLastName,
        phone: `${getPhonePrefix(topUpPayerOperator)}${topUpPayerPhoneSuffix}`,
        operator: topUpPayerOperator,
      })
      if (confirmRes.status === "succeeded") {
        toast.success("Payé ! Votre wallet a été crédité.")
        closeTopUpDialog()
        loadData()
      } else {
        setTopUpStep("done")
        try {
          const waitRes = await whatsappService.waitYabetooPayment(intentRes.intentId)
          if (waitRes.status === "succeeded") {
            toast.success("Payé ! Votre wallet a été crédité.")
            closeTopUpDialog()
            loadData()
          } else if (waitRes.status === "failed") {
            toast.error(waitRes.failureMessage ?? "Paiement échoué. Veuillez réessayer.")
            setTopUpIntentId(null)
            setTopUpStep("form")
          }
        } catch {
          // Le paiement reste en attente si le long-poll expire ou perd la connexion.
        }
        // status "processing" après timeout → l'utilisateur voit l'état "en attente"
      }
    } catch (error) {
      toast.error(handleApiError(error).message)
      setTopUpIntentId(null)
      setTopUpStep("form")
    } finally {
      setIsTopping(false)
    }
  }

  const closePurchaseDialog = () => {
    setSelectedPkg(null)
    setPaymentTab("mobile_money")
    setPurchaseStep("form")
    setPurchaseIntentId(null)
    setPayerFirstName("")
    setPayerLastName("")
    setPayerPhoneSuffix("")
    setPayerEmail("")
    setPayerOperator("mtn")
  }

  const closeTopUpDialog = () => {
    setTopUpDialogOpen(false)
    setTopUpAmount("")
    setTopUpStep("form")
    setTopUpIntentId(null)
    setTopUpPaymentTab("mobile_money")
    setTopUpPayerFirstName("")
    setTopUpPayerLastName("")
    setTopUpPayerPhoneSuffix("")
    setTopUpPayerOperator("mtn")
    setTopUpPayerEmail("")
  }

  const filteredTx = transactions.filter((tx) => {
    if (txTypeFilter !== "all" && tx.transaction_type !== txTypeFilter) return false
    if (txCompartmentFilter !== "all" && tx.compartment !== txCompartmentFilter) return false
    return true
  })

  const paginatedTx = filteredTx.slice((txPage - 1) * TX_LIMIT, txPage * TX_LIMIT)
  const totalTxPages = Math.ceil(filteredTx.length / TX_LIMIT) || 1

  const total = balance ? (balance.marketing.available + balance.utility.available + balance.authentication.available + balance.free.available) : 0

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-52" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    )
  }

  if (currentOrganization && userRole && userRole !== "owner") {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={stagger(0)}>
        <h1 className="text-xl font-semibold tracking-tight">Facturation WhatsApp</h1>
      </div>

      {/* Solde total + compartiments */}
      <div style={stagger(1)}>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Solde disponible</p>
            <p className="text-2xl font-semibold mt-1">
              {formatNumber(total)} <span className="text-sm font-normal text-muted-foreground">FCFA</span>
            </p>
          </div>
          {balance && (
            <div className="grid grid-cols-2 border-t border-border/40 lg:grid-cols-4">
              {(["marketing", "utility", "authentication", "topup"] as const).map((key) => {
                const c = CAT[key]
                const b = key === "topup" ? balance.free : balance[key]
                const msgs = c.rate > 0 ? Math.floor(b.available / c.rate) : null
                return (
                  <div key={key} className="border-r border-t border-border/30 px-4 py-3 first:border-t-0 lg:border-t-0">
                    <span className="text-[11px] font-medium text-muted-foreground">{c.label}</span>
                    <p className={`text-base font-semibold ${c.color}`}>{formatNumber(b.available)}</p>
                    {msgs !== null && <p className="text-[11px] text-muted-foreground">~{formatNumber(msgs)} msgs</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs + Packages */}
      <div style={stagger(2)}>
        {/* Tab selector */}
        <div className="flex gap-1.5 mb-4">
          {(Object.keys(CAT) as CatKey[]).map((key) => {
            const c = CAT[key]
            const isActive = activeTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
                  isActive
                    ? `${c.bg} ${c.color} border ${c.border}`
                    : "border-transparent text-muted-foreground hover:border-primary/45 hover:bg-primary/10 hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Package grid */}
        {(Object.entries(packagesByCategory) as [CatKey, PkgItem[]][]).map(([catKey, items]) => {
          if (catKey !== activeTab) return null
          const c = CAT[catKey]
          const isTopUp = catKey === "topup"
          return (
            <div key={catKey} className="space-y-4">
              <div className={`grid gap-3 ${items.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
                {items.map((item, i) => {
                  const isBest = item.discount >= 10
                  return (
                    <div
                      key={item.code}
                      className={`relative rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${
                        isBest
                          ? "border-primary/35 bg-card ring-1 ring-primary/25 hover:border-primary/55"
                          : "border-border/40 bg-card hover:border-border"
                      }`}
                      style={stagger(i + 3)}
                      onClick={() => {
                        setSelectedPkg({ item, category: catKey })
                      }}
                    >
                      {isBest && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-[10px] px-2 py-0.5 font-semibold">
                            Meilleur prix
                          </Badge>
                        </div>
                      )}
                      {item.discount > 0 && !isBest && (
                        <div className="absolute -top-2 right-3">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
                            -{item.discount}%
                          </Badge>
                        </div>
                      )}

                      <div className="text-center space-y-2 pt-1">
                        <p className="text-[12px] font-semibold text-muted-foreground">
                          {item.code}
                        </p>
                        <p className="text-[22px] font-bold tracking-tight">
                          {isTopUp ? item.name : formatNumber(item.messages)}
                        </p>

                        <div className="border-t border-border/40 pt-3 mt-3">
                          <p className="text-[16px] font-bold text-foreground">
                            {formatNumber(item.totalPrice)}{" "}
                            <span className="text-[11px] font-normal text-muted-foreground">FCFA</span>
                          </p>
                          {!isTopUp && (
                            <p className={`text-[11px] mt-0.5 ${isBest ? `${c.color} font-semibold` : "text-muted-foreground"}`}>
                              {item.unitPrice} FCFA/msg
                            </p>
                          )}
                          {isTopUp && (
                            <p className="text-[11px] mt-0.5 text-muted-foreground">
                              crédits libres
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          className="w-full h-8 text-[12px] rounded-lg mt-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPkg({ item, category: catKey })
                          }}
                        >
                          Payer
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Custom top-up CTA */}
              {isTopUp && (
                <div
                  className="flex items-center justify-between rounded-xl border border-border/50 p-4 cursor-pointer hover:bg-muted/20 transition-all"
                  onClick={() => setTopUpDialogOpen(true)}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Montant personnalisé</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-[12px] rounded-lg">
                    Recharger
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Transaction History */}
      <div style={stagger(3)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Transactions
          </h2>
          <div className="flex items-center gap-2">
            <select
              className="h-7 rounded-lg border border-border bg-card px-2 text-[11px]"
              value={txTypeFilter}
              onChange={(e) => { setTxTypeFilter(e.target.value); setTxPage(1) }}
            >
              <option value="all">Tous types</option>
              <option value="purchase">Achat</option>
              <option value="consumption">Consommation</option>
              <option value="refund">Remboursement</option>
              <option value="expiration">Expiration</option>
            </select>
            <select
              className="h-7 rounded-lg border border-border bg-card px-2 text-[11px]"
              value={txCompartmentFilter}
              onChange={(e) => { setTxCompartmentFilter(e.target.value); setTxPage(1) }}
            >
              <option value="all">Tous</option>
              <option value="marketing">Marketing</option>
              <option value="utility">Utility</option>
              <option value="authentication">Auth</option>
              <option value="free">Free</option>
            </select>
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <Card className="border-transparent">
            <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
              <p className="text-[13px] text-muted-foreground">Aucune transaction</p>
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
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Catégorie</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTx.map((tx) => {
                    const amount = Number(tx.amount) || 0
                    const isPositive = amount > 0
                    const meta = txTypeMeta[tx.transaction_type] || txTypeMeta.purchase
                    return (
                      <tr key={tx.id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-muted-foreground capitalize">
                          {tx.compartment}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-foreground max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className={`px-4 py-3 text-right text-[13px] font-semibold whitespace-nowrap ${
                          isPositive ? "text-emerald-600" : "text-red-500"
                        }`}>
                          {isPositive ? "+" : ""}{formatNumber(amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalTxPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">
                  Page {txPage} sur {totalTxPages} ({filteredTx.length} transactions)
                </p>
                <PaginationControls page={txPage} totalPages={totalTxPages} onPageChange={setTxPage} compact />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Purchase Dialog ── */}
      {selectedPkg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          onClick={closePurchaseDialog}
          onKeyDown={(e) => { if (e.key === "Escape") closePurchaseDialog() }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">
                  Paiement {CAT[selectedPkg.category].label}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
                onClick={closePurchaseDialog}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Selected package summary */}
            <div className={`rounded-xl border ${CAT[selectedPkg.category].border} ${CAT[selectedPkg.category].bg}/50 p-4 mb-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {selectedPkg.item.code} — {selectedPkg.item.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedPkg.item.messages > 0
                      ? `${formatNumber(selectedPkg.item.messages)} messages`
                      : "Crédits libres"
                    }
                  </p>
                </div>
                <p className={`text-[18px] font-bold ${CAT[selectedPkg.category].color}`}>
                  {formatNumber(selectedPkg.item.totalPrice)}{" "}
                  <span className="text-[11px] font-normal">FCFA</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {purchaseStep === "done" ? (
                /* ── Processing state ── */
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-5 text-center space-y-3">
                  <Clock className="h-8 w-8 text-amber-500 mx-auto" />
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">Paiement en cours de traitement</p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      Validez le paiement sur votre téléphone. Votre wallet sera crédité automatiquement dès confirmation de l&apos;opérateur.
                    </p>
                    {purchaseIntentId && (
                      <p className="text-[11px] text-muted-foreground/60 mt-2 font-mono">Réf : {purchaseIntentId}</p>
                    )}
                  </div>
                  <Button className="h-9 rounded-lg px-5 text-[13px]" onClick={closePurchaseDialog}>
                    Fermer
                  </Button>
                </div>
              ) : (
                <>
                  {/* Payment method tabs */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentTab("mobile_money")}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
                        paymentTab === "mobile_money"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Mobile Money
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTab("card")}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
                        paymentTab === "card"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Carte bancaire
                    </button>
                  </div>

                  {paymentTab === "mobile_money" ? (
                    /* ── Yabetoo Mobile Money form ── */
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
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

                      <div className="hidden">
                        <Input
                          type="email"
                          value={payerEmail}
                          onChange={(e) => setPayerEmail(e.target.value)}
                          className="h-9 rounded-lg text-[13px]"
                        />
                      </div>
                    </div>
                  ) : (
                    /* ── Stripe Card ── */
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                      <Button
                        variant="outline"
                        className="w-full h-9 rounded-lg text-[13px] gap-2"
                        onClick={() => handleStripeCheckout(selectedPkg.item.totalPrice, `Pack ${selectedPkg.item.code}`)}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Payer par carte
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg px-4 text-[13px]"
                      onClick={closePurchaseDialog}
                    >
                      Annuler
                    </Button>
                    {paymentTab === "mobile_money" && (
                      <Button
                        className="h-9 rounded-lg px-5 text-[13px] gap-2"
                        onClick={handlePurchase}
                        disabled={isPurchasing}
                      >
                        {isPurchasing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Payer {formatNumber(selectedPkg.item.totalPrice)} XAF
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Top-up Custom Dialog ── */}
      {topUpDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          onClick={closeTopUpDialog}
          onKeyDown={(e) => { if (e.key === "Escape") closeTopUpDialog() }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">
                  Recharge personnalisée
                </h3>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
                onClick={closeTopUpDialog}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {topUpStep === "done" ? (
                /* ── Processing state ── */
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-5 text-center space-y-3">
                  <Clock className="h-8 w-8 text-amber-500 mx-auto" />
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">Paiement en cours de traitement</p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      Validez le paiement sur votre téléphone. Votre wallet sera crédité automatiquement dès confirmation de l&apos;opérateur.
                    </p>
                    {topUpIntentId && (
                      <p className="text-[11px] text-muted-foreground/60 mt-2 font-mono">Réf : {topUpIntentId}</p>
                    )}
                  </div>
                  <Button className="h-9 rounded-lg px-5 text-[13px]" onClick={closeTopUpDialog}>
                    Fermer
                  </Button>
                </div>
              ) : (
                <>
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Montant (FCFA)</Label>
                    <Input
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="25 000"
                      min={100}
                      className="h-9 rounded-lg text-[13px]"
                    />
                    {topUpAmount && Number(topUpAmount) > 0 && (
                      <p className="text-[10px] text-amber-600">
                        ~{formatNumber(Math.floor(Number(topUpAmount) / 18))} msgs marketing · ~{formatNumber(Math.floor(Number(topUpAmount) / 6))} msgs utility
                      </p>
                    )}
                  </div>

                  {/* Payment method tabs */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTopUpPaymentTab("mobile_money")}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
                        topUpPaymentTab === "mobile_money"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Mobile Money
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopUpPaymentTab("card")}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
                        topUpPaymentTab === "card"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Carte bancaire
                    </button>
                  </div>

                  {topUpPaymentTab === "mobile_money" ? (
                    /* ── Yabetoo Mobile Money form ── */
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-[13px]">Prénom *</Label>
                          <Input
                            value={topUpPayerFirstName}
                            onChange={(e) => setTopUpPayerFirstName(e.target.value)}
                            className="h-9 rounded-lg text-[13px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[13px]">Nom *</Label>
                          <Input
                            value={topUpPayerLastName}
                            onChange={(e) => setTopUpPayerLastName(e.target.value)}
                            className="h-9 rounded-lg text-[13px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Téléphone *</Label>
                        <div className="flex h-9 overflow-hidden rounded-lg border border-border bg-card">
                          <div className="flex items-center justify-center px-3 text-[13px] font-medium text-muted-foreground">
                            {getPhonePrefix(topUpPayerOperator)}
                          </div>
                          <div className="w-px bg-border/60" />
                          <input
                            value={topUpPayerPhoneSuffix}
                            inputMode="numeric"
                            onChange={(e) => {
                              const digitsOnly = e.currentTarget.value.replace(/\D/g, "")
                              setTopUpPayerPhoneSuffix(digitsOnly.slice(0, getPhoneSuffixMaxDigits(topUpPayerOperator)))
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
                              setTopUpPayerOperator("mtn")
                              setTopUpPayerPhoneSuffix((value) => value.slice(0, getPhoneSuffixMaxDigits("mtn")))
                            }}
                            className={
                              topUpPayerOperator === "mtn"
                                ? "h-9 rounded-lg border border-primary/40 bg-primary/10 text-[13px] font-medium text-primary"
                                : "h-9 rounded-lg border border-border/60 bg-card text-[13px] font-medium text-muted-foreground hover:bg-muted/30"
                            }
                          >
                            MTN MoMo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTopUpPayerOperator("airtel")
                              setTopUpPayerPhoneSuffix((value) => value.slice(0, getPhoneSuffixMaxDigits("airtel")))
                            }}
                            className={
                              topUpPayerOperator === "airtel"
                                ? "h-9 rounded-lg border border-primary/40 bg-primary/10 text-[13px] font-medium text-primary"
                                : "h-9 rounded-lg border border-border/60 bg-card text-[13px] font-medium text-muted-foreground hover:bg-muted/30"
                            }
                          >
                            Airtel Money
                          </button>
                        </div>
                      </div>

                      <div className="hidden">
                        <Input
                          type="email"
                          value={topUpPayerEmail}
                          onChange={(e) => setTopUpPayerEmail(e.target.value)}
                          className="h-9 rounded-lg text-[13px]"
                        />
                      </div>
                    </div>
                  ) : (
                    /* ── Stripe Card ── */
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                      <Button
                        variant="outline"
                        className="w-full h-9 rounded-lg text-[13px] gap-2"
                        disabled={!topUpAmount || Number(topUpAmount) <= 0}
                        onClick={() => handleStripeCheckout(Number(topUpAmount), "Recharge personnalisée")}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Payer par carte
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg px-4 text-[13px]"
                      onClick={closeTopUpDialog}
                    >
                      Annuler
                    </Button>
                    {topUpPaymentTab === "mobile_money" && (
                      <Button
                        className="h-9 rounded-lg px-5 text-[13px] gap-2"
                        onClick={handleTopUp}
                        disabled={isTopping || !topUpAmount}
                      >
                        {isTopping && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Payer {topUpAmount ? formatNumber(Number(topUpAmount)) : "—"} XAF
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
