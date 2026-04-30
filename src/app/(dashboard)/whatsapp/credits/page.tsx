"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { whatsappService } from "@/services/whatsapp"
import { handleApiError } from "@/services"
import { useOrganizationStore } from "@/stores"
import type {
  WhatsAppCreditBalance,
  WhatsAppCreditPackage,
  WhatsAppCreditTransaction,
  WhatsAppCreditNotification,
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
  Megaphone,
  Wrench,
  ShieldCheck,
  Zap,
  Bell,
  Loader2,
  CreditCard,
  XCircle,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Package,
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
  marketing: { label: "Marketing", shortLabel: "M", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", iconBg: "bg-violet-100", icon: Megaphone, rate: 18 },
  utility: { label: "Utility", shortLabel: "U", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", iconBg: "bg-blue-100", icon: Wrench, rate: 6 },
  authentication: { label: "Auth", shortLabel: "A", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", iconBg: "bg-emerald-100", icon: ShieldCheck, rate: 6 },
  topup: { label: "Libres", shortLabel: "F", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", iconBg: "bg-amber-100", icon: Zap, rate: 0 },
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
  const [notifications, setNotifications] = useState<WhatsAppCreditNotification[]>([])
  const [packagesByCategory, setPackagesByCategory] = useState<Record<CatKey, PkgItem[]>>(FALLBACK_PACKAGES)
  const [isLoading, setIsLoading] = useState(true)

  // Polling refs
  const purchasePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const purchasePollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const topUpPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const topUpPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Purchase dialog state
  const [selectedPkg, setSelectedPkg] = useState<{ item: PkgItem; category: CatKey } | null>(null)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [paymentTab, setPaymentTab] = useState<"mobile_money" | "card">("mobile_money")
  const [purchaseStep, setPurchaseStep] = useState<"form" | "processing" | "done">("form")
  const [purchaseIntentId, setPurchaseIntentId] = useState<string | null>(null)
  const [purchasePollActive, setPurchasePollActive] = useState(false)

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
  const [topUpPollActive, setTopUpPollActive] = useState(false)
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
      const [balanceRes, txRes, notifRes, marketingRes, utilityRes, authRes, topupRes] = await Promise.allSettled([
        whatsappService.getWhatsAppBalance(),
        whatsappService.getWhatsAppTransactions(),
        whatsappService.getWhatsAppNotifications(),
        whatsappService.getPackages("marketing"),
        whatsappService.getPackages("utility"),
        whatsappService.getPackages("authentication"),
        whatsappService.getPackages("topup"),
      ])
      if (balanceRes.status === "fulfilled") setBalance(balanceRes.value)
      if (txRes.status === "fulfilled") setTransactions(txRes.value.transactions || [])
      if (notifRes.status === "fulfilled") setNotifications(notifRes.value.notifications || [])
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

  const startPurchasePolling = (intentId: string) => {
    setPurchasePollActive(true)
    const poll = setInterval(async () => {
      try {
        const res = await whatsappService.getYabetooPaymentStatus(intentId)
        if (res.status === "succeeded" && res.walletCredited) {
          clearInterval(poll)
          clearTimeout(purchasePollTimeoutRef.current!)
          purchasePollRef.current = null
          setPurchasePollActive(false)
          toast.success("Paiement confirmé ! Votre wallet a été crédité.")
          closePurchaseDialog()
          loadData()
        } else if (res.status === "failed") {
          clearInterval(poll)
          clearTimeout(purchasePollTimeoutRef.current!)
          purchasePollRef.current = null
          setPurchasePollActive(false)
          toast.error(res.failureMessage ?? "Paiement échoué. Veuillez réessayer.")
          setPurchaseStep("form")
        }
      } catch { /* ignorer les erreurs réseau passagères */ }
    }, 5000)
    purchasePollRef.current = poll
    purchasePollTimeoutRef.current = setTimeout(() => {
      clearInterval(poll)
      purchasePollRef.current = null
      setPurchasePollActive(false)
    }, 180_000)
  }

  const handlePurchase = async () => {
    if (!selectedPkg) return
    if (!payerFirstName.trim() || !payerLastName.trim() || !payerPhoneSuffix.trim()) {
      toast.error("Veuillez remplir prénom, nom et téléphone.")
      return
    }
    setIsPurchasing(true)
    setPurchaseStep("processing")
    try {
      const intentRes = await whatsappService.createYabetooRechargeIntent(
        selectedPkg.item.totalPrice,
        "agent_wallet",
        `Pack ${selectedPkg.item.code}`
      )
      const confirmRes = await whatsappService.confirmYabetooPayment({
        intent_id: intentRes.intentId,
        client_secret: intentRes.clientSecret,
        first_name: payerFirstName,
        last_name: payerLastName,
        phone: `${getPhonePrefix(payerOperator)}${payerPhoneSuffix}`,
        operator: payerOperator,
      })
      if (confirmRes.status === "succeeded") {
        toast.success("Paiement effectué ! Votre wallet a été crédité.")
        closePurchaseDialog()
        loadData()
      } else {
        setPurchaseIntentId(intentRes.intentId)
        setPurchaseStep("done")
        startPurchasePolling(intentRes.intentId)
      }
    } catch (error) {
      toast.error(handleApiError(error).message)
      setPurchaseStep("form")
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleStripeIntent = async (amountXaf: number, description: string) => {
    try {
      const intentRes = await whatsappService.createStripeRechargeIntent(amountXaf, description)
      toast.message("Paiement Stripe initié", {
        description: `Référence : ${intentRes.intent_id} · Montant : ${intentRes.stripe_amount / 100} ${intentRes.stripe_currency.toUpperCase()}`,
      })
    } catch (error) {
      toast.error(handleApiError(error).message)
    }
  }

  const startTopUpPolling = (intentId: string) => {
    setTopUpPollActive(true)
    const poll = setInterval(async () => {
      try {
        const res = await whatsappService.getYabetooPaymentStatus(intentId)
        if (res.status === "succeeded" && res.walletCredited) {
          clearInterval(poll)
          clearTimeout(topUpPollTimeoutRef.current!)
          topUpPollRef.current = null
          setTopUpPollActive(false)
          toast.success("Recharge confirmée ! Votre wallet a été crédité.")
          closeTopUpDialog()
          loadData()
        } else if (res.status === "failed") {
          clearInterval(poll)
          clearTimeout(topUpPollTimeoutRef.current!)
          topUpPollRef.current = null
          setTopUpPollActive(false)
          toast.error(res.failureMessage ?? "Paiement échoué. Veuillez réessayer.")
          setTopUpStep("form")
        }
      } catch { /* ignorer les erreurs réseau passagères */ }
    }, 5000)
    topUpPollRef.current = poll
    topUpPollTimeoutRef.current = setTimeout(() => {
      clearInterval(poll)
      topUpPollRef.current = null
      setTopUpPollActive(false)
    }, 180_000)
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
    try {
      const intentRes = await whatsappService.createYabetooRechargeIntent(amount, "agent_wallet", "Recharge personnalisée")
      const confirmRes = await whatsappService.confirmYabetooPayment({
        intent_id: intentRes.intentId,
        client_secret: intentRes.clientSecret,
        first_name: topUpPayerFirstName,
        last_name: topUpPayerLastName,
        phone: `${getPhonePrefix(topUpPayerOperator)}${topUpPayerPhoneSuffix}`,
        operator: topUpPayerOperator,
      })
      if (confirmRes.status === "succeeded") {
        toast.success("Recharge effectuée ! Votre wallet a été crédité.")
        closeTopUpDialog()
        loadData()
      } else {
        setTopUpIntentId(intentRes.intentId)
        setTopUpStep("done")
        startTopUpPolling(intentRes.intentId)
      }
    } catch (error) {
      toast.error(handleApiError(error).message)
      setTopUpStep("form")
    } finally {
      setIsTopping(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await whatsappService.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (error) {
      toast.error(handleApiError(error).message)
    }
  }

  const closePurchaseDialog = () => {
    if (purchasePollRef.current) {
      clearInterval(purchasePollRef.current)
      purchasePollRef.current = null
    }
    if (purchasePollTimeoutRef.current) {
      clearTimeout(purchasePollTimeoutRef.current)
      purchasePollTimeoutRef.current = null
    }
    setPurchasePollActive(false)
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
    if (topUpPollRef.current) {
      clearInterval(topUpPollRef.current)
      topUpPollRef.current = null
    }
    if (topUpPollTimeoutRef.current) {
      clearTimeout(topUpPollTimeoutRef.current)
      topUpPollTimeoutRef.current = null
    }
    setTopUpPollActive(false)
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

  const unreadCount = notifications.filter((n) => !n.is_read).length
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
      <div className="flex items-center justify-between" style={stagger(0)}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet WhatsApp
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Gérez et rechargez vos crédits WhatsApp
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-1.5 h-8 text-[12px]">
            <Bell className="h-3.5 w-3.5" />
            {unreadCount} notification{unreadCount > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {/* Notifications */}
      {unreadCount > 0 && (
        <div className="space-y-2" style={stagger(1)}>
          {notifications.filter((n) => !n.is_read).map((notif) => (
            <div key={notif.id} className="flex items-start gap-2 rounded-xl bg-blue-50/80 border border-blue-200/60 px-4 py-3">
              <Bell className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-blue-800">{notif.message}</p>
                <p className="text-[10px] text-blue-500 mt-0.5">{formatDate(notif.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Solde total + compartiments */}
      <div style={stagger(1)}>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Solde total disponible</p>
            <p className="text-3xl font-bold mt-1">
              {formatNumber(total)} <span className="text-base font-normal text-slate-400">FCFA</span>
            </p>
          </div>
          {balance && (
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border/40">
              {(["marketing", "utility", "authentication", "topup"] as const).map((key) => {
                const c = CAT[key]
                const b = key === "topup" ? balance.free : balance[key]
                const Icon = c.icon
                const msgs = c.rate > 0 ? Math.floor(b.available / c.rate) : null
                return (
                  <div key={key} className="px-4 py-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${c.iconBg}`}>
                        <Icon className={`h-3 w-3 ${c.color}`} />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
                    </div>
                    <p className={`text-lg font-bold ${c.color}`}>{formatNumber(b.available)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {msgs !== null ? `~${formatNumber(msgs)} msgs` : "Polyvalent"}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs + Packages */}
      <div style={stagger(2)}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Packs WhatsApp
          </h2>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1.5 mb-4">
          {(Object.keys(CAT) as CatKey[]).map((key) => {
            const c = CAT[key]
            const Icon = c.icon
            const isActive = activeTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
                  isActive
                    ? `${c.bg} ${c.color} border ${c.border}`
                    : "border-transparent text-muted-foreground hover:border-primary/45 hover:bg-primary/10 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
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
                        {!isTopUp && (
                          <p className="text-[11px] text-muted-foreground">messages {c.label}</p>
                        )}
                        {isTopUp && (
                          <p className="text-[11px] text-muted-foreground">crédits libres</p>
                        )}

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
                              ~{formatNumber(Math.floor(item.totalPrice / 18))} mktg · ~{formatNumber(Math.floor(item.totalPrice / 6))} util
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
                  className="flex items-center justify-between rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-yellow-50/60 p-4 cursor-pointer hover:shadow-sm transition-all"
                  onClick={() => setTopUpDialogOpen(true)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                      <Zap className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Montant personnalisé</p>
                      <p className="text-[11px] text-muted-foreground">Rechargez le montant exact dont vous avez besoin</p>
                    </div>
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
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
              Historique des transactions
            </h2>
          </div>
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
              <History className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">Aucune transaction</p>
              <p className="text-[11px] text-muted-foreground/60">
                Vos transactions WhatsApp apparaîtront ici.
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
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}>
                            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
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
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${CAT[selectedPkg.category].iconBg}`}>
                  {(() => { const Icon = CAT[selectedPkg.category].icon; return <Icon className={`h-4.5 w-4.5 ${CAT[selectedPkg.category].color}`} /> })()}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">
                    Paiement du pack {CAT[selectedPkg.category].label}
                  </h3>
                  <p className="text-[11px] text-muted-foreground/60">
                    Remplissez les informations puis procédez au paiement.
                  </p>
                </div>
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
                      ? `${formatNumber(selectedPkg.item.messages)} messages · ${selectedPkg.item.unitPrice} FCFA/msg`
                      : "Crédits libres · Polyvalent"
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
                  {purchasePollActive ? (
                    <Loader2 className="h-8 w-8 text-amber-500 mx-auto animate-spin" />
                  ) : (
                    <Clock className="h-8 w-8 text-amber-500 mx-auto" />
                  )}
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">Paiement en cours de traitement</p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      {purchasePollActive
                        ? "Vérification en cours… Validez le paiement sur votre téléphone."
                        : "Votre paiement Mobile Money est en cours. Votre wallet sera crédité automatiquement dès confirmation de l'opérateur."}
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
                      <div className="flex items-start gap-2.5">
                        <CreditCard className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[13px] font-medium text-foreground">Paiement sécurisé par Stripe</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Cliquez sur &quot;Initier&quot; pour créer la session de paiement, puis suivez le lien de paiement sécurisé.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full h-9 rounded-lg text-[13px] gap-2"
                        onClick={() => handleStripeIntent(selectedPkg.item.totalPrice, `Pack ${selectedPkg.item.code}`)}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Initier le paiement par carte
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
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                  <Zap className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">
                    Recharge personnalisée
                  </h3>
                  <p className="text-[11px] text-muted-foreground/60">
                    Rechargez un montant libre en crédits WhatsApp
                  </p>
                </div>
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
                  {topUpPollActive ? (
                    <Loader2 className="h-8 w-8 text-amber-500 mx-auto animate-spin" />
                  ) : (
                    <Clock className="h-8 w-8 text-amber-500 mx-auto" />
                  )}
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">Paiement en cours de traitement</p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      {topUpPollActive
                        ? "Vérification en cours… Validez le paiement sur votre téléphone."
                        : "Votre paiement Mobile Money est en cours. Votre wallet sera crédité automatiquement dès confirmation de l'opérateur."}
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
                      <div className="flex items-start gap-2.5">
                        <CreditCard className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[13px] font-medium text-foreground">Paiement sécurisé par Stripe</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Cliquez sur &quot;Initier&quot; pour créer la session de paiement, puis suivez le lien de paiement sécurisé.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full h-9 rounded-lg text-[13px] gap-2"
                        disabled={!topUpAmount || Number(topUpAmount) <= 0}
                        onClick={() => handleStripeIntent(Number(topUpAmount), "Recharge personnalisée")}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Initier le paiement par carte
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
