"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { whatsappService, handleApiError } from "@/services"
import type { WhatsAppTemplate } from "@/types"
import { WhatsAppTemplateCard } from "@/components/whatsapp/whatsapp-template-card"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Plus,
  RefreshCw,
  MessageSquareMore,
  AlertTriangle,
  Settings,
  Loader2,
} from "lucide-react"

export default function WhatsAppTemplatesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentOrganization } = useOrganizationStore()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const hasProcessedRedirectFeedback = useRef(false)

  useEffect(() => {
    if (!currentOrganization?.id) {
      setIsConfigured(false)
      setIsLoading(false)
      return
    }
    checkConfigAndLoadTemplates()
  }, [currentOrganization?.id])

  const checkConfigAndLoadTemplates = async () => {
    try {
      if (!currentOrganization?.id) return
      const configResult = await whatsappService.getConfig(currentOrganization.id)
      setIsConfigured(configResult.is_configured)

      if (configResult.is_configured) {
        await loadTemplates()
      }
    } catch (error) {
      setIsConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const result = await whatsappService.getTemplates(
        filterStatus !== "all" ? filterStatus : undefined,
        filterCategory !== "all" ? filterCategory : undefined,
        100,
        0
      )
      setTemplates(result.templates || [])
    } catch (error) {
    }
  }

  useEffect(() => {
    if (hasProcessedRedirectFeedback.current) return
    if (isLoading || !isConfigured) return
    const created = searchParams.get("created") === "1"
    const refresh = searchParams.get("refresh") === "1"
    if (!created && !refresh) return

    hasProcessedRedirectFeedback.current = true
    if (created) {
      toast.success("Template créé avec succès")
    }
    if (refresh) {
      loadTemplates()
    }
    router.replace("/templates/whatsapp")
  }, [isLoading, isConfigured, router, searchParams])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await whatsappService.syncTemplates()
      if (result.success) {
        toast.success("Templates synchronisés")
        await loadTemplates()
      } else {
        toast.error(result.message || "Erreur lors de la synchronisation")
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDeleteTemplate = async (template: WhatsAppTemplate) => {
    const confirmed = window.confirm(`Supprimer le template "${template.name}" ?`)
    if (!confirmed) return
    setDeletingTemplateId(template.id)
    try {
      const result = await whatsappService.deleteTemplate(template.name)
      if (result.success) {
        toast.success("Template supprimé")
        setTemplates((prev) => prev.filter((t) => t.id !== template.id))
      } else {
        toast.error(result.message || "Erreur lors de la suppression")
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setDeletingTemplateId(null)
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false
    if (filterCategory !== "all" && t.category !== filterCategory) return false
    return true
  })

  // Count by status
  const statusCounts = {
    APPROVED: templates.filter((t) => t.status === "APPROVED").length,
    PENDING: templates.filter((t) => t.status === "PENDING").length,
    REJECTED: templates.filter((t) => t.status === "REJECTED").length,
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Not configured state
  if (isConfigured === false) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Templates WhatsApp</h1>
            <p className="text-muted-foreground mt-1">
              Centralisez vos messages marketing, utilitaires et conversationnels.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium">WhatsApp non configuré</p>
            <p className="text-muted-foreground mb-4 text-center max-w-md text-sm">
              Configurez vos credentials WhatsApp Business API pour accéder aux templates
            </p>
            <Link href="/whatsapp/config">
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Configurer WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates WhatsApp</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {templates.length} template{templates.length !== 1 ? "s" : ""}
            {statusCounts.APPROVED > 0 && (
              <span className="text-emerald-600"> · {statusCounts.APPROVED} approuvé{statusCounts.APPROVED !== 1 ? "s" : ""}</span>
            )}
            {statusCounts.PENDING > 0 && (
              <span className="text-amber-600"> · {statusCounts.PENDING} en attente</span>
            )}
            {statusCounts.REJECTED > 0 && (
              <span className="text-red-600"> · {statusCounts.REJECTED} rejeté{statusCounts.REJECTED !== 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/templates/whatsapp/create">
              <Plus className="mr-1.5 h-4 w-4" />
              Créer
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Synchroniser
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="APPROVED">Approuvés</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="REJECTED">Rejetés</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            <SelectItem value="UTILITY">Utilitaire</SelectItem>
            <SelectItem value="MARKETING">Marketing</SelectItem>
            <SelectItem value="AUTHENTICATION">Authentification</SelectItem>
          </SelectContent>
        </Select>

        {(filterStatus !== "all" || filterCategory !== "all") && (
          <button
            onClick={() => { setFilterStatus("all"); setFilterCategory("all") }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Réinitialiser
          </button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredTemplates.length} résultat{filteredTemplates.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquareMore className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="font-medium">Aucun template</p>
            <p className="text-muted-foreground mb-4 text-center max-w-md text-sm">
              {templates.length === 0
                ? "Synchronisez vos templates depuis Meta Business Manager"
                : "Aucun template ne correspond aux filtres sélectionnés"}
            </p>
            {templates.length === 0 && (
              <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Synchroniser depuis Meta
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <WhatsAppTemplateCard
              key={template.id}
              template={template}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7"
                  onClick={() => handleDeleteTemplate(template)}
                  disabled={deletingTemplateId === template.id}
                >
                  {deletingTemplateId === template.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Supprimer"
                  )}
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
