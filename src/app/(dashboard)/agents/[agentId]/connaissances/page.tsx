"use client"

import { use, useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { aiToolsService } from "@/services/ai-tools"
import { agentsService, handleApiError } from "@/services"
import type { Agent } from "@/services/agents"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  FileText,
  MagnifyingGlass,
  Plus,
  Spinner,
  Trash,
  UploadSimple,
  XCircle,
} from "@phosphor-icons/react"
import { AGENT_CATALOG } from "../../_catalog"

interface VSFile {
  id: string
  file_id: string
  yanola_file_id?: string
  filename: string
}

interface VectorStore {
  id: string
  name: string
  createdAt: string
  files: VSFile[]
}

export default function ConnaissancesPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params)
  const router = useRouter()
  const presentation = AGENT_CATALOG.find((a) => a.id === agentId)

  const [isLoading, setIsLoading] = useState(true)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [stores, setStores] = useState<VectorStore[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [connectedVsId, setConnectedVsId] = useState("")
  const [searchStore, setSearchStore] = useState("")
  const [newBaseName, setNewBaseName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDeletingVs, setIsDeletingVs] = useState(false)
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      try {
        const resolvedAgent = await agentsService.getAgentByIdOrSlug(agentId)
        if (!active) return
        setAgent(resolvedAgent)
        setConnectedVsId(resolvedAgent.ai_vector_store_ids[0] || "")

        const [vsResult] = await Promise.allSettled([
          aiToolsService.listVectorStores(),
        ])
        if (!active) return
        if (vsResult.status === "fulfilled") {
          const raw = vsResult.value.vector_stores || []
          const withFiles = await Promise.all(
            raw.map(async (vs) => {
              const vsId = (vs.vector_store_id || vs.id || "") as string
              if (!vsId) return null
              try {
                const filesResult = await aiToolsService.listFiles(vsId)
                return {
                  id: vsId,
                  name: (vs.name || vsId) as string,
                  createdAt: (vs.created_at || "") as string,
                  files: (filesResult.files || []).map((f) => ({
                    id: f.id,
                    file_id: f.file_id || f.id,
                    yanola_file_id: f.yanola_file_id,
                    filename: f.filename,
                  })),
                }
              } catch {
                return { id: vsId, name: (vs.name || vsId) as string, createdAt: (vs.created_at || "") as string, files: [] }
              }
            })
          )
          const valid = withFiles.filter((s): s is NonNullable<typeof s> => s !== null) as VectorStore[]
          setStores(valid)
          if (valid.length > 0 && !selectedId) setSelectedId(valid[0].id)
        }
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

  const selected = stores.find((s) => s.id === selectedId)
  const isConnected = selectedId === connectedVsId

  const filteredStores = searchStore.trim()
    ? stores.filter((s) => s.name.toLowerCase().includes(searchStore.toLowerCase()))
    : stores

  const handleCreate = async () => {
    const name = newBaseName.trim()
    if (!name) return
    setIsCreating(true)
    try {
      const result = await aiToolsService.createVectorStore(name)
      const vsId = (result.vector_store_id || result.id || "") as string
      if (!vsId) { toast.error("Base créée sans identifiant"); return }
      const newStore: VectorStore = { id: vsId, name, createdAt: new Date().toISOString(), files: [] }
      setStores((prev) => [...prev, newStore])
      setSelectedId(vsId)
      setNewBaseName("")
      toast.success("Base créée")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleConnect = async () => {
    if (!agent || !selectedId) return
    try {
      const nextVectorStoreIds = [selectedId]
      const updatedAgent = await agentsService.updateAgent(agent.id, {
        ai_vector_store_ids: nextVectorStoreIds,
      })
      setAgent(updatedAgent)
      setConnectedVsId(selectedId)
      toast.success("Base connectée à l'agent")
    } catch (error) {
      toast.error(handleApiError(error).message)
    }
  }

  const handleDisconnect = async () => {
    if (!agent) return
    try {
      const updatedAgent = await agentsService.updateAgent(agent.id, { ai_vector_store_ids: [] })
      setAgent(updatedAgent)
      setConnectedVsId("")
      toast.success("Base déconnectée")
    } catch (error) {
      toast.error(handleApiError(error).message)
    }
  }

  const handleDeleteVs = async () => {
    if (!selectedId) return
    setIsDeletingVs(true)
    try {
      await aiToolsService.deleteVectorStore(selectedId)
      setStores((prev) => prev.filter((s) => s.id !== selectedId))
      if (connectedVsId === selectedId) setConnectedVsId("")
      setSelectedId(stores.find((s) => s.id !== selectedId)?.id ?? null)
      toast.success("Base supprimée")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsDeletingVs(false)
    }
  }

  const handleUpload = async (files: File[]) => {
    if (!selectedId || !files.length) return
    setIsUploading(true)
    try {
      const result = await aiToolsService.uploadFiles(selectedId, files)
      if (result.files?.length) {
        setStores((prev) =>
          prev.map((s) =>
            s.id === selectedId
              ? {
                  ...s,
                  files: [
                    ...s.files,
                    ...result.files!.map((f) => ({
                      id: f.id,
                      file_id: f.file_id || f.id,
                      yanola_file_id: f.yanola_file_id,
                      filename: f.filename,
                    })),
                  ],
                }
              : s
          )
        )
      }
      toast.success("Fichiers ajoutés")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteFile = async (file: VSFile) => {
    if (!selectedId) return
    setIsDeletingFile(file.file_id)
    try {
      await aiToolsService.deleteFileFromVectorStore(selectedId, file.yanola_file_id || file.file_id)
      setStores((prev) =>
        prev.map((s) =>
          s.id === selectedId ? { ...s, files: s.files.filter((f) => f.file_id !== file.file_id) } : s
        )
      )
      toast.success("Fichier supprimé")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsDeletingFile(null)
    }
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    } catch { return iso }
  }

  if (!agent && !isLoading) return null

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link href="/agents" className="transition-colors hover:text-foreground">Agents IA</Link>
        <span>/</span>
        <Link href={`/agents/${agentId}`} className="transition-colors hover:text-foreground">{agent?.name || presentation?.label || agentId}</Link>
        <span>/</span>
        <span className="text-foreground">Connaissances</span>
      </nav>

      {/* Header */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Base documentaire
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Connaissances</h1>
          {stores.length > 0 && (
            <span className="text-[13px] text-muted-foreground">
              {stores.filter((s) => s.id === connectedVsId).length} active · {stores.length} base{stores.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
          {/* Left panel */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" weight="regular" />
              <input
                type="text"
                value={searchStore}
                onChange={(e) => setSearchStore(e.target.value)}
                placeholder="Rechercher une base…"
                className="h-9 w-full rounded-xl border border-border/50 bg-card/50 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground/35 focus:border-primary/40 focus:outline-none"
              />
            </div>

            {/* Stores list */}
            <div className="space-y-1">
              {filteredStores.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selectedId === s.id
                      ? "border-primary/30 bg-primary/10"
                      : "border-border/40 bg-card/40 hover:bg-card/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] font-medium text-foreground">{s.name}</p>
                    {s.id === connectedVsId && (
                      <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Actif
                      </span>
                    )}
                  </div>
                  {s.createdAt && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground/50">{formatDate(s.createdAt)}</p>
                  )}
                </button>
              ))}
              {filteredStores.length === 0 && stores.length > 0 && (
                <p className="py-4 text-center text-[12px] text-muted-foreground">Aucun résultat</p>
              )}
            </div>

            {/* Create new base */}
            <div className="border-t border-border/40 pt-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                Nouvelle base
              </p>
              <input
                type="text"
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                placeholder="Nom de la base"
                className="h-9 w-full rounded-xl border border-border/50 bg-card/50 px-3 text-[12px] text-foreground placeholder:text-muted-foreground/35 focus:border-primary/40 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && newBaseName.trim()) handleCreate() }}
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !newBaseName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isCreating ? <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" /> : <Plus className="h-3.5 w-3.5" weight="bold" />}
                Créer
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            {!selected ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3">
                <span className="text-4xl opacity-40">📚</span>
                <p className="text-[13px] font-medium text-muted-foreground">
                  {stores.length === 0 ? "Aucune base de connaissance" : "Sélectionnez une base"}
                </p>
                {stores.length === 0 && (
                  <p className="text-[12px] text-muted-foreground/60 text-center max-w-xs">
                    Créez une base pour stocker vos documents et enrichir les réponses de l&apos;agent.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Selected base header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-[15px] font-semibold text-foreground">{selected.name}</p>
                    {isConnected && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                        Utilisé par l&apos;agent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isConnected ? (
                      <button
                        type="button"
                        onClick={handleConnect}
                        className="rounded-xl border border-primary/35 bg-primary/10 px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        Connecter
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="rounded-xl border border-border/50 bg-card/50 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                      >
                        Déconnecter
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDeleteVs}
                      disabled={isDeletingVs}
                      className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                    >
                      {isDeletingVs ? <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" /> : "Supprimer"}
                    </button>
                  </div>
                </div>

                <p className="text-[12px] text-muted-foreground">
                  {selected.files.length} fichier{selected.files.length !== 1 ? "s" : ""} —{" "}
                  <span className="font-mono text-[11px] text-muted-foreground/50">{selected.id}</span>
                </p>

                {/* Files section */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Fichiers</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        PDF, catalogues, FAQ — vos agents IA liront ces documents pour mieux répondre.
                      </p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) handleUpload(Array.from(e.target.files))
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-50"
                      >
                        {isUploading ? <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" /> : <UploadSimple className="h-3.5 w-3.5" weight="bold" />}
                        Ajouter
                      </button>
                    </div>
                  </div>

                  {selected.files.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/40 bg-muted/10 py-12">
                      <FileText className="h-10 w-10 text-muted-foreground/30" weight="duotone" />
                      <div className="text-center">
                        <p className="text-[13px] font-medium text-muted-foreground">Aucun fichier</p>
                        <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted-foreground/60">
                          Ajoutez des PDF, catalogues ou FAQ pour que vos agents IA répondent avec précision.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {selected.files.map((file, i) => (
                        <div
                          key={`${file.file_id}-${i}`}
                          className="group flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground/50" weight="regular" />
                            <span className="truncate text-[12px] text-foreground/80">{file.filename}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file)}
                            disabled={isDeletingFile === file.file_id}
                            className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            {isDeletingFile === file.file_id ? (
                              <Spinner className="h-2.5 w-2.5 animate-spin" weight="bold" />
                            ) : (
                              <Trash className="h-2.5 w-2.5" weight="bold" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
