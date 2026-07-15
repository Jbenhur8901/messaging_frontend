"use client"

import { useEffect, useState, useCallback } from "react"
import { whatsappService, handleApiError } from "@/services"
import { useOrganizationStore } from "@/stores"
import type { WhatsAppAccount } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

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
  Pencil,
  Star,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { CoexistenceSignupButton } from "@/components/whatsapp/coexistence-signup-button"

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
    if (open && isConfigured) {
      setFormPhoneNumberId(configPhoneNumberId)
      setFormWabaId(configWabaId)
      setFormEnabled(isEnabled)
      setTestResult(null)
    } else if (!open) {
      resetForm()
    }
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
                  {isConfigured ? (
                    <><Pencil className="h-3.5 w-3.5" />Modifier</>
                  ) : (
                    <><Plus className="h-3.5 w-3.5" />Ajouter</>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">
                    {isConfigured ? "Modifier la configuration" : "Configurer WhatsApp"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-1">
                  <CoexistenceSignupButton
                    onConnected={async () => {
                      setIsDialogOpen(false)
                      await Promise.all([loadConfig(), loadAccounts()])
                    }}
                  />
                  <div className="flex items-center gap-3 py-1" aria-hidden="true">
                    <span className="h-px flex-1 bg-border/60" />
                    <span className="text-[11px] text-muted-foreground">ou configuration manuelle</span>
                    <span className="h-px flex-1 bg-border/60" />
                  </div>
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
