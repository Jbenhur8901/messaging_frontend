"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { whatsappService, handleApiError } from "@/services"
import type { WhatsAppTemplate } from "@/types"
import { ChannelTabs } from "@/components/channel-tabs"
import { WhatsAppTemplateCard } from "@/components/whatsapp/whatsapp-template-card"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, RefreshCw, MessageSquareMore, AlertTriangle, Settings, Loader2 } from "lucide-react"

export default function WhatsAppTemplatesPage() {
  const { currentOrganization } = useOrganizationStore()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)

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
      console.error("Error checking config:", error)
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
      console.error("Error loading templates:", error)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await whatsappService.syncTemplates()
      if (result.success) {
        toast.success(`${result.synced} templates synchronisés`)
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
      const result = await whatsappService.deleteTemplate(template.id)
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
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
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
        <section className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                Templates
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">Templates WhatsApp</h1>
              <p className="text-muted-foreground">
                Gérez vos modèles de messages.
              </p>
            </div>
            <ChannelTabs basePath="templates" />
          </div>
        </section>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-amber-600 mb-4" />
            <p className="text-lg font-medium">WhatsApp non configuré</p>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
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
    <div className="space-y-8">
      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              Templates
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Templates WhatsApp</h1>
            <p className="text-muted-foreground">
              Gérez vos modèles de messages WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ChannelTabs basePath="templates" />
            <Button variant="outline" asChild>
              <Link href="/templates/whatsapp/create">
              <Plus className="mr-2 h-4 w-4" />
              Créer un template
              </Link>
            </Button>
            <Button onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Synchroniser
            </Button>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" className="text-sm">
              {statusCounts.APPROVED} approuvés
            </Badge>
            <Badge variant="warning" className="text-sm">
              {statusCounts.PENDING} en attente
            </Badge>
            <Badge variant="destructive" className="text-sm">
              {statusCounts.REJECTED} rejetés
            </Badge>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="UTILITY">Utilitaire</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="AUTHENTICATION">Authentification</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquareMore className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">Aucun template</p>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              {templates.length === 0
                ? "Synchronisez vos templates depuis Meta Business Manager"
                : "Aucun template ne correspond aux filtres sélectionnés"}
            </p>
            {templates.length === 0 && (
              <Button onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Synchroniser depuis Meta
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <WhatsAppTemplateCard
              key={template.id}
              template={template}
              actions={
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/templates/whatsapp/create?id=${template.id}`}>
                      Modifier
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template)}
                    disabled={deletingTemplateId === template.id}
                  >
                    {deletingTemplateId === template.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Supprimer"
                    )}
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
