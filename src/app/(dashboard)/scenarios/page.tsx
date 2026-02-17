"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { scenariosService, handleApiError } from "@/services"
import type { ConversationScenario, ScenarioStatus } from "@/types"
import { formatDate, formatNumber } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Copy,
  Eye,
  Filter,
  GitBranch,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react"

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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")

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

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Scenarios</h1>
        <p className="mt-1 text-muted-foreground">
          Crée, édite et exécute des workflows conversationnels WhatsApp.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setViewMode((prev) => (prev === "table" ? "cards" : "table"))}
        >
          {viewMode === "table" ? <LayoutGrid className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
          {viewMode === "table" ? "Vue cartes" : "Vue tableau"}
        </Button>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau scénario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un scénario</DialogTitle>
              <DialogDescription>
                Initialise un nouveau flow conversationnel WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom</label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex: Qualification nouveaux leads"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Résumé court du parcours client"
                  className="min-h-[110px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false)
                  resetForm()
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {header}

      <Card>
        <CardHeader>
          <CardTitle>Scénarios conversationnels</CardTitle>
          <CardDescription>
            Filtre, active et ouvre tes scénarios pour édition visuelle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un scénario"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 sm:w-[240px]">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | ScenarioStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                  <SelectItem value="draft">Brouillons</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement des scénarios...
            </div>
          ) : filteredScenarios.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <GitBranch className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
              <p className="text-base font-medium">Aucun scénario trouvé</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajuste les filtres ou crée ton premier flow.
              </p>
            </div>
          ) : viewMode === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Mis à jour</TableHead>
                  <TableHead className="text-right">Déclenchements</TableHead>
                  <TableHead className="text-right">Actif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScenarios.map((scenario) => (
                  <TableRow key={scenario.id}>
                    <TableCell className="font-medium">{scenario.name}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {scenario.description || "Sans description"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[scenario.status]}>{STATUS_LABELS[scenario.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">WhatsApp</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(scenario.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(scenario.updated_at)}</TableCell>
                    <TableCell className="text-right">{formatNumber(scenario.stats.trigger_count)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Switch
                          checked={scenario.status === "active"}
                          onCheckedChange={(checked) => handleToggleActive(scenario, checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(scenario.id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/scenarios/${scenario.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteScenarioId(scenario.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredScenarios.map((scenario) => (
                <Card key={scenario.id} className="border-border/40">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-1 text-base">{scenario.name}</CardTitle>
                      <Badge variant={STATUS_VARIANTS[scenario.status]}>{STATUS_LABELS[scenario.status]}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {scenario.description || "Sans description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p>Canal: WhatsApp</p>
                      <p>Déclenchements: {formatNumber(scenario.stats.trigger_count)}</p>
                      <p>Créé: {formatDate(scenario.created_at)}</p>
                      <p>MAJ: {formatDate(scenario.updated_at)}</p>
                    </div>
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="text-sm">Activer</span>
                      <Switch
                        checked={scenario.status === "active"}
                        onCheckedChange={(checked) => handleToggleActive(scenario, checked)}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDuplicate(scenario.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Dupliquer
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/scenarios/${scenario.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ouvrir
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteScenarioId(scenario.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteScenarioId}
        onOpenChange={(open) => {
          if (!open) setDeleteScenarioId(null)
        }}
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
