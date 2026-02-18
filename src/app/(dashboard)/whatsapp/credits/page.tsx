"use client"

import { useState, useEffect, useCallback } from "react"
import { whatsappService } from "@/services/whatsapp"
import { handleApiError } from "@/services"
import type {
  WhatsAppCreditBalance,
  WhatsAppCreditPackage,
  WhatsAppCreditTransaction,
  WhatsAppCreditNotification,
} from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Wallet,
  Megaphone,
  Wrench,
  ShieldCheck,
  Zap,
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  CreditCard,
  ChevronDown,
} from "lucide-react"
import { formatDate, formatNumber } from "@/lib/utils"

// ── Bouquets ──

const PACKAGES = {
  marketing: [
    { code: "M-500", name: "500 msgs", messages: 500, unitPrice: 18, discount: 0, totalPrice: 9_000 },
    { code: "M-1000", name: "1 000 msgs", messages: 1_000, unitPrice: 18, discount: 0, totalPrice: 18_000 },
    { code: "M-5000", name: "5 000 msgs", messages: 5_000, unitPrice: 17, discount: 5, totalPrice: 85_000 },
    { code: "M-10000", name: "10 000 msgs", messages: 10_000, unitPrice: 16, discount: 10, totalPrice: 160_000 },
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

const CAT = {
  marketing: { label: "Marketing", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", icon: Megaphone, rate: 18 },
  utility: { label: "Utility", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", icon: Wrench, rate: 6 },
  authentication: { label: "Auth", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", icon: ShieldCheck, rate: 6 },
  topup: { label: "Libres", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", icon: Zap, rate: 0 },
} as const

type CatKey = keyof typeof CAT

// ── Page ──

export default function WhatsAppCreditsPage() {
  const [balance, setBalance] = useState<WhatsAppCreditBalance | null>(null)
  const [transactions, setTransactions] = useState<WhatsAppCreditTransaction[]>([])
  const [notifications, setNotifications] = useState<WhatsAppCreditNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const [selectedPkg, setSelectedPkg] = useState<{ code: string; name: string; totalPrice: number; messages: number; category: string } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("mobile_money")
  const [paymentRef, setPaymentRef] = useState("")

  const [topUpAmount, setTopUpAmount] = useState("")
  const [topUpRef, setTopUpRef] = useState("")
  const [isTopping, setIsTopping] = useState(false)

  const [activeTab, setActiveTab] = useState<CatKey>("marketing")
  const [showHistory, setShowHistory] = useState(false)
  const [txTypeFilter, setTxTypeFilter] = useState("all")
  const [txCompartmentFilter, setTxCompartmentFilter] = useState("all")

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [balanceRes, txRes, notifRes] = await Promise.all([
        whatsappService.getWhatsAppBalance(),
        whatsappService.getWhatsAppTransactions(),
        whatsappService.getWhatsAppNotifications(),
      ])
      setBalance(balanceRes)
      setTransactions(txRes.transactions || [])
      setNotifications(notifRes.notifications || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handlePurchase = async () => {
    if (!selectedPkg || !paymentRef.trim()) { toast.error("Référence de paiement requise"); return }
    setIsPurchasing(true)
    try {
      await whatsappService.purchasePackage(selectedPkg.code, paymentRef, paymentMethod)
      toast.success("Achat effectué !")
      setSelectedPkg(null)
      setPaymentRef("")
      loadData()
    } catch (error) { toast.error(handleApiError(error).message) }
    finally { setIsPurchasing(false) }
  }

  const handleTopUp = async () => {
    const amount = Number(topUpAmount)
    if (!amount || !topUpRef.trim()) { toast.error("Montant et référence requis"); return }
    setIsTopping(true)
    try {
      await whatsappService.topUpCredits(amount, topUpRef)
      toast.success("Recharge effectuée !")
      setTopUpAmount("")
      setTopUpRef("")
      loadData()
    } catch (error) { toast.error(handleApiError(error).message) }
    finally { setIsTopping(false) }
  }

  const handleMarkAllRead = async () => {
    try {
      await whatsappService.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (error) { toast.error(handleApiError(error).message) }
  }

  const filteredTx = transactions.filter((tx) => {
    if (txTypeFilter !== "all" && tx.transaction_type !== txTypeFilter) return false
    if (txCompartmentFilter !== "all" && tx.compartment !== txCompartmentFilter) return false
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const total = balance ? (balance.marketing.available + balance.utility.available + balance.authentication.available + balance.free.available) : 0

  const openPurchase = (item: typeof PACKAGES.marketing[0], category: string) => {
    setSelectedPkg({ code: item.code, name: `${CAT[category as CatKey]?.label} — ${item.name}`, totalPrice: item.totalPrice, messages: item.messages, category })
    setPaymentRef("")
    setPaymentMethod("mobile_money")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez et rechargez vos crédits WhatsApp
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            {unreadCount}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        </div>
      ) : (
        <>
          {/* ─── Solde total + compartiments (compact) ─── */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white px-6 py-5">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Solde total disponible</p>
              <p className="text-3xl font-bold mt-1">
                {formatNumber(total)} <span className="text-base font-normal text-slate-400">FCFA</span>
              </p>
            </div>
            {balance && (
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border/40">
                {(["marketing", "utility", "authentication", "topup"] as const).map((key) => {
                  const c = CAT[key]
                  const b = key === "topup" ? balance.free : balance[key]
                  const msgs = c.rate > 0 ? Math.floor(b.available / c.rate) : null
                  return (
                    <div key={key} className="px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                        <span className="text-xs text-muted-foreground">{c.label}</span>
                      </div>
                      <p className={`text-lg font-semibold ${c.color}`}>{formatNumber(b.available)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {msgs !== null ? `~${formatNumber(msgs)} msgs` : "Polyvalent"}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* ─── Bouquets ─── */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recharger</h2>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CatKey)}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                {(Object.keys(CAT) as CatKey[]).map((key) => {
                  const Icon = CAT[key].icon
                  return (
                    <TabsTrigger key={key} value={key} className="text-xs sm:text-sm gap-1.5">
                      <Icon className="h-3.5 w-3.5 hidden sm:block" />
                      {CAT[key].label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {(Object.entries(PACKAGES) as [CatKey, typeof PACKAGES.marketing][]).map(([catKey, items]) => {
                const c = CAT[catKey]
                const isTopUp = catKey === "topup"
                return (
                  <TabsContent key={catKey} value={catKey} className="space-y-4">
                    {/* Grille bouquets */}
                    <div className={`grid gap-3 ${items.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
                      {items.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => openPurchase(item, catKey)}
                          className={`relative text-left rounded-lg border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm active:scale-[0.98]`}
                        >
                          {item.discount > 0 && (
                            <Badge className="absolute top-2 right-2 bg-red-500 text-white text-[10px] hover:bg-red-500">
                              -{item.discount}%
                            </Badge>
                          )}
                          <p className="font-medium">{item.name}</p>
                          <p className={`text-xl font-bold ${c.color} mt-1`}>
                            {formatNumber(item.totalPrice)} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
                          </p>
                          {!isTopUp && (
                            <p className="text-[11px] text-muted-foreground mt-1">{item.unitPrice} FCFA/msg · 30 jours</p>
                          )}
                          {isTopUp && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              ~{formatNumber(Math.floor(item.totalPrice / 18))} mktg · ~{formatNumber(Math.floor(item.totalPrice / 6))} util
                            </p>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Recharge libre (topup uniquement) */}
                    {isTopUp && (
                      <div className="rounded-lg border border-border/60 bg-card p-4">
                        <p className="text-sm font-medium mb-3">Montant personnalisé</p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                          <div className="space-y-1.5 flex-1 w-full">
                            <Label className="text-xs">Montant (FCFA)</Label>
                            <Input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} placeholder="25 000" min={100} />
                          </div>
                          <div className="space-y-1.5 flex-1 w-full">
                            <Label className="text-xs">Référence paiement</Label>
                            <Input value={topUpRef} onChange={(e) => setTopUpRef(e.target.value)} placeholder="REF-..." />
                          </div>
                          <Button onClick={handleTopUp} disabled={isTopping} size="sm">
                            {isTopping && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Recharger
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                )
              })}
            </Tabs>
          </div>

          {/* ─── Dialog d'achat ─── */}
          <Dialog open={!!selectedPkg} onOpenChange={(open) => { if (!open) setSelectedPkg(null) }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Confirmer l&apos;achat</DialogTitle>
                <DialogDescription>Finalisez votre achat de crédits WhatsApp.</DialogDescription>
              </DialogHeader>
              {selectedPkg && (() => {
                const c = CAT[selectedPkg.category as CatKey]
                return (
                  <div className="space-y-4">
                    <div className={`rounded-lg ${c?.bg ?? ""} border ${c?.border ?? "border-border"} p-4 text-center`}>
                      <p className={`text-2xl font-bold ${c?.color ?? ""}`}>{formatNumber(selectedPkg.totalPrice)} FCFA</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedPkg.messages > 0 ? `${formatNumber(selectedPkg.messages)} messages` : "Crédits libres"} · 30 jours
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Méthode de paiement</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            <SelectItem value="airtel_money">Airtel Money</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Référence de paiement</Label>
                        <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="REF-..." />
                      </div>
                    </div>
                    <Button onClick={handlePurchase} disabled={isPurchasing || !paymentRef.trim()} className="w-full">
                      {isPurchasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      Payer {formatNumber(selectedPkg.totalPrice)} FCFA
                    </Button>
                  </div>
                )
              })()}
            </DialogContent>
          </Dialog>

          {/* ─── Historique (collapsable) ─── */}
          <div>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`} />
              Historique des transactions
              {transactions.length > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1">{transactions.length}</Badge>
              )}
            </button>

            {showHistory && (
              <Card className="mt-3">
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                      <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous types</SelectItem>
                        <SelectItem value="purchase">Achat</SelectItem>
                        <SelectItem value="consumption">Consommation</SelectItem>
                        <SelectItem value="refund">Remboursement</SelectItem>
                        <SelectItem value="expiration">Expiration</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={txCompartmentFilter} onValueChange={setTxCompartmentFilter}>
                      <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue placeholder="Compartiment" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="authentication">Auth</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Catégorie</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs text-right">Montant</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTx.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">Aucune transaction</TableCell>
                        </TableRow>
                      ) : filteredTx.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell><Badge variant="outline" className="text-[10px]">{tx.transaction_type}</Badge></TableCell>
                          <TableCell className="text-xs">{tx.compartment}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{tx.description}</TableCell>
                          <TableCell className={`text-right font-mono text-xs ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {tx.amount > 0 ? "+" : ""}{formatNumber(tx.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ─── Notifications (seulement si non-lues) ─── */}
          {unreadCount > 0 && (
            <div className="space-y-2">
              {notifications.filter((n) => !n.is_read).map((notif) => (
                <div key={notif.id} className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm">
                  <Bell className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p>{notif.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(notif.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
