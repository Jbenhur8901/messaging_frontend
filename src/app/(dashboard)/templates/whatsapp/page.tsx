"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { whatsappService, handleApiError } from "@/services"
import type { TemplateAnalytics, WhatsAppTemplate } from "@/types"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  BarChart3,
  MoreHorizontal,
  Pencil,
  Trash2,
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
  const [analyticsTemplate, setAnalyticsTemplate] = useState<WhatsAppTemplate | null>(null)
  const [templateAnalytics, setTemplateAnalytics] = useState<TemplateAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
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

  const handleViewAnalytics = async (template: WhatsAppTemplate) => {
    setAnalyticsTemplate(template)
    setTemplateAnalytics(null)
    setAnalyticsLoading(true)
    const endDate = new Date()
    const startDate = new Date("2000-01-01T00:00:00Z")
    try {
      const analytics = await whatsappService.getTemplateAnalyticsDetail(
        template.id,
        startDate.toISOString().slice(0, 10),
        endDate.toISOString().slice(0, 10)
      )
      setTemplateAnalytics(analytics)
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setAnalyticsLoading(false)
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

      {/* Templates table */}
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
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden sm:table-cell">Langue</TableHead>
                <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                <TableHead className="hidden sm:table-cell">Statut</TableHead>
                <TableHead className="text-right"><span className="sm:hidden">Options</span><span className="hidden sm:inline">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="max-w-[220px] font-medium">
                    <span className="block truncate">{template.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground sm:hidden">
                      {template.language} · {template.category.toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{template.language}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {{ UTILITY: "Utilitaire", MARKETING: "Marketing", AUTHENTICATION: "Authentification" }[template.category]}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={
                      template.status === "APPROVED"
                        ? "font-medium text-emerald-500"
                        : template.status === "REJECTED"
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                    }>
                      {{ APPROVED: "Approuvé", REJECTED: "Rejeté", PENDING: "En attente" }[template.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="hidden items-center justify-end gap-1 sm:flex">
                      <Button variant="ghost" size="icon" className="h-9 w-9" asChild title="Modifier">
                        <Link href={`/templates/whatsapp/create?id=${template.id}`}><Pencil className="h-4 w-4" /><span className="sr-only">Modifier</span></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9" title="Statistiques" onClick={() => handleViewAnalytics(template)}>
                        <BarChart3 className="h-4 w-4" /><span className="sr-only">Statistiques</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive" title="Supprimer" onClick={() => handleDeleteTemplate(template)} disabled={deletingTemplateId === template.id}>
                        {deletingTemplateId === template.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}<span className="sr-only">Supprimer</span>
                      </Button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild className="sm:hidden">
                        <Button variant="outline" size="sm">Options<MoreHorizontal className="ml-2 h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={`/templates/whatsapp/create?id=${template.id}`}><Pencil className="mr-2 h-4 w-4" />Modifier</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewAnalytics(template)}><BarChart3 className="mr-2 h-4 w-4" />Statistiques</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteTemplate(template)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(analyticsTemplate)} onOpenChange={(open) => !open && setAnalyticsTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Statistiques du template</DialogTitle>
            <DialogDescription>{analyticsTemplate?.name} · Toutes les campagnes</DialogDescription>
          </DialogHeader>
          {analyticsLoading ? (
            <div className="grid grid-cols-2 gap-3" aria-label="Chargement des statistiques">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-20 rounded-lg" />)}
            </div>
          ) : templateAnalytics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Envoyés", templateAnalytics.total_sent], ["Livrés", templateAnalytics.delivered], ["Lus", templateAnalytics.read], ["Échecs", templateAnalytics.failed]].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Campagnes utilisant ce template</p>
                {templateAnalytics.campaigns?.length ? (
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-border/60">
                    <Table>
                      <TableHeader><TableRow><TableHead>Campagne</TableHead><TableHead className="text-right">Envoyés</TableHead><TableHead className="hidden text-right sm:table-cell">Livrés</TableHead><TableHead className="hidden text-right sm:table-cell">Lus</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {templateAnalytics.campaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell><p className="max-w-[240px] truncate font-medium">{campaign.campaign_name || "Campagne sans nom"}</p><p className="text-xs text-muted-foreground">{new Date(campaign.created_at).toLocaleDateString("fr-FR")}</p></TableCell>
                            <TableCell className="text-right tabular-nums">{campaign.sent_count}</TableCell>
                            <TableCell className="hidden text-right tabular-nums sm:table-cell">{campaign.delivered_count}</TableCell>
                            <TableCell className="hidden text-right tabular-nums sm:table-cell">{campaign.read_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : <p className="rounded-lg bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">Aucune campagne n’a encore utilisé ce template sur cette période.</p>}
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune statistique disponible.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
