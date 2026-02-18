"use client"

import { useState, useEffect, useCallback } from "react"
import { whatsappService } from "@/services/whatsapp"
import { handleApiError } from "@/services"
import type { WhatsAppAccount, WhatsAppAccountEvent } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Building2, Plus, Star, RefreshCw, Trash2, Loader2, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"

const accountStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  active: { label: "Actif", variant: "default" },
  suspended: { label: "Suspendu", variant: "destructive" },
  disconnected: { label: "D\u00e9connect\u00e9", variant: "outline" },
  verification_needed: { label: "V\u00e9rification requise", variant: "secondary" },
  restricted: { label: "Restreint", variant: "destructive" },
}

export default function WhatsAppAccountsPage() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [events, setEvents] = useState<WhatsAppAccountEvent[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)

  // Form state
  const [formWabaId, setFormWabaId] = useState("")
  const [formPhoneNumberId, setFormPhoneNumberId] = useState("")
  const [formDisplayPhone, setFormDisplayPhone] = useState("")
  const [formBusinessName, setFormBusinessName] = useState("")
  const [formAccessToken, setFormAccessToken] = useState("")
  const [formIsDefault, setFormIsDefault] = useState(false)

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await whatsappService.getAccounts()
      setAccounts(result.accounts || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const handleCreate = async () => {
    if (!formWabaId || !formPhoneNumberId || !formBusinessName || !formAccessToken) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }
    setIsSubmitting(true)
    try {
      await whatsappService.createAccount({
        waba_id: formWabaId,
        phone_number_id: formPhoneNumberId,
        display_phone_number: formDisplayPhone,
        business_name: formBusinessName,
        access_token: formAccessToken,
        is_default: formIsDefault,
      })
      toast.success("Compte ajout\u00e9")
      setIsDialogOpen(false)
      resetForm()
      loadAccounts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormWabaId("")
    setFormPhoneNumberId("")
    setFormDisplayPhone("")
    setFormBusinessName("")
    setFormAccessToken("")
    setFormIsDefault(false)
  }

  const handleSetDefault = async (id: string) => {
    try {
      await whatsappService.setDefaultAccount(id)
      toast.success("Compte d\u00e9fini par d\u00e9faut")
      loadAccounts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const handleSync = async (id: string) => {
    try {
      await whatsappService.syncAccount(id)
      toast.success("Compte synchronis\u00e9")
      loadAccounts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await whatsappService.deleteAccount(id)
      toast.success("Compte supprim\u00e9")
      loadAccounts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const toggleEvents = async (id: string) => {
    if (expandedAccount === id) {
      setExpandedAccount(null)
      return
    }
    setExpandedAccount(id)
    setIsLoadingEvents(true)
    try {
      const result = await whatsappService.getAccountEvents(id)
      setEvents(result.events || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoadingEvents(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Comptes WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            G&eacute;rez vos comptes WhatsApp Business
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un compte
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un compte WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>WABA ID *</Label>
                <Input value={formWabaId} onChange={(e) => setFormWabaId(e.target.value)} placeholder="123456789" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number ID *</Label>
                <Input value={formPhoneNumberId} onChange={(e) => setFormPhoneNumberId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Num&eacute;ro affich&eacute;</Label>
                <Input value={formDisplayPhone} onChange={(e) => setFormDisplayPhone(e.target.value)} placeholder="+237..." />
              </div>
              <div className="space-y-2">
                <Label>Nom business *</Label>
                <Input value={formBusinessName} onChange={(e) => setFormBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Access Token *</Label>
                <Input type="password" value={formAccessToken} onChange={(e) => setFormAccessToken(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formIsDefault} onCheckedChange={setFormIsDefault} />
                <Label>Compte par d&eacute;faut</Label>
              </div>
              <Button onClick={handleCreate} disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun compte WhatsApp configur&eacute;
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const config = accountStatusConfig[account.status] || { label: account.status, variant: "outline" as const }
            return (
              <Card key={account.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {account.business_name}
                        {account.is_default && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 font-mono">
                        {account.display_phone_number}
                      </p>
                    </div>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {account.quality_rating && (
                    <div className="text-xs text-muted-foreground">
                      Qualit&eacute; : <span className="font-medium">{account.quality_rating}</span>
                    </div>
                  )}
                  {account.messaging_limit && (
                    <div className="text-xs text-muted-foreground">
                      Limite : <span className="font-medium">{account.messaging_limit}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {!account.is_default && (
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleSetDefault(account.id)}>
                        <Star className="h-3 w-3 mr-1" />
                        D&eacute;faut
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleSync(account.id)}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => toggleEvents(account.id)}>
                      <Clock className="h-3 w-3 mr-1" />
                      Historique
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-7 text-red-500">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irr&eacute;versible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(account.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Events timeline */}
                  {expandedAccount === account.id && (
                    <div className="border-t pt-3 mt-3">
                      <h4 className="text-xs font-medium mb-2">Historique</h4>
                      {isLoadingEvents ? (
                        <Skeleton className="h-20 w-full" />
                      ) : events.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucun &eacute;v&eacute;nement</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {events.map((event) => (
                            <div key={event.id} className="flex items-start gap-2 text-xs">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                              <div>
                                <span className="font-medium">{event.event_type}</span>
                                {event.details && <span className="text-muted-foreground ml-1">— {event.details}</span>}
                                <div className="text-muted-foreground">{formatDate(event.created_at)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
