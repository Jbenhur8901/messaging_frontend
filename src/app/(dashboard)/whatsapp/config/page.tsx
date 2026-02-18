"use client"

import { useEffect, useState, useCallback } from "react"
import { whatsappService, handleApiError } from "@/services"
import { useOrganizationStore } from "@/stores"
import type { WhatsAppAccount } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Star,
  RefreshCw,
  Trash2,
  Bot,
  Zap,
  Settings,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  active: { label: "Actif", variant: "default" },
  suspended: { label: "Suspendu", variant: "destructive" },
  disconnected: { label: "Déconnecté", variant: "outline" },
  verification_needed: { label: "Vérification", variant: "secondary" },
  restricted: { label: "Restreint", variant: "destructive" },
}

export default function WhatsAppConfigPage() {
  const { currentOrganization } = useOrganizationStore()

  // ── Org config state ──
  const [isLoading, setIsLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const [configPhoneNumberId, setConfigPhoneNumberId] = useState("")
  const [configWabaId, setConfigWabaId] = useState("")
  const [configError, setConfigError] = useState<string | null>(null)

  // ── Accounts state ──
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)

  // ── Add dialog state ──
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [formPhoneNumberId, setFormPhoneNumberId] = useState("")
  const [formWabaId, setFormWabaId] = useState("")
  const [formEnabled, setFormEnabled] = useState(true)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    phone_number?: string
  } | null>(null)

  // ── Account detail dialog state ──
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null)
  const [isSettingActive, setIsSettingActive] = useState(false)
  const [togglingAccountId, setTogglingAccountId] = useState<string | null>(null)

  // ── AI Assistant state ──
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiInstructions, setAiInstructions] = useState("")
  const [aiModel, setAiModel] = useState("gpt-4o")
  const [aiTimeline, setAiTimeline] = useState("3600")
  const [aiSaving, setAiSaving] = useState(false)

  // ── Load org config ──
  useEffect(() => {
    loadConfig()
  }, [currentOrganization?.id])

  const loadConfig = async () => {
    if (!currentOrganization?.id) {
      setIsLoading(false)
      return
    }
    setConfigError(null)
    try {
      const result = await whatsappService.getConfig(currentOrganization.id)
      const r = result as Record<string, unknown>
      setIsConfigured(result.is_configured)

      // WhatsApp config — fields may be at root or nested in config
      const nested = r.config as Record<string, unknown> | undefined
      const enabledValue =
        (nested?.enabled as boolean | undefined) ??
        (r.whatsapp_enabled as boolean | undefined)
      setIsEnabled(enabledValue ?? true)
      const phoneId = (nested?.phone_number_id ?? r.whatsapp_phone_number_id ?? "") as string
      const wabaId = (nested?.business_account_id ?? r.whatsapp_business_account_id ?? "") as string
      if (phoneId) setConfigPhoneNumberId(phoneId)
      if (wabaId) setConfigWabaId(wabaId)

      // AI config — always at root level
      if (typeof r.ai_enabled === "boolean") setAiEnabled(r.ai_enabled)
      if (typeof r.ai_instructions === "string") setAiInstructions(r.ai_instructions)
      if (typeof r.ai_model === "string") setAiModel(r.ai_model)
      if (typeof r.ai_timeline === "string") setAiTimeline(r.ai_timeline)
    } catch (error) {
      const apiError = handleApiError(error)
      setConfigError(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Load accounts ──
  const loadAccounts = useCallback(async () => {
    setIsLoadingAccounts(true)
    try {
      const result = await whatsappService.getAccounts(undefined, true)
      setAccounts(result.accounts || [])
    } catch {
    } finally {
      setIsLoadingAccounts(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  // ── Dialog handlers ──
  const resetForm = () => {
    setFormPhoneNumberId("")
    setFormWabaId("")
    setFormEnabled(isEnabled)
    setTestResult(null)
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) resetForm()
  }

  const handleTest = async () => {
    if (!currentOrganization?.id) {
      toast.error("Aucune organisation sélectionnée")
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await whatsappService.testConfig(currentOrganization.id)
      setTestResult(result)
      if (result.success) {
        toast.success("Connexion réussie")
      } else {
        toast.error(result.message || "Échec du test")
      }
    } catch (error) {
      const apiError = handleApiError(error)
      setTestResult({ success: false, message: apiError.message })
      toast.error(apiError.message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!formWabaId.trim() || !formPhoneNumberId.trim()) {
      toast.error("Tous les champs sont requis")
      return
    }
    if (!currentOrganization?.id) {
      toast.error("Aucune organisation sélectionnée")
      return
    }
    setIsSaving(true)
    try {
      const result = await whatsappService.setConfig(currentOrganization.id, {
        phone_number_id: formPhoneNumberId,
        business_account_id: formWabaId,
        enabled: formEnabled,
      })
      if (result.success) {
        setIsConfigured(true)
        setIsEnabled(formEnabled)
        setConfigPhoneNumberId(formPhoneNumberId)
        setConfigWabaId(formWabaId)
        toast.success("Configuration sauvegardée")
        setIsDialogOpen(false)
        resetForm()
        // Reload accounts immediately + retry after delay for backend propagation
        loadAccounts()
        setTimeout(() => loadAccounts(), 1500)
      } else {
        toast.error(result.message || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Account detail dialog ──
  const handleAccountClick = (account: WhatsAppAccount) => {
    setSelectedAccount(account)
  }

  const handleToggleActive = async (account: WhatsAppAccount, active: boolean) => {
    if (!currentOrganization?.id) return
    setIsSettingActive(true)
    try {
      await whatsappService.setConfig(currentOrganization.id, {
        enabled: active,
      })
      setIsEnabled(active)
      toast.success(active ? "Compte activé" : "Compte désactivé")
      setSelectedAccount({ ...account, is_default: account.is_default })
      loadAccounts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSettingActive(false)
    }
  }

  const handleRowSetDefault = async (account: WhatsAppAccount) => {
    if (!currentOrganization?.id) return
    setTogglingAccountId(account.id)
    try {
      await whatsappService.setDefaultAccount(account.id)
      await whatsappService.setConfig(currentOrganization.id, {
        phone_number_id: account.phone_number_id,
        business_account_id: account.waba_id,
        enabled: isEnabled,
      })
      toast.success("Compte défini par défaut")
      loadAccounts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setTogglingAccountId(null)
    }
  }

  // ── Account actions ──
  const handleSync = async (id: string) => {
    try {
      await whatsappService.syncAccount(id)
      toast.success("Compte synchronisé")
      loadAccounts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const handleSaveAi = async (overrideEnabled?: boolean) => {
    if (!currentOrganization?.id) return
    const enabled = overrideEnabled !== undefined ? overrideEnabled : aiEnabled
    setAiSaving(true)
    try {
      await whatsappService.setConfig(currentOrganization.id, {
        ai_enabled: enabled,
        ai_instructions: aiInstructions,
        ai_model: aiModel,
        ai_timeline: aiTimeline,
      })
      toast.success(enabled ? "Assistance IA activée" : "Assistance IA désactivée")
      setAiDialogOpen(false)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setAiSaving(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      await whatsappService.deleteAccount(id)
      toast.success("Compte supprimé")
      loadAccounts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (configError) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Configuration WhatsApp</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Gérez vos comptes WhatsApp Business API
          </p>
        </div>
        <Card className="border-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <XCircle className="h-8 w-8 text-destructive/60" />
            <p className="text-[13px] text-muted-foreground text-center max-w-sm">{configError}</p>
            <Button variant="outline" size="sm" className="h-8 text-[12px] rounded-lg gap-1.5 mt-2" onClick={() => loadConfig()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between" style={stagger(0)}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Configuration WhatsApp</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Gérez vos comptes WhatsApp Business API
          </p>
        </div>
      </div>

      {/* ── Accounts Section ── */}
      <div style={stagger(1)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Comptes
          </h2>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={loadAccounts}
              disabled={isLoadingAccounts}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAccounts ? "animate-spin" : ""}`} />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-[13px] rounded-lg">
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">Configurer WhatsApp</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Phone Number ID *</Label>
                    <Input className="h-9 text-[13px]" value={formPhoneNumberId} onChange={(e) => setFormPhoneNumberId(e.target.value)} placeholder="109999999999999" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">WABA ID *</Label>
                    <Input className="h-9 text-[13px]" value={formWabaId} onChange={(e) => setFormWabaId(e.target.value)} placeholder="102290129999999" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                    <div>
                      <p className="text-[13px] font-medium">Activer WhatsApp</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Active l&apos;envoi WhatsApp pour cette organisation.
                      </p>
                    </div>
                    <Switch
                      checked={formEnabled}
                      onCheckedChange={setFormEnabled}
                      aria-label="Activer WhatsApp"
                    />
                  </div>

                  {/* Test Result */}
                  {testResult && (
                    <div
                      className={`rounded-lg p-3 text-[13px] ${
                        testResult.success
                          ? "bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300"
                          : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span className="font-medium">
                          {testResult.success ? "Connexion réussie" : "Échec de la connexion"}
                        </span>
                      </div>
                      {testResult.phone_number && <p className="mt-1">Numéro vérifié : {testResult.phone_number}</p>}
                      {!testResult.success && <p className="mt-1">{testResult.message}</p>}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-[13px] rounded-lg"
                      onClick={handleTest}
                      disabled={isTesting || !isConfigured}
                    >
                      {isTesting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Tester la connexion
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-9 text-[13px] rounded-lg"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoadingAccounts ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : accounts.length === 0 && !isConfigured ? (
          <Card className="border-transparent">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-[13px] text-muted-foreground">Aucun compte WhatsApp configuré</p>
            </CardContent>
          </Card>
        ) : accounts.length === 0 && isConfigured ? (
          <div className="space-y-1">
            <div
              className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors duration-200 hover:bg-accent/50"
              style={stagger(2)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium">Compte WhatsApp</p>
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {configPhoneNumberId && (
                    <span className="text-[11px] text-muted-foreground font-mono">ID: {configPhoneNumberId}</span>
                  )}
                  {configWabaId && (
                    <>
                      <span className="text-muted-foreground/40 text-[11px]">&middot;</span>
                      <span className="text-[11px] text-muted-foreground font-mono">WABA: {configWabaId}</span>
                    </>
                  )}
                </div>
              </div>
              {isEnabled ? (
                <Badge variant="success" className="text-[10px] shrink-0">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Configuré
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] shrink-0">Désactivé</Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {accounts.map((account, i) => {
              const cfg = statusConfig[account.status] || { label: account.status, variant: "outline" as const }
              return (
                <div
                  key={account.id}
                  className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors duration-200 hover:bg-accent/50 cursor-pointer"
                  style={stagger(i + 2)}
                  onClick={() => handleAccountClick(account)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium truncate">{account.business_name}</p>
                      {account.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {account.display_phone_number && (
                        <span className="text-[11px] text-muted-foreground font-mono">{account.display_phone_number}</span>
                      )}
                      <span className="text-[11px] text-muted-foreground font-mono">ID: {account.phone_number_id}</span>
                      <span className="text-muted-foreground/40 text-[11px]">&middot;</span>
                      <span className="text-[11px] text-muted-foreground font-mono">WABA: {account.waba_id}</span>
                      {account.verified_name && (
                        <>
                          <span className="text-muted-foreground/40 text-[11px]">&middot;</span>
                          <span className="text-[11px] text-muted-foreground">{account.verified_name}</span>
                        </>
                      )}
                      {account.quality_rating && (
                        <>
                          <span className="text-muted-foreground/40 text-[11px]">&middot;</span>
                          <span className="text-[11px] text-muted-foreground">Qualité: {account.quality_rating}</span>
                        </>
                      )}
                      {account.messaging_limit && (
                        <>
                          <span className="text-muted-foreground/40 text-[11px]">&middot;</span>
                          <span className="text-[11px] text-muted-foreground">Limite: {account.messaging_limit}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span className="hidden lg:block text-[11px] text-muted-foreground shrink-0">
                    {formatDate(account.created_at)}
                  </span>

                  {account.is_default && isEnabled ? (
                    <Badge variant="success" className="text-[10px] shrink-0">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Configuré
                    </Badge>
                  ) : (
                    <Badge variant={cfg.variant} className="text-[10px] shrink-0">{cfg.label}</Badge>
                  )}

                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={account.is_default && isEnabled}
                      disabled={(account.is_default && isEnabled) || togglingAccountId === account.id}
                      onCheckedChange={() => handleRowSetDefault(account)}
                      aria-label="Définir par défaut"
                    />
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleSync(account.id)} title="Synchroniser">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" title="Supprimer">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Le compte &quot;{account.business_name}&quot; sera définitivement supprimé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAccount(account.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── AI Assistance Section ── */}
      <div style={stagger(3)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Assistance IA
          </h2>
        </div>
        <div className="rounded-xl border border-border/40 bg-gradient-to-r from-violet-50/50 to-purple-50/50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${aiEnabled ? "bg-violet-100" : "bg-gray-100"}`}>
                <Bot className={`h-5 w-5 ${aiEnabled ? "text-violet-600" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-900">Agent IA</p>
                <p className="text-[12px] text-gray-500">
                  {aiEnabled ? "L'IA répond automatiquement aux messages entrants" : "Activez pour répondre automatiquement via l'IA"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {aiEnabled && (
                <button
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-[12px] font-medium text-violet-600 transition-colors hover:bg-violet-50"
                  onClick={() => setAiDialogOpen(true)}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Configurer
                </button>
              )}
              <Switch
                checked={aiEnabled}
                onCheckedChange={(checked) => {
                  setAiEnabled(checked)
                  if (checked) setAiDialogOpen(true)
                  else handleSaveAi(false)
                }}
              />
            </div>
          </div>
          {aiEnabled && aiInstructions && (
            <div className="mt-4 rounded-lg bg-white/80 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="h-3 w-3 text-violet-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Instructions</span>
              </div>
              <p className="text-[12px] leading-relaxed text-gray-600 line-clamp-3">{aiInstructions}</p>
            </div>
          )}
          {aiEnabled && (
            <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-400">
              <span>Modèle : <span className="font-medium text-gray-600">{aiModel}</span></span>
              <span>Session : <span className="font-medium text-gray-600">{aiTimeline}s</span></span>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Config Dialog ── */}
      {aiDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]" onClick={() => setAiDialogOpen(false)}>
          <div className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                  <Bot className="h-4.5 w-4.5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900">Configurer l&apos;agent IA</h3>
                  <p className="text-[11px] text-gray-400">Personnalisez le comportement de l&apos;assistance automatique</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setAiDialogOpen(false)}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Instructions */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-gray-700">Instructions de l&apos;agent</label>
                <p className="text-[11px] leading-relaxed text-gray-400">Décrivez le rôle, le ton et les limites de l&apos;IA. Soyez précis pour de meilleurs résultats.</p>
                <Textarea
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="Ex: Tu es un assistant commercial pour notre entreprise. Réponds de manière professionnelle et concise aux questions des clients sur nos produits et services. Ne donne jamais d'informations personnelles ou confidentielles..."
                  className="min-h-[140px] rounded-lg border-gray-200 text-[13px] leading-relaxed placeholder:text-gray-400"
                />
              </div>

              {/* Advanced config */}
              <details className="group rounded-lg border border-gray-200">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
                  Configuration avancée
                  <svg className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="space-y-3 border-t border-gray-100 p-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-gray-500">Modèle</Label>
                    <select
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                    >
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-gray-500">Durée session (sec)</Label>
                    <Input
                      type="number"
                      value={aiTimeline}
                      onChange={(e) => setAiTimeline(e.target.value)}
                      placeholder="3600"
                      className="h-9 text-[12px]"
                    />
                    <p className="text-[11px] text-gray-400">L&apos;IA garde le contexte de la conversation pendant cette durée.</p>
                  </div>
                </div>
              </details>

              {/* Save button */}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  className="h-10 rounded-lg px-4 text-[13px]"
                  onClick={() => setAiDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="h-10 rounded-lg px-6 text-[13px] gap-2 bg-violet-600 hover:bg-violet-700"
                  onClick={() => handleSaveAi()}
                  disabled={aiSaving}
                >
                  {aiSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Account Detail Dialog ── */}
      <Dialog open={!!selectedAccount} onOpenChange={(open) => { if (!open) setSelectedAccount(null) }}>
        <DialogContent className="max-w-md">
          {selectedAccount && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selectedAccount.business_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-muted-foreground">Phone Number ID</Label>
                  <Input className="h-9 text-[13px]" value={selectedAccount.phone_number_id} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-muted-foreground">WABA ID</Label>
                  <Input className="h-9 text-[13px]" value={selectedAccount.waba_id} readOnly />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                  <div>
                    <p className="text-[13px] font-medium">Rendre actif</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Utiliser ce compte pour l&apos;envoi WhatsApp de cette organisation.
                    </p>
                  </div>
                  <Switch
                    checked={selectedAccount.is_default && isEnabled}
                    disabled={isSettingActive}
                    onCheckedChange={(checked) => handleToggleActive(selectedAccount, checked)}
                    aria-label="Rendre actif"
                  />
                </div>

                {isSettingActive && (
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Activation en cours...
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
