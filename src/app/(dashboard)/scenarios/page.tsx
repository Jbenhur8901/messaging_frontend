"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { scenariosService, handleApiError } from "@/services"
import type { ConversationScenario, ScenarioStatus } from "@/types"
import { formatDate, formatNumber } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Copy,
  Eye,
  GitBranch,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react"

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

const STATUS_LABELS: Record<ScenarioStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
  draft: "Brouillon",
}

const STATUS_VARIANTS: Record<ScenarioStatus, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  draft: "warning",
}

export default function ScenariosPage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<ConversationScenario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteScenarioId, setDeleteScenarioId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ScenarioStatus>("all")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const loadScenarios = async () => {
    setIsLoading(true)
    try {
      const result = await scenariosService.listScenarios()
      setScenarios(result)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadScenarios()
  }, [])

  const filteredScenarios = useMemo(() => {
    const query = search.trim().toLowerCase()
    return scenarios.filter((scenario) => {
      const matchesStatus = statusFilter === "all" || scenario.status === statusFilter
      if (!matchesStatus) return false
      if (!query) return true
      return (
        scenario.name.toLowerCase().includes(query) ||
        scenario.description.toLowerCase().includes(query)
      )
    })
  }, [scenarios, search, statusFilter])

  const resetForm = () => {
    setName("")
    setDescription("")
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Le nom du scénario est requis")
      return
    }

    setIsSaving(true)
    try {
      const created = await scenariosService.createScenario({
        name,
        description,
        channel: "whatsapp",
      })
      setScenarios((prev) => [created, ...prev])
      setIsCreateOpen(false)
      resetForm()
      toast.success("Scénario créé")
      router.push(`/scenarios/${created.id}`)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteScenarioId) return
    try {
      await scenariosService.deleteScenario(deleteScenarioId)
      setScenarios((prev) => prev.filter((scenario) => scenario.id !== deleteScenarioId))
      toast.success("Scénario supprimé")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setDeleteScenarioId(null)
    }
  }

  const handleDuplicate = async (scenarioId: string) => {
    try {
      const duplicated = await scenariosService.duplicateScenario(scenarioId)
      setScenarios((prev) => [duplicated, ...prev])
      toast.success("Scénario dupliqué")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const handleToggleActive = async (scenario: ConversationScenario, active: boolean) => {
    try {
      const updated = await scenariosService.toggleScenarioActive(scenario.id, active)
      setScenarios((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      )
      toast.success(active ? "Scénario activé" : "Scénario désactivé")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between" style={stagger(0)}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Scénarios</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Workflows conversationnels WhatsApp
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-[13px] rounded-lg">
              <Plus className="h-3.5 w-3.5" />
              Nouveau
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Créer un scénario</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium">Nom *</label>
                <Input
                  className="h-9 text-[13px]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Qualification nouveaux leads"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Résumé court du parcours client"
                  className="min-h-[100px] text-[13px]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-[13px] rounded-lg"
                  onClick={() => { setIsCreateOpen(false); resetForm() }}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-9 text-[13px] rounded-lg"
                  onClick={handleCreate}
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center" style={stagger(1)}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="h-9 pl-9 text-[13px]"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as "all" | ScenarioStatus)}
        >
          <SelectTrigger className="h-9 w-full sm:w-[160px] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scenarios list */}
      {filteredScenarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={stagger(2)}>
          <GitBranch className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-[13px] font-medium">Aucun scénario trouvé</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Ajustez les filtres ou créez votre premier scénario.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredScenarios.map((scenario, i) => (
            <div
              key={scenario.id}
              className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors duration-200 hover:bg-accent/50"
              style={stagger(i + 2)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/scenarios/${scenario.id}`}
                    className="text-[13px] font-medium truncate hover:underline"
                  >
                    {scenario.name}
                  </Link>
                  <Badge variant={STATUS_VARIANTS[scenario.status]} className="text-[10px] shrink-0">
                    {STATUS_LABELS[scenario.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {scenario.description && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                      {scenario.description}
                    </span>
                  )}
                  {scenario.description && (
                    <span className="text-muted-foreground/40 text-[11px]">&middot;</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {formatNumber(scenario.stats.trigger_count)} déclenchements
                  </span>
                </div>
              </div>

              <span className="hidden lg:block text-[11px] text-muted-foreground shrink-0">
                {formatDate(scenario.updated_at)}
              </span>

              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={scenario.status === "active"}
                  onCheckedChange={(checked) => handleToggleActive(scenario, checked)}
                  aria-label="Activer/Désactiver"
                />
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleDuplicate(scenario.id)}
                  title="Dupliquer"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href={`/scenarios/${scenario.id}`} title="Ouvrir">
                    <Eye className="h-3 w-3" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                  onClick={() => setDeleteScenarioId(scenario.id)}
                  title="Supprimer"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteScenarioId}
        onOpenChange={(open) => { if (!open) setDeleteScenarioId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce scénario ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprimera le flow conversationnel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
