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
  Loader2,
  Bot,
  Zap,
  Settings,
  XCircle,
  Plus,
  Upload,
  Trash2,
  Database,
  FileText,
  Search,
  Globe,
  AlertTriangle,
  Sparkles,
} from "lucide-react"

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
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div style={stagger(0)}>
        <h1 className="text-xl font-semibold tracking-tight">Outils IA</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Configurez l&apos;agent IA et gérez vos bases de connaissances
        </p>
      </div>

      {/* ── AI Credits Banner ── */}
      {aiCredits && aiCredits.balance === 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 flex items-center justify-between" style={stagger(1)}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-red-800">Crédits IA épuisés</p>
              <p className="text-[11px] text-red-600">
                L&apos;auto-reply IA est désactivée. Rechargez vos crédits pour continuer.
              </p>
            </div>
          </div>
          <Link href="/whatsapp/ai-credits">
            <Button size="sm" className="h-8 text-[12px] rounded-lg bg-red-600 hover:bg-red-700">
              Recharger
            </Button>
          </Link>
        </div>
      )}

      {aiCredits && aiCredits.balance > 0 && aiCredits.balance < 100 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex items-center justify-between" style={stagger(1)}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-amber-800">Solde faible : {new Intl.NumberFormat("fr-FR").format(aiCredits.balance)} crédits</p>
              <p className="text-[11px] text-amber-600">
                Rechargez pour éviter une interruption de l&apos;auto-reply IA.
              </p>
            </div>
          </div>
          <Link href="/whatsapp/ai-credits">
            <Button size="sm" variant="outline" className="h-8 text-[12px] rounded-lg border-amber-300 text-amber-700 hover:bg-amber-100">
              Recharger
            </Button>
          </Link>
        </div>
      )}

      {aiCredits && aiCredits.balance >= 100 && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground" style={stagger(1)}>
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          <span>
            Solde IA : <span className="font-semibold text-foreground">{new Intl.NumberFormat("fr-FR").format(aiCredits.balance)}</span> crédits
          </span>
          <span className="text-muted-foreground/40">|</span>
          <Link href="/whatsapp/ai-credits" className="text-primary hover:underline">
            Gérer les crédits
          </Link>
        </div>
      )}

      {/* ── Section 1: Agent IA ── */}
      <div style={stagger(1)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Agent IA
          </h2>
        </div>
        <div className="rounded-xl border border-border/40 bg-gradient-to-r from-blue-50/50 to-sky-50/50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  aiEnabled ? "bg-blue-100" : "bg-gray-100"
                }`}
              >
                <Bot
                  className={`h-5 w-5 ${aiEnabled ? "text-blue-600" : "text-gray-400"}`}
                />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-900">Agent IA</p>
                <p className="text-[12px] text-gray-500">
                  {aiEnabled
                    ? "L'IA répond automatiquement aux messages entrants"
                    : "Activez pour répondre automatiquement via l'IA"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {aiEnabled && (
                <button
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-[12px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  onClick={() => setAiDialogOpen(true)}
                >
                  <Settings className="h-3.5 w-3.5" />
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
            <div className="mt-4 rounded-lg bg-white/80 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="h-3 w-3 text-blue-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Instructions
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-gray-600 line-clamp-3">
                {aiInstructions}
              </p>
            </div>
          )}
          {aiEnabled && (
            <div className="mt-3 flex items-center gap-4 flex-wrap text-[11px] text-gray-400">
              <span>
                Modèle :{" "}
                <span className="font-medium text-gray-600">{aiModel}</span>
              </span>
              <span>
                Session :{" "}
                <span className="font-medium text-gray-600">{aiTimeline}s</span>
              </span>
              {aiTools.length > 0 && (
                <span>
                  Outils :{" "}
                  <span className="font-medium text-gray-600">
                    {aiTools.map((t) => t === "file_search" ? "Recherche fichiers" : t === "web_search" ? "Recherche web" : t).join(", ")}
                  </span>
                </span>
              )}
              {aiTools.includes("file_search") && aiVectorStoreIds && (
                <span>
                  Bases de connaissance :{" "}
                  <span className="font-medium text-gray-600 font-mono">{aiVectorStoreIds}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Config Dialog ── */}
      {aiDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          onClick={() => setAiDialogOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAiDialogOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                  <Bot className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900">
                    Configurer l&apos;agent IA
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Personnalisez le comportement de l&apos;assistance automatique
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setAiDialogOpen(false)}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-gray-700">
                  Instructions de l&apos;agent
                </label>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  Décrivez le rôle, le ton et les limites de l&apos;IA. Soyez précis pour
                  de meilleurs résultats.
                </p>
                <Textarea
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="Ex: Tu es un assistant commercial pour notre entreprise. Réponds de manière professionnelle et concise aux questions des clients sur nos produits et services. Ne donne jamais d'informations personnelles ou confidentielles..."
                  className="min-h-[140px] rounded-lg border-gray-200 text-[13px] leading-relaxed placeholder:text-gray-400"
                />
              </div>

              {/* Tools */}
              <div className="space-y-3">
                <div>
                  <label className="text-[13px] font-medium text-gray-700">
                    Outils de l&apos;agent
                  </label>
                  <p className="text-[11px] leading-relaxed text-gray-400 mt-0.5">
                    Activez les outils que l&apos;agent peut utiliser pour enrichir ses réponses.
                  </p>
                </div>

                <div className="space-y-2">
                  {/* file_search */}
                  <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-[13px] font-medium text-gray-700">file_search</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Recherche dans les fichiers d&apos;une base de connaissance.
                      </p>
                    </div>
                  </label>

                  {/* vector_store_ids — visible when file_search enabled */}
                  {aiTools.includes("file_search") && (
                    <div className="ml-8 space-y-1.5">
                      <Label className="text-[12px] text-gray-500">
                        IDs des bases de connaissance (séparés par des virgules)
                      </Label>
                      {vectorStores.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {vectorStores.map((vs, vsIdx) => {
                              const ids = aiVectorStoreIds.split(",").map((s) => s.trim()).filter(Boolean)
                              const isSelected = ids.includes(vs.id)
                              return (
                                <button
                                  key={`${vs.id}-${vsIdx}`}
                                  type="button"
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                                    isSelected
                                      ? "border-blue-300 bg-blue-50 text-blue-700"
                                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                  }`}
                                  onClick={() => {
                                    const currentIds = aiVectorStoreIds.split(",").map((s) => s.trim()).filter(Boolean)
                                    const newIds = isSelected
                                      ? currentIds.filter((id) => id !== vs.id)
                                      : [...currentIds, vs.id]
                                    setAiVectorStoreIds(newIds.join(","))
                                  }}
                                >
                                  <Database className="h-3 w-3" />
                                  {vs.name}
                                </button>
                              )
                            })}
                          </div>
                          <Input
                            value={aiVectorStoreIds}
                            onChange={(e) => setAiVectorStoreIds(e.target.value)}
                            placeholder="vs_abc123,vs_def456"
                            className="h-8 text-[11px] font-mono"
                          />
                        </div>
                      ) : (
                        <Input
                          value={aiVectorStoreIds}
                          onChange={(e) => setAiVectorStoreIds(e.target.value)}
                          placeholder="vs_abc123,vs_def456"
                          className="h-8 text-[11px] font-mono"
                        />
                      )}
                      <p className="text-[10px] text-gray-400">
                        Sélectionnez parmi vos bases de connaissance ou entrez les IDs manuellement.
                      </p>
                    </div>
                  )}

                  {/* web_search */}
                  <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Checkbox
                      checked={aiTools.includes("web_search")}
                      onCheckedChange={(checked) => {
                        setAiTools((prev) =>
                          checked
                            ? [...prev, "web_search"]
                            : prev.filter((t) => t !== "web_search")
                        )
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-[13px] font-medium text-gray-700">web_search</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Recherche sur le web pour des informations à jour.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <details className="group rounded-lg border border-gray-200">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
                  Configuration avancée
                  <svg
                    className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
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
                <div className="space-y-3 border-t border-gray-100 p-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-gray-500">Modèle</Label>
                    <select
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                    >
                      <option value="gpt-5-mini">GPT-5 Mini</option>
                      <option value="gpt-5-nano">GPT-5 Nano</option>
                      <option value="o4-mini">o4 Mini</option>
                      <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4o">GPT-4o</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-gray-500">
                      Durée session (sec)
                    </Label>
                    <Input
                      type="number"
                      value={aiTimeline}
                      onChange={(e) => setAiTimeline(e.target.value)}
                      placeholder="3600"
                      className="h-9 text-[12px]"
                    />
                    <p className="text-[11px] text-gray-400">
                      L&apos;IA garde le contexte de la conversation pendant cette durée.
                    </p>
                  </div>
                </div>
              </details>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  className="h-10 rounded-lg px-4 text-[13px]"
                  onClick={() => setAiDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="h-10 rounded-lg px-6 text-[13px] gap-2"
                  onClick={() => handleSaveAi()}
                  disabled={aiSaving}
                >
                  {aiSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 2: Bases de connaissance ── */}
      <div style={stagger(2)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Bases de connaissance
          </h2>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-[13px] rounded-lg"
            onClick={() => setCreateVSDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Créer une base de connaissance
          </Button>
        </div>

        {vectorStores.length === 0 ? (
          <Card className="border-transparent">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
              <Database className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">
                Aucune base de connaissance créée
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Créez une base de connaissance pour stocker vos documents et enrichir les réponses de l&apos;IA.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {vectorStores.map((vs, i) => (
              <div
                key={`${vs.id}-${i}`}
                className="rounded-xl border border-border/40 p-4"
                style={stagger(i + 3)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                      <Database className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{vs.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {vs.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-[11px] rounded-lg"
                      onClick={() => {
                        setUploadDialogVSId(vs.id)
                        setUploadFiles([])
                      }}
                    >
                      <Upload className="h-3 w-3" />
                      Ajouter des documents
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          disabled={deletingVSId === vs.id}
                        >
                          {deletingVSId === vs.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
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
                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 shrink-0"
                          disabled={deletingFileId === file.file_id}
                          onClick={() =>
                            handleDeleteFile(vs.id, file)
                          }
                        >
                          {deletingFileId === file.file_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          onClick={() => setCreateVSDialogOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setCreateVSDialogOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Database className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Créer une base de connaissance
                </h3>
                <p className="text-[11px] text-gray-400">
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
                  className="h-9 rounded-lg px-4 text-[13px]"
                  onClick={() => setCreateVSDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="h-9 rounded-lg px-5 text-[13px] gap-2"
                  onClick={handleCreateVectorStore}
                  disabled={isCreatingVS || !newVSName.trim()}
                >
                  {isCreatingVS && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          onClick={() => setUploadDialogVSId(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setUploadDialogVSId(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50">
                <Upload className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">
                  Ajouter des documents
                </h3>
                <p className="text-[11px] text-gray-400">
                  Uploadez des fichiers depuis votre appareil
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {/* File upload */}
              <div className="space-y-1.5">
                <Label className="text-[13px] flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
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
                  className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadFiles.length > 0 ? (
                    <div className="text-center">
                      <p className="text-[13px] font-medium text-gray-700">
                        Fichiers sélectionnés
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {uploadFiles.map((f) => f.name).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-5 w-5 text-gray-300 mx-auto mb-1" />
                      <p className="text-[12px] text-gray-400">
                        Cliquez pour sélectionner des fichiers
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  className="h-9 rounded-lg px-4 text-[13px]"
                  onClick={() => setUploadDialogVSId(null)}
                >
                  Annuler
                </Button>
                <Button
                  className="h-9 rounded-lg px-5 text-[13px] gap-2"
                  onClick={() => handleUploadFiles(uploadDialogVSId)}
                  disabled={isUploading}
                >
                  {isUploading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
