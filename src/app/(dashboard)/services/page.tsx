"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { featureFlags } from "@/config/features"
import { messagingServicesService, handleApiError } from "@/services"
import type { MessagingService } from "@/types"
import { formatDate } from "@/lib/utils"
import { authStorage } from "@/lib/auth-storage"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  MessageSquare,
  Plus,
  Trash,
  Loader2,
  Send,
  Megaphone,
  ShieldCheck,
  MoreVertical,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const USECASE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  notifications: {
    label: "Notifications",
    icon: <Send className="h-4 w-4" />,
    color: "bg-blue-50 text-blue-700",
  },
  marketing: {
    label: "Marketing",
    icon: <Megaphone className="h-4 w-4" />,
    color: "bg-amber-100 text-amber-700",
  },
  verification: {
    label: "Vérification",
    icon: <ShieldCheck className="h-4 w-4" />,
    color: "bg-emerald-100 text-emerald-700",
  },
  otp: {
    label: "OTP",
    icon: <ShieldCheck className="h-4 w-4" />,
    color: "bg-amber-100 text-amber-700",
  },
  transactional: {
    label: "Transactionnel",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "bg-muted text-muted-foreground",
  },
}

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<MessagingService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null)

  // Form state
  const [serviceName, setServiceName] = useState("")
  const [alphaSenderId, setAlphaSenderId] = useState("")
  const [usecase, setUsecase] = useState<"notifications" | "marketing" | "verification" | "otp" | "transactional">("notifications")

  useEffect(() => {
    loadServices()
  }, [])

  useEffect(() => {
    if (!featureFlags.SMS_ENABLED) router.replace("/dashboard")
  }, [router])

  const loadServices = async () => {
    const token = authStorage.getItem("access_token")
    if (!token) {
      setIsLoading(false)
      return
    }

    const result = await messagingServicesService.list()
    setServices(result.services)
    setIsLoading(false)
  }

  if (!featureFlags.SMS_ENABLED) return null

  const handleCreateService = async () => {
    if (!serviceName.trim()) {
      toast.error("Le nom du service est requis")
      return
    }

    if (!alphaSenderId.trim()) {
      toast.error("L'identifiant d'expéditeur est requis")
      return
    }

    const normalizedAlphaSenderId = alphaSenderId.trim()

    if (normalizedAlphaSenderId.length < 3 || normalizedAlphaSenderId.length > 11) {
      toast.error("L'identifiant doit contenir entre 3 et 11 caractères")
      return
    }

    // Check allowed characters (uppercase letters, digits, spaces)
    if (!/^[A-Z0-9 ]+$/.test(normalizedAlphaSenderId)) {
      toast.error("L'identifiant ne peut contenir que des lettres majuscules, des chiffres et des espaces")
      return
    }

    setIsCreating(true)
    try {
      const result = await messagingServicesService.create({
        service_name: serviceName,
        alpha_sender_id: normalizedAlphaSenderId,
        usecase,
      })

      const updatedServices = [...services, result.service]
      setServices(updatedServices)

      toast.success("Service de messagerie créé")
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteService = async () => {
    if (!deleteServiceId) return

    try {
      await messagingServicesService.delete(deleteServiceId)

      // Remove from local state
      const updatedServices = services.filter(s => s.id !== deleteServiceId)
      setServices(updatedServices)
      toast.success("Service supprimé")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setDeleteServiceId(null)
    }
  }

  const handleSetDefault = async (serviceId: string) => {
    try {
      await messagingServicesService.setDefault(serviceId)
      setServices((prev) =>
        prev.map((service) => ({
          ...service,
          is_default: service.id === serviceId,
        }))
      )
      toast.success("Service défini comme défaut")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const resetForm = () => {
    setServiceName("")
    setAlphaSenderId("")
    setUsecase("notifications")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Services de messagerie</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos identifiants d&apos;expéditeur pour vos campagnes SMS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau service
          </Button>
        </div>
      </div>

      {/* Services Grid */}
      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun service de messagerie</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Créez un service de messagerie pour définir l&apos;identifiant d&apos;expéditeur
              qui apparaîtra sur les téléphones de vos destinataires.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const usecaseInfo = USECASE_LABELS[service.usecase] || USECASE_LABELS.notifications
            return (
              <Card key={service.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{service.service_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {service.alpha_sender_id}
                        </Badge>
                        {service.is_active && (
                          <Badge variant="success" className="text-xs">Actif</Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleSetDefault(service.id)}
                          disabled={!service.is_active || service.is_default}
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Définir par défaut
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteServiceId(service.id)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${usecaseInfo.color}`}>
                      {usecaseInfo.icon}
                      {usecaseInfo.label}
                    </div>
                    {service.is_default && (
                      <Badge variant="outline">Défaut</Badge>
                    )}
                    {service.service_sid && (
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        SID: {service.service_sid}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Créé le {formatDate(service.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau service de messagerie</DialogTitle>
            <DialogDescription>
              Créez un identifiant d&apos;expéditeur pour vos campagnes SMS
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Nom du service</Label>
              <Input
                id="serviceName"
                placeholder="Ex: Notifications client"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Un nom descriptif pour identifier ce service
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alphaSenderId">Identifiant d&apos;expéditeur</Label>
              <Input
                id="alphaSenderId"
                placeholder="Ex: FLOW"
                value={alphaSenderId}
                onChange={(e) =>
                  setAlphaSenderId(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9 ]/g, "")
                      .replace(/\s+/g, " ")
                  )
                }
                maxLength={11}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">
                3-11 caractères (lettres majuscules, chiffres et espaces). C&apos;est le nom qui apparaîtra comme expéditeur.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Type d&apos;utilisation</Label>
              <Select value={usecase} onValueChange={(v) => setUsecase(v as typeof usecase)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notifications">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Notifications transactionnelles
                    </div>
                  </SelectItem>
                  <SelectItem value="marketing">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      Marketing / Promotions
                    </div>
                  </SelectItem>
                  <SelectItem value="verification">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Vérification / OTP
                    </div>
                  </SelectItem>
                  <SelectItem value="otp">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      OTP
                    </div>
                  </SelectItem>
                  <SelectItem value="transactional">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Transactionnel
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false)
              resetForm()
            }}>
              Annuler
            </Button>
            <Button onClick={handleCreateService} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les campagnes utilisant cet identifiant
              d&apos;expéditeur ne pourront plus être envoyées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
