"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { whatsappService, handleApiError } from "@/services"
import { aiToolsService } from "@/services/ai-tools"
import { aiCreditsService } from "@/services/ai-credits"
import type { AICreditsBalance } from "@/services/ai-credits"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Database,
  FileText,
  GearSix,
  Lightning,
  MagnifyingGlass,
  Plus,
  Robot,
  Sparkle,
  Spinner,
  Trash,
  UploadSimple,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react"

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

interface VectorStoreFile {
  id: string
  file_id: string
  yanola_file_id?: string
  filename: string
}

interface VectorStore {
  id: string
  name: string
  files: VectorStoreFile[]
}

const resolveVectorStoreId = (store: { vector_store_id?: string; id?: string }) =>
  store.vector_store_id || store.id || ""

export default function AIToolsPage() {
  const { currentOrganization } = useOrganizationStore()

  // ── AI Credits state ──
  const [aiCredits, setAiCredits] = useState<AICreditsBalance | null>(null)

  // ── AI Agent state ──
  const [isLoading, setIsLoading] = useState(true)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiInstructions, setAiInstructions] = useState("")
  const [aiModel, setAiModel] = useState("gpt-4o")
  const [aiTimeline, setAiTimeline] = useState("3600")
  const [aiTools, setAiTools] = useState<string[]>([])
  const [aiVectorStoreIds, setAiVectorStoreIds] = useState("")
  const [aiSaving, setAiSaving] = useState(false)

  // ── Base de connaissance state ──
  const [vectorStores, setVectorStores] = useState<VectorStore[]>([])
  const [isCreatingVS, setIsCreatingVS] = useState(false)
  const [createVSDialogOpen, setCreateVSDialogOpen] = useState(false)
  const [newVSName, setNewVSName] = useState("")
  const [uploadDialogVSId, setUploadDialogVSId] = useState<string | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [deletingVSId, setDeletingVSId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load AI config + bases de connaissance ──
  useEffect(() => {
    loadAll()
  }, [currentOrganization?.id])

  const loadAll = async () => {
    if (!currentOrganization?.id) {
      setIsLoading(false)
      return
    }
    try {
      const [configResult, , creditsResult] = await Promise.allSettled([
        whatsappService.getConfig(currentOrganization.id),
        loadVectorStores(),
        aiCreditsService.getBalance(),
      ])
      if (creditsResult.status === "fulfilled") setAiCredits(creditsResult.value)
      if (configResult.status === "fulfilled") {
        const r = configResult.value as Record<string, unknown>
        if (typeof r.ai_enabled === "boolean") setAiEnabled(r.ai_enabled)
        if (typeof r.ai_instructions === "string") setAiInstructions(r.ai_instructions)
        if (typeof r.ai_model === "string") setAiModel(r.ai_model)
        if (typeof r.ai_timeline === "string") setAiTimeline(r.ai_timeline)
        if (typeof r.ai_tools === "string" && r.ai_tools) {
          setAiTools(r.ai_tools.split(",").map((t: string) => t.trim()).filter(Boolean))
        }
        if (typeof r.ai_vector_store_ids === "string") setAiVectorStoreIds(r.ai_vector_store_ids)
      }
    } catch {
      toast.error("Erreur de chargement de la configuration")
    } finally {
      setIsLoading(false)
    }
  }

  const loadVectorStores = async () => {
    try {
      const result = await aiToolsService.listVectorStores()
      const stores = result.vector_stores || []
      // Load files for each VS in parallel
      const storesWithFiles = await Promise.all(
        stores.map(async (vs): Promise<VectorStore | null> => {
          const vectorStoreId = resolveVectorStoreId(vs)
          if (!vectorStoreId) return null
          try {
            const filesResult = await aiToolsService.listFiles(vectorStoreId)
            return {
              id: vectorStoreId,
              name: vs.name || vectorStoreId,
              files: (filesResult.files || []).map((f): VectorStoreFile => ({
                id: f.id,
                file_id: f.file_id || f.id,
                yanola_file_id: f.yanola_file_id,
                filename: f.filename,
              })),
            }
          } catch {
            return {
              id: vectorStoreId,
              name: vs.name || vectorStoreId,
              files: [],
            }
          }
        })
      )
      setVectorStores(storesWithFiles.filter((store): store is VectorStore => store !== null))
    } catch {
      toast.error("Impossible de charger les bases de connaissance")
    }
  }

  // ── AI Handlers ──
  const handleSaveAi = async (overrideEnabled?: boolean) => {
    if (!currentOrganization?.id) return
    const enabled = overrideEnabled !== undefined ? overrideEnabled : aiEnabled
    setAiSaving(true)
    try {
      await whatsappService.setConfig(currentOrganization.id, {
        ai_enabled: enabled,
        ai_instructions: aiInstructions,
        ai_model: aiModel,
        ai_timeline: aiTimeline,
        ai_tools: aiTools.join(","),
        ai_vector_store_ids: aiVectorStoreIds,
      })
      toast.success(enabled ? "Assistance IA activée" : "Assistance IA désactivée")
      setAiDialogOpen(false)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setAiSaving(false)
    }
  }

  // ── Handlers base de connaissance ──
  const handleCreateVectorStore = async () => {
    const trimmedName = newVSName.trim()
    if (!trimmedName) {
      toast.error("Le nom de la base de connaissance est requis")
      return
    }
    setIsCreatingVS(true)
    try {
      const result = await aiToolsService.createVectorStore(trimmedName)
      const vsId = resolveVectorStoreId(result)
      if (!vsId) {
        toast.error("La base de connaissance a été créée sans identifiant exploitable")
        return
      }
      const newVS: VectorStore = {
        id: vsId,
        name: trimmedName,
        files: [],
      }
      setVectorStores((prev) => [...prev, newVS])
      toast.success("Base de connaissance créée")
      setCreateVSDialogOpen(false)
      setNewVSName("")
    } catch (error) {
      const apiError = handleApiError(error)
      const suffix = apiError.correlationId ? ` (ref: ${apiError.correlationId})` : ""
      if (apiError.status === 422) {
        toast.error("Nom requis ou invalide" + suffix)
      } else if (apiError.status === 503) {
        toast.error("Service IA temporairement indisponible, réessayez plus tard" + suffix)
      } else {
        toast.error(apiError.message + suffix)
      }
    } finally {
      setIsCreatingVS(false)
    }
  }

  const handleUploadFiles = async (vsId: string) => {
    if (!uploadFiles.length) {
      toast.error("Ajoutez au moins un fichier")
      return
    }
    setIsUploading(true)
    try {
      const result = await aiToolsService.uploadFiles(vsId, uploadFiles)

      if (result.files && result.files.length > 0) {
        setVectorStores((prev) =>
          prev.map((vs) =>
            vs.id === vsId
              ? {
                  ...vs,
                  files: [
                    ...vs.files,
                    ...result.files!.map((f) => ({
                      id: f.id,
                      file_id: f.file_id || f.id,
                      yanola_file_id: f.yanola_file_id,
                      filename: f.filename,
                    })),
                  ],
                }
              : vs
          )
        )
      }
      toast.success("Fichiers ajoutés avec succès")
      setUploadDialogVSId(null)
      setUploadFiles([])
    } catch (error) {
      if (error instanceof Error && error.message.includes("dépasse")) {
        toast.error(error.message)
      } else {
        const apiError = handleApiError(error)
        const suffix = apiError.correlationId ? ` (ref: ${apiError.correlationId})` : ""
        toast.error(apiError.message + suffix)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteFile = async (vsId: string, file: VectorStoreFile) => {
    const deleteId = file.yanola_file_id || file.file_id
    setDeletingFileId(file.file_id)
    try {
      await aiToolsService.deleteFileFromVectorStore(vsId, deleteId)
      setVectorStores((prev) =>
        prev.map((vs) =>
          vs.id === vsId
            ? { ...vs, files: vs.files.filter((f) => f.file_id !== file.file_id) }
            : vs
        )
      )
      toast.success("Fichier supprimé")
    } catch (error) {
      const apiError = handleApiError(error)
      const suffix = apiError.correlationId ? ` (ref: ${apiError.correlationId})` : ""
      toast.error(apiError.message + suffix)
    } finally {
      setDeletingFileId(null)
    }
  }

  const handleDeleteVectorStore = async (vsId: string) => {
    setDeletingVSId(vsId)
    try {
      await aiToolsService.deleteVectorStore(vsId)
      setVectorStores((prev) => prev.filter((vs) => vs.id !== vsId))
      toast.success("Base de connaissance supprimée")
    } catch (error) {
      const apiError = handleApiError(error)
      const suffix = apiError.correlationId ? ` (ref: ${apiError.correlationId})` : ""
      toast.error(apiError.message + suffix)
    } finally {
      setDeletingVSId(null)
    }
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-44" />
        </div>
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between" style={stagger(0)}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Outils IA</h1>
          <p className="mt-0.5 max-w-xl text-[13px] text-muted-foreground">
            Configurez l&apos;agent IA et gérez vos bases de connaissances
          </p>
        </div>
      </div>

      {/* ── AI Credits Banner ── */}
      {aiCredits && aiCredits.balance === 0 && (
        <div
          className="flex flex-col gap-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          style={stagger(1)}
        >
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 ring-1 ring-destructive/25">
              <WarningCircle className="h-[18px] w-[18px] text-destructive" weight="fill" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Crédits IA épuisés</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                L&apos;auto-reply IA est désactivée. Rechargez vos crédits pour continuer.
              </p>
            </div>
          </div>
          <Link href="/whatsapp/ai-credits" className="shrink-0">
            <Button
              size="sm"
              className="h-9 w-full rounded-xl text-[12px] font-semibold sm:w-auto"
            >
              Recharger
            </Button>
          </Link>
        </div>
      )}

      {aiCredits && aiCredits.balance > 0 && aiCredits.balance < 100 && (
        <div
          className="flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          style={stagger(1)}
        >
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/20">
              <WarningCircle className="h-[18px] w-[18px] text-amber-400" weight="fill" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Solde faible : {new Intl.NumberFormat("fr-FR").format(aiCredits.balance)} crédits
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Rechargez pour éviter une interruption de l&apos;auto-reply IA.
              </p>
            </div>
          </div>
          <Link href="/whatsapp/ai-credits" className="shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-full rounded-xl border-amber-500/35 text-[12px] text-amber-100 hover:bg-amber-500/10 sm:w-auto"
            >
              Recharger
            </Button>
          </Link>
        </div>
      )}

      {aiCredits && aiCredits.balance >= 100 && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-[12px] text-muted-foreground shadow-sm"
          style={stagger(1)}
        >
          <Sparkle className="h-3.5 w-3.5 shrink-0 text-primary" weight="fill" />
          <span>
            Solde IA :{" "}
            <span className="font-semibold text-foreground">
              {new Intl.NumberFormat("fr-FR").format(aiCredits.balance)}
            </span>{" "}
            crédits
          </span>
          <span className="hidden text-muted-foreground/40 sm:inline">|</span>
          <Link href="/whatsapp/ai-credits" className="font-medium text-primary transition-colors hover:text-primary/85 hover:underline">
            Gérer les crédits
          </Link>
        </div>
      )}

      {/* ── Section 1: Agent IA ── */}
      <div style={stagger(1)}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Agent IA
          </h2>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm transition-all duration-300 hover:border-border hover:bg-card/75">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors ${
                  aiEnabled
                    ? "bg-primary/15 text-primary ring-primary/25"
                    : "bg-muted text-muted-foreground ring-border/60"
                }`}
              >
                <Robot className="h-5 w-5" weight={aiEnabled ? "fill" : "regular"} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">Agent IA</p>
                <p className="text-[12px] text-muted-foreground">
                  {aiEnabled
                    ? "L'IA répond automatiquement aux messages entrants"
                    : "Activez pour répondre automatiquement via l'IA"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 sm:justify-start">
              {aiEnabled && (
                <button
                  type="button"
                  className="flex h-9 items-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-3.5 text-[12px] font-medium text-primary transition-all hover:border-primary/50 hover:bg-primary/15"
                  onClick={() => setAiDialogOpen(true)}
                >
                  <GearSix className="h-3.5 w-3.5" weight="bold" />
                  Configurer
                </button>
              )}
              <Switch
                checked={aiEnabled}
                onCheckedChange={(checked) => {
                  setAiEnabled(checked)
                  if (checked) setAiDialogOpen(true)
                  else handleSaveAi(false)
                }}
              />
            </div>
          </div>
          {aiEnabled && aiInstructions && (
            <div className="mt-4 rounded-xl border border-border/40 bg-muted/30 p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Lightning className="h-3.5 w-3.5 text-primary" weight="fill" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Instructions
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-3">
                {aiInstructions}
              </p>
            </div>
          )}
          {aiEnabled && (
            <div className="mt-3 flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground/60">
              <span>
                Modèle :{" "}
                <span className="font-medium text-muted-foreground">{aiModel}</span>
              </span>
              <span>
                Session :{" "}
                <span className="font-medium text-muted-foreground">{aiTimeline}s</span>
              </span>
              {aiTools.length > 0 && (
                <span>
                  Outils :{" "}
                  <span className="font-medium text-muted-foreground">
                    {aiTools.map((t) => t === "file_search" ? "Recherche de fichiers" : t).join(", ")}
                  </span>
                </span>
              )}
              {aiTools.includes("file_search") && aiVectorStoreIds && (
                <span>
                  Bases de connaissance :{" "}
                  <span className="font-medium text-muted-foreground font-mono">{aiVectorStoreIds}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Config Dialog ── */}
      {aiDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setAiDialogOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAiDialogOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-border/60 bg-card p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
                  <Robot className="h-5 w-5 text-primary" weight="fill" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-foreground">
                    Configurer l&apos;agent IA
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Personnalisez le comportement de l&apos;assistance automatique
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setAiDialogOpen(false)}
                aria-label="Fermer"
              >
                <XCircle className="h-5 w-5" weight="regular" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground/80">
                  Instructions de l&apos;agent
                </label>
                <p className="text-[11px] leading-relaxed text-muted-foreground/60">
                  Décrivez le rôle, le ton et les limites de l&apos;IA. Soyez précis pour
                  de meilleurs résultats.
                </p>
                <Textarea
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="Ex: Tu es un assistant commercial pour notre entreprise. Réponds de manière professionnelle et concise aux questions des clients sur nos produits et services. Ne donne jamais d'informations personnelles ou confidentielles..."
                  className="min-h-[140px] rounded-lg border-border text-[13px] leading-relaxed placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Tools */}
              <div className="space-y-3">
                <div>
                  <label className="text-[13px] font-medium text-foreground/80">
                    Outils de l&apos;agent
                  </label>
                  <p className="text-[11px] leading-relaxed text-muted-foreground/60 mt-0.5">
                    Activez les outils que l&apos;agent peut utiliser pour enrichir ses réponses.
                  </p>
                </div>

                <div className="space-y-2">
                  {/* file_search */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-border hover:bg-muted/40">
                    <Checkbox
                      checked={aiTools.includes("file_search")}
                      onCheckedChange={(checked) => {
                        setAiTools((prev) =>
                          checked
                            ? [...prev, "file_search"]
                            : prev.filter((t) => t !== "file_search")
                        )
                      }}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <MagnifyingGlass className="h-3.5 w-3.5 text-primary" weight="bold" />
                        <span className="text-[13px] font-medium text-foreground/90">Recherche de fichiers</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        Recherche dans les fichiers d&apos;une base de connaissance.
                      </p>
                    </div>
                  </label>

                  {/* vector_store_ids — visible when file_search enabled */}
                  {aiTools.includes("file_search") && (
                    <div className="ml-8 space-y-2">
                      <p className="text-[12px] text-muted-foreground">
                        Bases de connaissance associées
                      </p>
                      {vectorStores.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {vectorStores.map((vs, vsIdx) => {
                            const ids = aiVectorStoreIds.split(",").map((s) => s.trim()).filter(Boolean)
                            const isSelected = ids.includes(vs.id)
                            return (
                              <button
                                key={`${vs.id}-${vsIdx}`}
                                type="button"
                                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-medium transition-all ${
                                  isSelected
                                    ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                                    : "border-border/60 bg-card/50 text-muted-foreground hover:border-border hover:bg-muted/30"
                                }`}
                                onClick={() => {
                                  const currentIds = aiVectorStoreIds.split(",").map((s) => s.trim()).filter(Boolean)
                                  const newIds = isSelected
                                    ? currentIds.filter((id) => id !== vs.id)
                                    : [...currentIds, vs.id]
                                  setAiVectorStoreIds(newIds.join(","))
                                }}
                              >
                                <Database
                                  className={`h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                                  weight={isSelected ? "fill" : "regular"}
                                />
                                {vs.name}
                                {isSelected && (
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                                    ✓
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/60">
                          Aucune base de connaissance disponible.{" "}
                          <button
                            type="button"
                            className="text-primary underline-offset-2 hover:underline"
                            onClick={() => {
                              setAiDialogOpen(false)
                              setCreateVSDialogOpen(true)
                            }}
                          >
                            Créer une base
                          </button>
                        </p>
                      )}
                    </div>
                  )}

                </div>
              </div>

              <details className="group rounded-xl border border-border/60">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  Configuration avancée
                  <svg
                    className="h-4 w-4 text-muted-foreground/60 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="space-y-3 border-t border-border/50 p-4 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-muted-foreground">Modèle</Label>
                    <select
                      className="w-full h-9 rounded-lg border border-border bg-card px-3 text-[13px]"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                    >
                      <option value="gpt-5-mini">GPT-5 Mini</option>
                      <option value="o4-mini">o4 Mini</option>
                      <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-muted-foreground">
                      Durée session (sec)
                    </Label>
                    <Input
                      type="number"
                      value={aiTimeline}
                      onChange={(e) => setAiTimeline(e.target.value)}
                      placeholder="3600"
                      className="h-9 text-[12px]"
                    />
                    <p className="text-[11px] text-muted-foreground/60">
                      L&apos;IA garde le contexte de la conversation pendant cette durée.
                    </p>
                  </div>
                </div>
              </details>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl px-4 text-[13px]"
                  onClick={() => setAiDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="h-10 gap-2 rounded-xl px-6 text-[13px] font-semibold"
                  onClick={() => handleSaveAi()}
                  disabled={aiSaving}
                >
                  {aiSaving && <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 2: Bases de connaissance ── */}
      <div style={stagger(2)}>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Bases de connaissance
          </h2>
          <Button
            size="sm"
            className="h-9 gap-2 rounded-xl px-4 text-[13px] font-semibold shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
            onClick={() => setCreateVSDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" weight="bold" />
            Créer une base de connaissance
          </Button>
        </div>

        {vectorStores.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border/60 bg-card/40 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-14">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 ring-1 ring-border/50">
                <Database className="h-6 w-6 text-muted-foreground" weight="duotone" />
              </div>
              <p className="text-[13px] font-medium text-foreground">Aucune base de connaissance créée</p>
              <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground">
                Créez une base de connaissance pour stocker vos documents et enrichir les réponses de l&apos;IA.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {vectorStores.map((vs, i) => (
              <div
                key={`${vs.id}-${i}`}
                className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm transition-all duration-300 hover:border-border hover:bg-card/70"
                style={stagger(i + 3)}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
                      <Database className="h-4 w-4 text-primary" weight="fill" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{vs.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {vs.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-xl border-border/60 text-[11px] transition-colors hover:border-primary/30 hover:bg-primary/5"
                      onClick={() => {
                        setUploadDialogVSId(vs.id)
                        setUploadFiles([])
                      }}
                    >
                      <UploadSimple className="h-3 w-3" weight="bold" />
                      Ajouter des documents
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          disabled={deletingVSId === vs.id}
                        >
                          {deletingVSId === vs.id ? (
                            <Spinner className="h-3 w-3 animate-spin" weight="bold" />
                          ) : (
                            <Trash className="h-3 w-3" weight="bold" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Supprimer cette base de connaissance ?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            La base de connaissance &quot;{vs.name}&quot; et tous ses fichiers
                            seront définitivement supprimés.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteVectorStore(vs.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Files list */}
                {vs.files.length > 0 ? (
                  <div className="space-y-1 mt-2">
                    {vs.files.map((file, fileIdx) => (
                      <div
                        key={`${file.file_id}-${fileIdx}`}
                        className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" weight="regular" />
                          <span className="text-[12px] truncate">
                            {file.filename}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {file.file_id}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          disabled={deletingFileId === file.file_id}
                          onClick={() =>
                            handleDeleteFile(vs.id, file)
                          }
                        >
                          {deletingFileId === file.file_id ? (
                            <Spinner className="h-3 w-3 animate-spin" weight="bold" />
                          ) : (
                            <Trash className="h-3 w-3" weight="bold" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/60 mt-2">
                    Aucun fichier. Ajoutez des documents pour enrichir cette base de connaissance.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Knowledge Base Dialog ── */}
      {createVSDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setCreateVSDialogOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setCreateVSDialogOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
                <Database className="h-4 w-4 text-primary" weight="fill" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">
                  Créer une base de connaissance
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Donnez un nom à votre base de connaissances
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Nom</Label>
                <Input
                  className="h-9 text-[13px]"
                  value={newVSName}
                  onChange={(e) => setNewVSName(e.target.value)}
                  placeholder="Ex: Documentation produit"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-xl px-4 text-[13px]"
                  onClick={() => setCreateVSDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="h-9 gap-2 rounded-xl px-5 text-[13px] font-semibold"
                  onClick={handleCreateVectorStore}
                  disabled={isCreatingVS || !newVSName.trim()}
                >
                  {isCreatingVS && (
                    <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" />
                  )}
                  Créer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Files Dialog ── */}
      {uploadDialogVSId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setUploadDialogVSId(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setUploadDialogVSId(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
                <UploadSimple className="h-4 w-4 text-primary" weight="fill" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">
                  Ajouter des documents
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Uploadez des fichiers depuis votre appareil
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {/* File upload */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-[13px]">
                  <FileText className="h-3.5 w-3.5" weight="regular" />
                  Fichiers
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setUploadFiles(Array.from(e.target.files))
                    }
                  }}
                />
                <div
                  className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border/70 p-4 transition-all hover:border-primary/35 hover:bg-muted/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadFiles.length > 0 ? (
                    <div className="text-center">
                      <p className="text-[13px] font-medium text-foreground/90">
                        Fichiers sélectionnés
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {uploadFiles.map((f) => f.name).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <UploadSimple className="mx-auto mb-1 h-5 w-5 text-muted-foreground" weight="duotone" />
                      <p className="text-[12px] text-muted-foreground">
                        Cliquez pour sélectionner des fichiers
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  className="h-9 rounded-xl px-4 text-[13px]"
                  onClick={() => setUploadDialogVSId(null)}
                >
                  Annuler
                </Button>
                <Button
                  className="h-9 gap-2 rounded-xl px-5 text-[13px] font-semibold"
                  onClick={() => handleUploadFiles(uploadDialogVSId)}
                  disabled={isUploading}
                >
                  {isUploading && (
                    <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" />
                  )}
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
