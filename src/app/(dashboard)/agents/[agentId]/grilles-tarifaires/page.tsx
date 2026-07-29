"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLineRight,
  ArrowRight,
  Calculator,
  FileCsv,
  Function as FunctionIcon,
  MagnifyingGlass,
  PencilSimple,
  Spinner,
  Trash,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { agentsService, handleApiError, tariffGridsService } from "@/services"
import type { Agent } from "@/services/agents"
import type { TariffGrid } from "@/types/tariff-grids"
import { formatFileSize } from "@/lib/tariff-csv"
import { Skeleton } from "@/components/ui/skeleton"
import { AGENT_CATALOG } from "../../_catalog"

export default function GrillesTarifairesPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params)
  const router = useRouter()
  const presentation = AGENT_CATALOG.find((a) => a.id === agentId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [grids, setGrids] = useState<TariffGrid[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [newGridName, setNewGridName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemovingFile, setIsRemovingFile] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      try {
        const resolvedAgent = await agentsService.getAgentByIdOrSlug(agentId)
        if (!active) return
        setAgent(resolvedAgent)
        const { grids: loaded } = await tariffGridsService.listGrids(agentId)
        if (!active) return
        setGrids(loaded)
        const connected = loaded.find((g) => g.agent_id === agentId || g.agent_id === resolvedAgent.id)
        setSelectedId(connected?.id || loaded[0]?.id || null)
      } catch {
        toast.error("Erreur de chargement")
        router.replace("/agents")
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [agentId, router])

  const selected = grids.find((g) => g.id === selectedId)
  const connectedId = grids.find((g) => g.agent_id === agent?.id || g.agent_id === agentId)?.id
  const isConnected = selected?.id === connectedId
  const filtered = search.trim()
    ? grids.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : grids

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    } catch {
      return iso
    }
  }

  const handleCreate = async () => {
    const name = newGridName.trim()
    if (!name) return
    setIsCreating(true)
    try {
      const grid = await tariffGridsService.createGrid({ name, agent_id: agent?.id })
      setGrids((prev) => [...prev, grid])
      setSelectedId(grid.id)
      setNewGridName("")
      toast.success("Grille créée")
      router.push(`/agents/${agentId}/grilles-tarifaires/nouvelle?gridId=${grid.id}`)
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleConnect = async () => {
    if (!selected || !agent) return
    setIsConnecting(true)
    try {
      const updated = await tariffGridsService.connectGrid(selected.id, agent.id)
      setGrids((prev) =>
        prev.map((g) => {
          if (g.id === updated.id) return updated
          if (g.agent_id === agent.id) return { ...g, agent_id: null, status: g.csv_path ? "ready" : "no_file" }
          return g
        })
      )
      toast.success("Grille connectée à l'agent")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!selected) return
    setIsConnecting(true)
    try {
      const updated = await tariffGridsService.disconnectGrid(selected.id)
      setGrids((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
      toast.success("Grille déconnectée")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsDeleting(true)
    try {
      await tariffGridsService.deleteGrid(selected.id)
      const remaining = grids.filter((g) => g.id !== selected.id)
      setGrids(remaining)
      setSelectedId(remaining[0]?.id ?? null)
      toast.success("Grille supprimée")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpload = async (file: File) => {
    if (!selected) return
    setIsUploading(true)
    try {
      const updated = await tariffGridsService.importCsv(selected.id, {
        file,
        name: selected.name,
        agent_slug: agentId,
      })
      setGrids((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
      toast.success("Fichier importé")
      router.push(`/agents/${agentId}/grilles-tarifaires/${selected.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : handleApiError(error).message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = async () => {
    if (!selected) return
    setIsRemovingFile(true)
    try {
      const updated = await tariffGridsService.updateGrid(selected.id, {
        csv_path: "",
        csv_file_name: null,
        csv_size: null,
        csv_row_count: null,
        csv_column_count: null,
        headers: [],
        status: "no_file",
      })
      setGrids((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
      toast.success("Fichier supprimé")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsRemovingFile(false)
    }
  }

  if (!agent && !isLoading) return null

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link href="/agents" className="transition-colors hover:text-foreground">Agents IA</Link>
        <span>/</span>
        <Link href={`/agents/${agentId}`} className="transition-colors hover:text-foreground">
          {agent?.name || presentation?.label || agentId}
        </Link>
        <span>/</span>
        <span className="text-foreground">Grilles tarifaires</span>
      </nav>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Calcul de devis
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Grilles tarifaires</h1>
          {grids.length > 0 && (
            <span className="text-[13px] text-muted-foreground">
              {connectedId ? "1 active" : "0 active"} · {grids.length} grille{grids.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
          <div className="space-y-4">
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" weight="regular" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une grille…"
                className="h-9 w-full rounded-xl border border-border/50 bg-card/50 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground/35 focus:border-primary/40 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              {filtered.map((grid) => (
                <button
                  key={grid.id}
                  type="button"
                  onClick={() => setSelectedId(grid.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selectedId === grid.id
                      ? "border-primary bg-card/60"
                      : "border-border/40 bg-card/40 hover:bg-card/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] font-medium text-foreground">{grid.name}</p>
                    {grid.id === connectedId ? (
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Actif
                      </span>
                    ) : (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/50">
                    {formatDate(grid.created_at)} · {grid.csv_file_name ? "1 fichier" : "Aucun fichier"}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-2 border-t border-border/40 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                Nouvelle grille
              </p>
              <input
                type="text"
                value={newGridName}
                onChange={(e) => setNewGridName(e.target.value)}
                placeholder="Nom de la grille"
                className="h-9 w-full rounded-xl border border-border/50 bg-card/50 px-3 text-[12px] text-foreground placeholder:text-muted-foreground/35 focus:border-primary/40 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && newGridName.trim()) handleCreate() }}
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !newGridName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isCreating && <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" />}
                Créer
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            {!selected ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
                <Calculator className="h-10 w-10 text-muted-foreground/30" weight="duotone" />
                <p className="text-[13px] font-medium text-muted-foreground">
                  {grids.length === 0 ? "Aucune grille tarifaire" : "Sélectionnez une grille"}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-[15px] font-semibold text-foreground">{selected.name}</p>
                    {isConnected && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground">
                        Utilisée par l&apos;agent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isConnected ? (
                      <button
                        type="button"
                        onClick={handleConnect}
                        disabled={isConnecting || !selected.csv_path}
                        className="rounded-xl border border-primary/35 bg-primary/10 px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                      >
                        Connecter
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={isConnecting}
                        className="rounded-xl border border-border/50 bg-card/50 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-50"
                      >
                        Déconnecter
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                    >
                      {isDeleting ? <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" /> : "Supprimer"}
                    </button>
                  </div>
                </div>

                <p className="text-[12px] text-muted-foreground">
                  {selected.csv_file_name ? `1 fichier · ${selected.csv_file_name}` : "Aucun fichier importé"}
                </p>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Fichier tarifaire</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        Ajoutez une grille CSV pour définir les données de calcul.
                      </p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(file)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (selected.csv_path) {
                            router.push(`/agents/${agentId}/grilles-tarifaires/nouvelle?gridId=${selected.id}`)
                          } else {
                            fileInputRef.current?.click()
                          }
                        }}
                        disabled={isUploading}
                        className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:border-border disabled:opacity-50"
                      >
                        {isUploading && <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" />}
                        Ajouter
                      </button>
                    </div>
                  </div>

                  {selected.csv_file_name ? (
                    <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-500/90">
                          <FileCsv className="h-5 w-5 text-white" weight="fill" />
                        </span>
                        <div>
                          <p className="text-[12px] font-medium text-foreground">{selected.csv_file_name}</p>
                          <p className="text-[11px] text-muted-foreground/60">
                            {selected.csv_size ? formatFileSize(selected.csv_size) : "—"}
                            {selected.csv_row_count != null ? ` · ${selected.csv_row_count.toLocaleString("fr-FR")} lignes` : ""}
                            {selected.csv_column_count != null ? ` · ${selected.csv_column_count} colonnes` : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        disabled={isRemovingFile}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                        aria-label="Supprimer le fichier"
                      >
                        {isRemovingFile ? <Spinner className="h-4 w-4 animate-spin" weight="bold" /> : <Trash className="h-4 w-4" weight="regular" />}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/40 bg-muted/10 py-10">
                      <FileCsv className="h-10 w-10 text-muted-foreground/30" weight="duotone" />
                      <p className="text-[12px] text-muted-foreground">Aucun fichier CSV</p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-foreground">Configuration du calcul</p>
                    {selected.csv_path && (
                      <Link
                        href={`/agents/${agentId}/grilles-tarifaires/${selected.id}`}
                        className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <PencilSimple className="h-3.5 w-3.5" weight="regular" />
                        Configurer
                      </Link>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 text-[12px]">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" weight="bold" />
                      <span className="text-foreground">
                        {Object.keys(selected.input_mapping).length} champ{Object.keys(selected.input_mapping).length !== 1 ? "s" : ""} d&apos;entrée
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[12px]">
                      <ArrowLineRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" weight="bold" />
                      <span className="text-foreground">
                        {selected.output_columns.length} colonne{selected.output_columns.length !== 1 ? "s" : ""} de sortie
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[12px]">
                      <FunctionIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" weight="bold" />
                      {selected.formula ? (
                        <code className="truncate rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-foreground">
                          {selected.formula}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
