"use client"

import { use, useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { agentsService, handleApiError } from "@/services"
import type { Agent, AgentDocument } from "@/services/agents"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { FileText, Spinner, Trash, UploadSimple, X } from "@phosphor-icons/react"
import { AGENT_CATALOG } from "../../_catalog"

interface Document {
  upload_id: string
  filename: string
  createdAt: string
  publicUrl?: string | null
}

const toDocument = (doc: AgentDocument): Document => ({
  upload_id: doc.upload_id || doc.id || "",
  filename: doc.file_name || doc.metadata?.title || "Document",
  createdAt: doc.created_at || "",
  publicUrl: doc.public_url,
})

export default function DocumentsPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params)
  const router = useRouter()
  const presentation = AGENT_CATALOG.find((a) => a.id === agentId)

  const [isLoading, setIsLoading] = useState(true)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      try {
        const resolvedAgent = await agentsService.getAgentByIdOrSlug(agentId)
        const docsResult = await agentsService.listDocuments(resolvedAgent.id)
        if (!active) return
        const nextDocuments = (docsResult.documents || []).map(toDocument).filter((doc) => doc.upload_id)
        setAgent(resolvedAgent)
        setDocuments(nextDocuments)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load().catch((error) => {
      toast.error(handleApiError(error).message)
      router.replace("/agents")
    })
    return () => { active = false }
  }, [agentId, router])

  const handleUpload = async (files: File[]) => {
    if (!agent || !files.length) return
    setIsUploading(true)
    try {
      const uploaded = await Promise.all(files.map((file) => agentsService.uploadDocument(agent.id, file)))
      const newDocs = uploaded.map(toDocument).filter((doc) => doc.upload_id)
      setDocuments((prev) => [...prev, ...newDocs])
      setSelectedDoc(newDocs[0] || null)
      toast.success("Document ajouté")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDoc = async (doc: Document) => {
    if (!agent) return
    setIsDeletingFile(doc.upload_id)
    try {
      await agentsService.deleteDocument(agent.id, doc.upload_id)
      setDocuments((prev) => prev.filter((d) => d.upload_id !== doc.upload_id))
      if (selectedDoc?.upload_id === doc.upload_id) setSelectedDoc(null)
      toast.success("Document supprimé")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsDeletingFile(null)
    }
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
        <span className="text-foreground">Documents WhatsApp</span>
      </nav>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Envoi de document
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Documents WhatsApp</h1>
        </div>
        <span className="text-[13px] text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          {/* Left: upload panel */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
              Ajouter un document
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) handleUpload(Array.from(e.target.files)) }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files) handleUpload(Array.from(e.dataTransfer.files))
              }}
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/50 bg-card/40 hover:border-border hover:bg-card/60"
              } disabled:opacity-50`}
            >
              {isUploading ? (
                <>
                  <Spinner className="h-7 w-7 animate-spin text-primary" weight="bold" />
                  <p className="text-[12px] text-muted-foreground">Envoi en cours…</p>
                </>
              ) : (
                <>
                  <UploadSimple className="h-7 w-7 text-muted-foreground/50" weight="duotone" />
                  <p className="text-[12px] font-medium text-muted-foreground/70">Sélectionner un fichier</p>
                  <p className="text-[10px] text-muted-foreground/40">PDF, Word, Excel, CSV…</p>
                </>
              )}
            </button>

            {/* Document list (compact) */}
            {documents.length > 0 && (
              <div className="space-y-1 mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 mb-2">
                  Documents ({documents.length})
                </p>
                {documents.map((doc) => (
                  <button
                    key={doc.upload_id}
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className={`group w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                      selectedDoc?.upload_id === doc.upload_id
                        ? "border-primary/30 bg-primary/10"
                        : "border-border/40 bg-card/40 hover:bg-card/60"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" weight="regular" />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/80">{doc.filename}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc) }}
                      disabled={isDeletingFile === doc.upload_id}
                      className="shrink-0 rounded-lg p-0.5 text-muted-foreground/20 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    >
                      {isDeletingFile === doc.upload_id ? (
                        <Spinner className="h-3 w-3 animate-spin" weight="bold" />
                      ) : (
                        <X className="h-3 w-3" weight="bold" />
                      )}
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: preview/detail panel */}
          <div className="rounded-2xl border border-border/50 bg-card/50">
            {!selectedDoc ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 p-8">
                <FileText className="h-16 w-16 text-muted-foreground/20" weight="duotone" />
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-muted-foreground">
                    Aucun document sélectionné
                  </p>
                  <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-muted-foreground/60">
                    Ajoutez un PDF, Word, Excel ou CSV (menu, catalogue…) ou sélectionnez-en un pour le gérer.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
                      <FileText className="h-5 w-5 text-primary" weight="fill" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-foreground">{selectedDoc.filename}</p>
                      <p className="text-[11px] font-mono text-muted-foreground/50">{selectedDoc.upload_id}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(selectedDoc)}
                    disabled={isDeletingFile === selectedDoc.upload_id}
                    className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                  >
                    {isDeletingFile === selectedDoc.upload_id ? (
                      <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" />
                    ) : (
                      <Trash className="h-3.5 w-3.5" weight="bold" />
                    )}
                    Supprimer
                  </button>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground/60">
                    Ce document est disponible pour être envoyé via WhatsApp par l&apos;agent IA lors des conversations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
