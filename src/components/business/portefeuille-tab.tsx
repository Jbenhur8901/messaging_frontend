"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  confirmFlowPayCollect,
  createBusinessWithdrawal,
  createCardWalletWithdrawal,
  createFlowPayCardLink,
  createFlowPayCollectIntent,
  getActiveWorkspaceId,
  getBusinessWallet,
  getCardWallet,
  getFlowPayCollectStatus,
  getToken,
  listBusinessWalletTransactions,
  listCardWalletWithdrawals,
  requestBusinessWithdrawalOtp,
} from "@/services/business"
import type {
  BusinessWallet,
  BusinessWalletTransaction,
  CardWallet,
  CardWalletWithdrawal,
  CreateCardWalletWithdrawalPayload,
  FlowPayCardLink,
  FlowPayCollectStatus,
} from "@/types/business"
import { formatAppNumber, tLabel, useAppLanguage } from "@/lib/app-language"
import { Icon } from "@/lib/icons"
import { PhoneDialInput } from "@/components/business/phone-dial-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const CARD_WITHDRAWAL_STATUS_MAP = {
  pending:    { fr: "En attente",  en: "Pending",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  processing: { fr: "En cours",    en: "Processing", cls: "bg-blue-50 text-blue-700 border-blue-200"   },
  completed:  { fr: "Complété",    en: "Completed",  cls: "bg-green-50 text-green-700 border-green-200" },
  rejected:   { fr: "Rejeté",      en: "Rejected",   cls: "bg-red-50 text-red-700 border-red-200"      },
} as const;

export function PortefeuilleTab() {
  const { language } = useAppLanguage();
  const tx = (fr: string, en: string) => tLabel(language, { fr, en });

  const [wallet, setWallet]           = useState<BusinessWallet | null>(null);
  const [transactions, setTransactions]   = useState<BusinessWalletTransaction[]>([]);
  const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  // Withdrawal
  const [withdrawAmount, setWithdrawAmount]   = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawing, setWithdrawing]         = useState(false);
  const [withdrawOtpStep, setWithdrawOtpStep] = useState<"form" | "otp">("form");
  const [withdrawOtpValue, setWithdrawOtpValue] = useState("");
  const [requestingOtp, setRequestingOtp]     = useState(false);

  // Flow Pay collect (mobile money)
  const [showCollect, setShowCollect]         = useState(false);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectPhone, setCollectPhone]   = useState("");
  const [collectDesc, setCollectDesc]     = useState("");
  const [collecting, setCollecting]           = useState(false);
  const [collectStatus, setCollectStatus]     = useState<FlowPayCollectStatus | null>(null);

  // Flow Pay card link
  const [showCardLink, setShowCardLink]       = useState(false);
  const [cardLinkAmount, setCardLinkAmount]   = useState("");
  const [cardLinkDesc, setCardLinkDesc]       = useState("");
  const [generatingCardLink, setGeneratingCardLink] = useState(false);
  const [cardLink, setCardLink]               = useState<FlowPayCardLink | null>(null);
  const [cardLinkCopied, setCardLinkCopied]   = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Card wallet
  const [cardWallet, setCardWallet]                     = useState<CardWallet | null>(null);
  const [cardWithdrawals, setCardWithdrawals]           = useState<CardWalletWithdrawal[]>([]);
  const [showCardWithdraw, setShowCardWithdraw]         = useState(false);
  const [cardWithdrawMethod, setCardWithdrawMethod]     = useState<"bank_transfer" | "cash">("bank_transfer");
  const [cardWithdrawAmount, setCardWithdrawAmount]     = useState("");
  const [cardWithdrawBankName, setCardWithdrawBankName] = useState("");
  const [cardWithdrawAccNum, setCardWithdrawAccNum]     = useState("");
  const [cardWithdrawAccHolder, setCardWithdrawAccHolder] = useState("");
  const [cardWithdrawCountry, setCardWithdrawCountry]   = useState("");
  const [cardWithdrawSwift, setCardWithdrawSwift]       = useState("");
  const [cardWithdrawIban, setCardWithdrawIban]         = useState("");
  const [cardWithdrawPickup, setCardWithdrawPickup]     = useState("");
  const [cardWithdrawPhone, setCardWithdrawPhone]       = useState("");
  const [cardWithdrawNotes, setCardWithdrawNotes]       = useState("");
  const [submittingCardWithdraw, setSubmittingCardWithdraw] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [pTab, setPTab] = useState<"mobile" | "carte">("mobile");

  const apiErr = (err: unknown) => err instanceof Error ? err.message : String(err);

  async function load() {
    const token = getToken();
    const wsId = getActiveWorkspaceId();
    if (!token || !wsId) return;
    try {
      const [w, txns, cw, cwdr] = await Promise.all([
        getBusinessWallet(token, wsId),
        listBusinessWalletTransactions(token, wsId),
        getCardWallet(token, wsId),
        listCardWalletWithdrawals(token, wsId),
      ]);
      setWallet(w);
      setTransactions(txns);
      if (cw) setCardWallet(cw);
      setCardWithdrawals(cwdr);
    } catch {
      setWallet({ balance: 0, currency: "XAF", totalCollected: 0, totalWithdrawn: 0 });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount < 200) { toast.error(tx("Montant minimum : 200 XAF", "Minimum amount: 200 XAF")); return; }
    if (!withdrawPhone) { toast.error(tx("Numéro requis", "Phone required")); return; }
    setRequestingOtp(true);
    try {
      const token = getToken()!;
      const wsId = getActiveWorkspaceId()!;
      const digits = withdrawPhone.replace(/\D/g, "");
      const local = digits.startsWith("242") ? digits.slice(3) : digits;
      const operator = local.startsWith("05") ? "airtel" : "mtn";
      await requestBusinessWithdrawalOtp(token, wsId, { amount, operator, mobile_money_number: digits });
      setWithdrawOtpStep("otp");
      toast.success(tx("Code envoyé par email", "Code sent by email"));
    } catch (err) { toast.error(apiErr(err)); }
    finally { setRequestingOtp(false); }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!withdrawOtpValue || withdrawOtpValue.length !== 6) { toast.error(tx("Code à 6 chiffres requis", "6-digit code required")); return; }
    setWithdrawing(true);
    try {
      const token = getToken()!;
      const wsId = getActiveWorkspaceId()!;
      const digits = withdrawPhone.replace(/\D/g, "");
      const local = digits.startsWith("242") ? digits.slice(3) : digits;
      const operator = local.startsWith("05") ? "airtel" : "mtn";
      await createBusinessWithdrawal(token, wsId, {
        amount,
        operator,
        mobile_money_number: digits,
        otp: withdrawOtpValue,
      });
      toast.success(tx("Retrait effectué", "Withdrawal completed"));
      setWithdrawAmount(""); setWithdrawPhone(""); setWithdrawOtpValue(""); setWithdrawOtpStep("form");
      void load();
    } catch (err) { toast.error(apiErr(err)); }
    finally { setWithdrawing(false); }
  }

  function startCollectPoll(paymentId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const token = getToken()!;
        const wsId = getActiveWorkspaceId()!;
        const status = await getFlowPayCollectStatus(token, wsId, paymentId);
        setCollectStatus(status);
        if (status.status === "succeeded" || status.status === "failed") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          if (status.status === "succeeded") {
            toast.success(tx("Paiement encaissé !", "Payment collected!"));
            void load();
          }
        }
      } catch { /* keep polling */ }
    }, 4000);
  }

  function detectCollectOperator(phone: string): "airtel" | "mtn" {
    const digits = phone.replace(/\D/g, "");
    const local = digits.startsWith("242") ? digits.slice(3) : digits;
    return local.startsWith("05") ? "airtel" : "mtn";
  }

  async function handleCollect(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(collectAmount);
    if (!amount || amount <= 0) { toast.error(tx("Montant invalide", "Invalid amount")); return; }
    if (!collectPhone) { toast.error(tx("Numéro client requis", "Customer phone required")); return; }
    setCollecting(true);
    try {
      const token = getToken()!;
      const wsId = getActiveWorkspaceId()!;
      const normalizedPhone = collectPhone.replace(/\D/g, "");
      const operator = detectCollectOperator(collectPhone);

      const intent = await createFlowPayCollectIntent(token, wsId, {
        amount,
        customer_phone: normalizedPhone,
        operator,
        description: collectDesc || undefined,
      });

      const confirmed = await confirmFlowPayCollect(token, wsId, intent.intentId);

      setCollectStatus({ ...confirmed, customerPhone: normalizedPhone, operator });
      startCollectPoll(confirmed.id);
    } catch (err) { toast.error(apiErr(err)); }
    finally { setCollecting(false); }
  }

  function closeCollect() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setShowCollect(false);
    setCollectStatus(null);
    setCollectAmount(""); setCollectPhone(""); setCollectDesc("");
  }

  const feeAmount = withdrawAmount ? Math.round(Number(withdrawAmount) * 0.07) : 0;
  const netAmount = withdrawAmount ? Math.round(Number(withdrawAmount) * 0.93) : 0;

  function closeCardLink() {
    setShowCardLink(false);
    setCardLink(null);
    setCardLinkAmount("");
    setCardLinkDesc("");
    setCardLinkCopied(false);
  }

  async function handleGenerateCardLink(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(cardLinkAmount);
    if (!amount || amount <= 0) { toast.error(tx("Montant invalide", "Invalid amount")); return; }
    setGeneratingCardLink(true);
    try {
      const token = getToken()!;
      const wsId = getActiveWorkspaceId()!;
      const link = await createFlowPayCardLink(token, wsId, {
        amount,
        description: cardLinkDesc || undefined,
      });
      setCardLink(link);
    } catch (err) { toast.error(apiErr(err)); }
    finally { setGeneratingCardLink(false); }
  }

  async function copyCardLink() {
    if (!cardLink?.checkoutUrl) return;
    await navigator.clipboard.writeText(cardLink.checkoutUrl);
    setCardLinkCopied(true);
    setTimeout(() => setCardLinkCopied(false), 2000);
  }

  function resetCardWithdrawForm() {
    setCardWithdrawAmount(""); setCardWithdrawBankName(""); setCardWithdrawAccNum("");
    setCardWithdrawAccHolder(""); setCardWithdrawCountry(""); setCardWithdrawSwift("");
    setCardWithdrawIban(""); setCardWithdrawPickup(""); setCardWithdrawPhone(""); setCardWithdrawNotes("");
    setCardWithdrawMethod("bank_transfer");
  }

  async function handleCardWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(cardWithdrawAmount);
    if (!amount || amount < 500) { toast.error(tx("Montant minimum : 500 XAF", "Minimum amount: 500 XAF")); return; }
    const payload: CreateCardWalletWithdrawalPayload = {
      amount,
      method: cardWithdrawMethod,
      ...(cardWithdrawMethod === "bank_transfer" ? {
        bank_name: cardWithdrawBankName || undefined,
        account_number: cardWithdrawAccNum || undefined,
        account_holder: cardWithdrawAccHolder || undefined,
        bank_country: cardWithdrawCountry || undefined,
        swift_code: cardWithdrawSwift || undefined,
        iban: cardWithdrawIban || undefined,
      } : {
        cash_pickup_location: cardWithdrawPickup || undefined,
        contact_phone: cardWithdrawPhone || undefined,
      }),
      notes: cardWithdrawNotes || undefined,
    };
    setSubmittingCardWithdraw(true);
    try {
      const token = getToken()!;
      const wsId = getActiveWorkspaceId()!;
      await createCardWalletWithdrawal(token, wsId, payload);
      toast.success(tx("Demande envoyée. Nous vous contacterons sous 48h.", "Request sent. We'll reach out within 48h."));
      setShowCardWithdraw(false);
      resetCardWithdrawForm();
      void load();
    } catch (err) { toast.error(apiErr(err)); }
    finally { setSubmittingCardWithdraw(false); }
  }

  const statusBadge = (s: string) => {
    if (s === "succeeded") return <Badge className="bg-green-100 text-green-700 border-green-200">{tx("Encaissé", "Collected")}</Badge>;
    if (s === "failed")    return <Badge className="bg-red-100 text-red-700 border-red-200">{tx("Échoué", "Failed")}</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{tx("En cours…", "Processing…")}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const cur = wallet?.currency || "XAF";

  return (
    <div className="space-y-4 py-2">
      {/* ── Sub-tab nav ──────────────────────────────────────────── */}
      <div className="rounded-[16px] bg-card p-1.5 shadow-lg border border-border">
        <div className="grid grid-cols-2 gap-1">
          {([
            ["mobile", tx("Mobile Money", "Mobile Money")],
            ["carte",  tx("Portefeuille Carte", "Card Wallet")],
          ] as const).map(([key, label]) => {
            const active = pTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPTab(key)}
                className={cn(
                  "rounded-[10px] py-2.5 text-[13px] font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(255,204,0,0.35)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ Mobile Money ═══════════════════════════════════════════ */}
      {pTab === "mobile" && (
        <>
          {/* Hero balance */}
          <div className="relative overflow-hidden rounded-[20px] bg-card px-5 py-5 shadow-lg border border-border sm:px-6 sm:py-6">
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {tx("Solde disponible", "Available balance")}
                </p>
                {loading ? (
                  <div className="mt-2 h-9 w-36 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <p className="mt-2 text-[34px] font-bold leading-none tracking-[-0.04em] text-foreground sm:text-[40px]">
                    {formatAppNumber(wallet?.balance ?? 0, language)}
                    <span className="ml-2 text-[15px] font-medium text-muted-foreground">{cur}</span>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
                <div className="rounded-[14px] bg-muted px-3.5 py-2.5">
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">{tx("Collecté", "Collected")}</p>
                  <p className="mt-1 text-[15px] font-semibold text-foreground">
                    {formatAppNumber(wallet?.totalCollected ?? 0, language)}
                  </p>
                </div>
                <div className="rounded-[14px] bg-muted px-3.5 py-2.5">
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">{tx("Retiré", "Withdrawn")}</p>
                  <p className="mt-1 text-[15px] font-semibold text-foreground">
                    {formatAppNumber(wallet?.totalWithdrawn ?? 0, language)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setShowCollect(true)}
              className="h-10 gap-2 rounded-[10px] bg-primary text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="3" y="1.5" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {tx("Encaisser", "Collect")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setWithdrawOpen(o => !o)}
              className="h-10 gap-2 rounded-[10px] border-0 bg-card text-[13px] font-semibold text-foreground shadow-[0_8px_24px_-18px_rgba(15,23,42,0.22)] hover:bg-muted"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M5 10l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {tx("Retirer", "Withdraw")}
            </Button>
          </div>
        </>
      )}

      {/* Flow Pay collect dialog */}
      <Dialog open={showCollect} onOpenChange={(open) => { if (!open) closeCollect(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Flow Pay — {tx("Encaissement", "Collect")}</DialogTitle>
          </DialogHeader>
          {!collectStatus ? (
            <form onSubmit={handleCollect} className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-foreground">{tx("Montant", "Amount")}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    value={collectAmount}
                    onChange={e => setCollectAmount(e.target.value)}
                    placeholder="5 000"
                    required
                    className="pr-14"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] font-medium text-muted-foreground">XAF</span>
                </div>
              </div>
              <PhoneDialInput
                label={tx("Numéro client", "Customer phone")}
                value={collectPhone}
                onChange={setCollectPhone}
                placeholder="06 000 0000"
                language={language}
                locked
              />
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-foreground">{tx("Description", "Description")} <span className="text-muted-foreground font-normal">{tx("(optionnel)", "(optional)")}</span></Label>
                <Input value={collectDesc} onChange={e => setCollectDesc(e.target.value)} placeholder={tx("Ex : Commande #42", "e.g. Order #42")} />
              </div>
              <DialogFooter className="pt-1">
                <DialogClose asChild><Button type="button" variant="outline">{tx("Annuler", "Cancel")}</Button></DialogClose>
                <Button type="submit" disabled={collecting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {collecting ? tx("Envoi…", "Sending…") : tx("Encaisser", "Collect")}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="pt-2">
              <div className="rounded-xl border border-border bg-muted/30 px-5 py-5 flex flex-col items-center gap-2.5">
                {statusBadge(collectStatus.status)}
                <p className="text-[30px] font-bold tracking-tight text-foreground mt-1">
                  {formatAppNumber(collectStatus.amount, language)}{" "}
                  <span className="text-[16px] font-medium text-muted-foreground">{collectStatus.currency}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Image
                    src={collectStatus.operator === "airtel" ? "/icons/am-logo.png" : "/icons/momo-logo.png"}
                    alt={collectStatus.operator === "airtel" ? "Airtel Money" : "MTN Mobile Money"}
                    width={20} height={20}
                    className="rounded object-contain"
                  />
                  <p className="text-[12.5px] text-muted-foreground">{collectStatus.customerPhone}</p>
                </div>
                {collectStatus.failureMessage && (
                  <p className="text-[12px] text-red-500 text-center mt-1">{collectStatus.failureMessage}</p>
                )}
                {collectStatus.status === "processing" && (
                  <p className="text-[12px] text-muted-foreground">{tx("Vérification en cours…", "Checking…")}</p>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={closeCollect}>{tx("Fermer", "Close")}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Card payment link dialog */}
      <Dialog open={showCardLink} onOpenChange={(open) => { if (!open) closeCardLink(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-primary">
                <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M4 10h3M10.5 10h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {tx("Lien de paiement carte", "Card payment link")}
            </DialogTitle>
          </DialogHeader>

          {!cardLink ? (
            <form onSubmit={handleGenerateCardLink} className="space-y-4 pt-1">
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                {tx(
                  "Générez un lien Stripe que votre client règle par carte bancaire (Visa, Mastercard). Le montant est crédité dans votre portefeuille Flow Pay.",
                  "Generate a Stripe link your customer pays by card (Visa, Mastercard). The amount is credited to your Flow Pay wallet."
                )}
              </p>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-foreground">{tx("Montant", "Amount")}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={cardLinkAmount}
                    onChange={e => setCardLinkAmount(e.target.value)}
                    placeholder="5 000"
                    required
                    className="pr-14"
                    autoFocus
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] font-medium text-muted-foreground">
                    {wallet?.currency || "XAF"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-foreground">
                  {tx("Description", "Description")}{" "}
                  <span className="text-muted-foreground font-normal">{tx("(optionnel)", "(optional)")}</span>
                </Label>
                <Input
                  value={cardLinkDesc}
                  onChange={e => setCardLinkDesc(e.target.value)}
                  placeholder={tx("Ex : Commande #42", "e.g. Order #42")}
                />
              </div>

              <DialogFooter className="pt-1">
                <DialogClose asChild>
                  <Button type="button" variant="outline">{tx("Annuler", "Cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={generatingCardLink || !cardLinkAmount}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  {generatingCardLink ? (
                    <>
                      <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      {tx("Génération…", "Generating…")}
                    </>
                  ) : tx("Générer le lien", "Generate link")}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11.5px] font-medium text-primary uppercase tracking-wide">
                      {tx("Lien généré", "Link generated")}
                    </p>
                    <p className="text-[20px] font-bold tracking-tight text-foreground mt-0.5">
                      {cardLink.amount.toLocaleString()}{" "}
                      <span className="text-[13px] font-medium text-muted-foreground">{cardLink.currency.toUpperCase()}</span>
                    </p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card shadow-sm">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-primary">
                      <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M4 10h3M10.5 10h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                <div className="rounded-lg bg-card border border-primary/30 px-3 py-2.5 flex items-center gap-2 min-w-0">
                  <span className="flex-1 truncate text-[12px] text-primary font-mono select-all">
                    {cardLink.checkoutUrl}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={copyCardLink}
                  className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-[13px] font-medium transition-all ${
                    cardLinkCopied
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-border bg-muted text-foreground hover:bg-muted"
                  }`}
                >
                  {cardLinkCopied ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {tx("Copié !", "Copied!")}
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <rect x="4.5" y="4.5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M9.5 4.5V2.5A1 1 0 008.5 1.5h-6A1 1 0 001.5 2.5v6a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      {tx("Copier le lien", "Copy link")}
                    </>
                  )}
                </button>
                <a
                  href={cardLink.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-medium transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 10L10 2M10 2H5.5M10 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {tx("Ouvrir", "Open")}
                </a>
              </div>

              <p className="text-[11.5px] text-muted-foreground text-center">
                {tx("Lien valable 24h · Partagez-le directement avec votre client.", "Valid for 24h · Share it directly with your customer.")}
              </p>

              <DialogFooter>
                <Button variant="outline" onClick={closeCardLink}>{tx("Fermer", "Close")}</Button>
                <Button
                  onClick={() => { setCardLink(null); setCardLinkAmount(""); setCardLinkDesc(""); }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {tx("Nouveau lien", "New link")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ Mobile Money — withdrawal form + history ═══════════════ */}
      {pTab === "mobile" && (
        <>
          {withdrawOpen && (
            <div className="rounded-xl border border-border bg-card px-5 py-4">
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{tx("Montant à retirer", "Amount to withdraw")}</Label>
                  <div className="relative">
                    <Input type="number" min="200" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="200" className="pr-14" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] font-medium text-muted-foreground">XAF</span>
                  </div>
                </div>
                <PhoneDialInput
                  label={tx("Numéro Mobile Money", "Mobile Money number")}
                  value={withdrawPhone}
                  onChange={setWithdrawPhone}
                  placeholder="06 000 0000"
                  language={language}
                  locked
                />
                {withdrawAmount && Number(withdrawAmount) >= 200 && (
                  <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 text-[13px] space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">{tx("Frais Flow Pay", "Flow Pay fee")}</span><span className="text-muted-foreground">− {formatAppNumber(feeAmount, language)} {cur}</span></div>
                    <div className="flex justify-between font-semibold"><span>{tx("Vous recevez", "You receive")}</span><span className="text-primary">{formatAppNumber(netAmount, language)} {cur}</span></div>
                  </div>
                )}
                <Button type="submit" disabled={requestingOtp || !withdrawAmount || !withdrawPhone} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {requestingOtp ? tx("Envoi du code…", "Sending code…") : tx("Recevoir le code", "Get code")}
                </Button>
              </form>
            </div>
          )}

          {/* Transaction history */}
          <div className="overflow-hidden rounded-[18px] bg-card shadow-lg border border-border">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">
                  {tx("Historique des transactions", "Transaction history")}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {transactions.length === 0
                    ? tx("Vos encaissements et retraits apparaîtront ici.", "Your collections and withdrawals will appear here.")
                    : tx(`${transactions.length} opération${transactions.length > 1 ? "s" : ""}`, `${transactions.length} operation${transactions.length > 1 ? "s" : ""}`)}
                </p>
              </div>
              {transactions.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg border-0 bg-muted text-[12.5px] hover:bg-accent"
                  onClick={() => {
                    const headers = [tx("Date","Date"), tx("Type","Type"), tx("Description","Description"), tx("Action","Action"), tx("Montant","Amount"), tx("Solde avant","Balance before"), tx("Solde après","Balance after")];
                    const rows = transactions.map(t => [
                      t.createdAt ? new Date(t.createdAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US") : "",
                      t.type,
                      t.description || "",
                      t.actionName,
                      (t.type === "credit" ? "+" : "-") + t.amount,
                      t.balanceBefore,
                      t.balanceAfter,
                    ]);
                    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `transactions-${new Date().toISOString().slice(0,10)}.csv`;
                    a.click(); URL.revokeObjectURL(url);
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3v8M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {tx("Exporter CSV", "Export CSV")}
                </Button>
              )}
            </div>
            {transactions.length === 0 ? (
              <div className="px-5 pb-10 pt-2 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon name="billing" size={22} className="text-primary" />
                </div>
                <p className="text-[13.5px] font-medium text-foreground">
                  {tx("Aucune transaction pour le moment", "No transactions yet")}
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {tx("Commencez par encaisser un paiement Mobile Money.", "Start by collecting a Mobile Money payment.")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border border-t border-border">
                {transactions.map(txn => {
                  const isExpanded = expandedTxnId === txn.id;
                  const isCredit = txn.type === "credit";
                  const dateStr = txn.createdAt
                    ? new Date(txn.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—";
                  const meta = txn.metadata || {};
                  return (
                    <div key={txn.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedTxnId(isExpanded ? null : txn.id)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/30"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isCredit ? "bg-green-100" : "bg-red-100"}`}>
                            {isCredit ? (
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M8 13V3" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round"/>
                                <path d="M4 7l4-4 4 4" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M8 3v10" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/>
                                <path d="M4 9l4 4 4-4" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-foreground">{txn.description || txn.actionName}</p>
                            <p className="text-[11.5px] text-muted-foreground">{dateStr}</p>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <div className="text-right">
                            <p className={`text-[13.5px] font-semibold ${isCredit ? "text-green-600" : "text-red-500"}`}>{isCredit ? "+" : "−"}{formatAppNumber(txn.amount, language)} {cur}</p>
                            <p className="text-[11.5px] text-muted-foreground">{tx("Solde", "Bal.")} {formatAppNumber(txn.balanceAfter, language)}</p>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-0">
                          <div className="divide-y divide-[#f0f0ee] rounded-xl bg-muted/30">
                            {[
                              { label: tx("Type", "Type"), value: txn.type },
                              { label: tx("Action", "Action"), value: txn.actionName },
                              { label: tx("Solde avant", "Balance before"), value: `${formatAppNumber(txn.balanceBefore, language)} ${cur}` },
                              { label: tx("Solde après", "Balance after"), value: `${formatAppNumber(txn.balanceAfter, language)} ${cur}` },
                              { label: "ID", value: txn.id },
                              ...Object.entries(meta).map(([k, v]) => ({ label: k, value: String(v) })),
                            ].map(({ label, value }) => (
                              <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                                <span className="shrink-0 text-[12px] text-muted-foreground">{label}</span>
                                <span className="break-all text-right text-[12px] font-medium text-foreground">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ Portefeuille Carte ══════════════════════════════════════ */}
      {pTab === "carte" && (
        <>
          {/* Hero balance */}
          <div className="relative overflow-hidden rounded-[20px] bg-card px-5 py-5 shadow-lg border border-border sm:px-6 sm:py-6">
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {tx("Solde disponible", "Available balance")}
                </p>
                <p className="mt-2 text-[34px] font-bold leading-none tracking-[-0.04em] text-foreground sm:text-[40px]">
                  {formatAppNumber(cardWallet?.balance ?? 0, language)}
                  <span className="ml-2 text-[15px] font-medium text-muted-foreground">{cardWallet?.currency ?? cur}</span>
                </p>
                {!cardWallet && (
                  <p className="mt-3 text-[11.5px] text-muted-foreground">
                    {tx("Activé dès votre premier encaissement par carte.", "Activated on your first card payment.")}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
                <div className="rounded-[14px] bg-muted px-3.5 py-2.5">
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">{tx("Collecté", "Collected")}</p>
                  <p className="mt-1 text-[15px] font-semibold text-foreground">
                    {formatAppNumber(cardWallet?.totalCollected ?? 0, language)}
                  </p>
                </div>
                <div className="rounded-[14px] bg-muted px-3.5 py-2.5">
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">{tx("Retiré", "Withdrawn")}</p>
                  <p className="mt-1 text-[15px] font-semibold text-foreground">
                    {formatAppNumber(cardWallet?.totalWithdrawn ?? 0, language)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setShowCardLink(true)}
              className="h-10 gap-2 rounded-[10px] bg-primary text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M4 10h3M10.5 10h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {tx("Lien carte", "Card link")}
            </Button>
            <Button
              variant="outline"
              disabled={!cardWallet || (cardWallet.balance ?? 0) <= 0}
              onClick={() => setShowCardWithdraw(true)}
              title={!cardWallet ? tx("Effectuez d'abord un encaissement par carte", "Collect a card payment first") : undefined}
              className="h-10 gap-2 rounded-[10px] border-0 bg-card text-[13px] font-semibold text-foreground shadow-[0_8px_24px_-18px_rgba(15,23,42,0.22)] hover:bg-muted disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M5 10l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {tx("Retirer", "Withdraw")}
            </Button>
          </div>

          {/* Withdrawal history */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-[14px] font-semibold text-foreground">{tx("Historique des retraits", "Withdrawal history")}</p>
              {cardWithdrawals.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">{cardWithdrawals.length}</span>
              )}
            </div>
            {cardWithdrawals.length === 0 ? (
              <div className="flex flex-col items-center py-12 px-5 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3v10M5 10l3 3 3-3" stroke="#9b9b97" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[13.5px] font-medium text-foreground">{tx("Aucun retrait", "No withdrawals yet")}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground max-w-[220px]">
                  {tx("Vos demandes de retrait apparaîtront ici.", "Your withdrawal requests will appear here.")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cardWithdrawals.map(wr => {
                  const dateStr = wr.createdAt
                    ? new Date(wr.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—";
                  const badge = CARD_WITHDRAWAL_STATUS_MAP[wr.status as keyof typeof CARD_WITHDRAWAL_STATUS_MAP] ?? CARD_WITHDRAWAL_STATUS_MAP.pending;
                  const badgeLabel = language === "fr" ? badge.fr : badge.en;
                  return (
                    <div key={wr.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-muted">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M8 3v10" stroke="#6b6b6b" strokeWidth="1.8" strokeLinecap="round"/>
                            <path d="M4 9l4 4 4-4" stroke="#6b6b6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground">
                            {formatAppNumber(wr.amount, language)} {wr.currency}
                            <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                              · {wr.method === "bank_transfer" ? tx("Virement", "Transfer") : tx("Espèces", "Cash")}
                            </span>
                          </p>
                          <p className="text-[11.5px] text-muted-foreground">{dateStr}</p>
                          {wr.adminNote && (
                            <p className="mt-0.5 text-[11.5px] text-muted-foreground italic">{wr.adminNote}</p>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}>
                        {badgeLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Dialogs (always mounted) ──────────────────────────────── */}

      {/* OTP confirmation dialog */}
      <Dialog open={withdrawOtpStep === "otp"} onOpenChange={open => { if (!open) { setWithdrawOtpStep("form"); setWithdrawOtpValue(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{tx("Confirmer le retrait", "Confirm withdrawal")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWithdraw} className="space-y-4 pt-1">
            <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 text-[13px] space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">{tx("Montant", "Amount")}</span><span className="font-medium">{formatAppNumber(Number(withdrawAmount), language)} {cur}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{tx("Numéro", "Number")}</span><span className="font-medium">{withdrawPhone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{tx("Frais Flow Pay", "Flow Pay fee")}</span><span className="text-muted-foreground">− {formatAppNumber(feeAmount, language)} {cur}</span></div>
              <div className="flex justify-between font-semibold"><span>{tx("Vous recevez", "You receive")}</span><span className="text-primary">{formatAppNumber(netAmount, language)} {cur}</span></div>
            </div>
            <div className="space-y-1.5">
              <Label>{tx("Code reçu par email", "Code sent by email")}</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={withdrawOtpValue}
                onChange={e => setWithdrawOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-[18px] font-bold tracking-[0.3em] h-12"
                autoFocus
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">{tx("Annuler", "Cancel")}</Button>
              </DialogClose>
              <Button type="submit" disabled={withdrawing || withdrawOtpValue.length !== 6} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {withdrawing ? tx("Traitement…", "Processing…") : tx("Confirmer", "Confirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Card wallet withdrawal dialog */}
      <Dialog open={showCardWithdraw} onOpenChange={open => { if (!open) { setShowCardWithdraw(false); resetCardWithdrawForm(); } }}>
        <DialogContent className="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden max-h-[90dvh]">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-primary">
                <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M4 10h3M10.5 10h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {tx("Retrait — Portefeuille Carte", "Withdrawal — Card Wallet")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCardWithdraw} className="flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              {tx(
                "Votre solde vous sera versé par virement bancaire ou en espèces. Nous vous contacterons sous 48h ouvrées.",
                "Your balance will be sent via bank transfer or cash. We'll contact you within 48 business hours."
              )}
            </p>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-foreground">{tx("Montant à retirer", "Amount to withdraw")}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="500"
                  step="1"
                  value={cardWithdrawAmount}
                  onChange={e => setCardWithdrawAmount(e.target.value)}
                  placeholder="500"
                  required
                  className="pr-14"
                  autoFocus
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] font-medium text-muted-foreground">
                  {cardWallet?.currency || "XAF"}
                </span>
              </div>
              {cardWallet && cardWithdrawAmount && Number(cardWithdrawAmount) > cardWallet.balance && (
                <p className="text-[12px] text-red-500">{tx("Solde insuffisant", "Insufficient balance")}</p>
              )}
            </div>

            {/* Method selector */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-foreground">{tx("Méthode", "Method")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {([["bank_transfer", tx("Virement bancaire", "Bank transfer")], ["cash", tx("Espèces", "Cash")]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCardWithdrawMethod(val)}
                    className={`h-10 rounded-lg border text-[13px] font-medium transition-all ${
                      cardWithdrawMethod === val
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank transfer fields */}
            {cardWithdrawMethod === "bank_transfer" && (
              <div className="space-y-3 rounded-xl bg-muted/30 border border-border p-4">
                {[
                  { label: tx("Nom de la banque", "Bank name"), value: cardWithdrawBankName, setter: setCardWithdrawBankName, placeholder: "BNP Paribas" },
                  { label: tx("Titulaire du compte", "Account holder"), value: cardWithdrawAccHolder, setter: setCardWithdrawAccHolder, placeholder: tx("Nom complet", "Full name") },
                  { label: tx("Numéro de compte", "Account number"), value: cardWithdrawAccNum, setter: setCardWithdrawAccNum, placeholder: "000000000" },
                  { label: tx("Pays de la banque", "Bank country"), value: cardWithdrawCountry, setter: setCardWithdrawCountry, placeholder: "FR" },
                  { label: "SWIFT / BIC", value: cardWithdrawSwift, setter: setCardWithdrawSwift, placeholder: "BNPAFRPP" },
                  { label: "IBAN", value: cardWithdrawIban, setter: setCardWithdrawIban, placeholder: "FR76 0000 0000 0000" },
                ].map(({ label, value, setter, placeholder }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-[12.5px] font-medium text-foreground">{label}</Label>
                    <Input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder} className="h-9 text-[13px]" />
                  </div>
                ))}
              </div>
            )}

            {/* Cash fields */}
            {cardWithdrawMethod === "cash" && (
              <div className="space-y-3 rounded-xl bg-muted/30 border border-border p-4">
                <div className="space-y-1">
                  <Label className="text-[12.5px] font-medium text-foreground">{tx("Lieu de retrait", "Pickup location")}</Label>
                  <Input value={cardWithdrawPickup} onChange={e => setCardWithdrawPickup(e.target.value)} placeholder={tx("Ex : Brazzaville centre-ville", "e.g. Brazzaville city center")} className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[12.5px] font-medium text-foreground">{tx("Téléphone de contact", "Contact phone")}</Label>
                  <Input value={cardWithdrawPhone} onChange={e => setCardWithdrawPhone(e.target.value)} placeholder="+242 06 000 0000" className="h-9 text-[13px]" />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-foreground">
                {tx("Notes", "Notes")}{" "}
                <span className="text-muted-foreground font-normal">{tx("(optionnel)", "(optional)")}</span>
              </Label>
              <textarea
                value={cardWithdrawNotes}
                onChange={e => setCardWithdrawNotes(e.target.value)}
                placeholder={tx("Informations complémentaires…", "Additional information…")}
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

          </div>
          <div className="flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline">{tx("Annuler", "Cancel")}</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={submittingCardWithdraw || !cardWithdrawAmount || Number(cardWithdrawAmount) < 500}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {submittingCardWithdraw ? tx("Envoi…", "Sending…") : tx("Envoyer la demande", "Send request")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
