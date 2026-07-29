"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Eye, FloppyDisk, Trash, FilePdf,
  Spinner, CheckCircle, Warning, User,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import { handleApiError } from "@/services/api"
import {
  pdfTemplatesService,
  type PdfTemplate,
  type PdfTemplateType,
} from "@/services/pdf-templates"
import {
  KYC_TEMPLATE_NAME,
  KYC_TEMPLATE_HTML,
  KYC_FIELDS_SCHEMA,
  KYC_SAMPLE_DATA,
} from "@/services/pdf-templates-kyc"
import { BlockTemplateEditor } from "./block-editor"

// ─── Main editor ──────────────────────────────────────────────────────── //
export interface TemplateEditorProps {
  agentId: string
  mode: "create" | "edit"
  templateType: PdfTemplateType
  initialTemplate?: PdfTemplate
  onSaved: (t: PdfTemplate) => void
  onDeleted?: () => void
}

// "Facturation" is entirely handled by the block editor now — the styles-based
// accordion editor only remains for the fixed-layout KYC form below.
export function TemplateEditor(props: TemplateEditorProps) {
  if (props.templateType === "facturation") {
    return (
      <BlockTemplateEditor
        agentId={props.agentId}
        mode={props.mode}
        initialTemplate={props.initialTemplate}
        onSaved={props.onSaved}
        onDeleted={props.onDeleted}
      />
    )
  }
  return <KycTemplateEditor {...props} />
}

function KycTemplateEditor({
  agentId, mode, initialTemplate, onSaved, onDeleted,
}: TemplateEditorProps) {
  const [isLoading, setIsLoading]     = useState(true)
  const [isSaving, setIsSaving]       = useState(false)
  const [isDeleting, setIsDeleting]   = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [name, setName] = useState(initialTemplate?.name ?? KYC_TEMPLATE_NAME)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // ── Preview (fixed layout — doesn't depend on any user input here) ────── //
  const fetchPreview = async () => {
    setIsPreviewing(true)
    setPreviewError(null)
    try {
      const html = await pdfTemplatesService.previewTemplate({
        html_content: KYC_TEMPLATE_HTML,
        data: KYC_SAMPLE_DATA,
      })
      setPreviewHtml(html)
      if (!html?.trim()) {
        setPreviewError("Le serveur a renvoyé un aperçu vide.")
      }
    } catch (error) {
      const apiError = handleApiError(error)
      setPreviewError(apiError.message)
    } finally {
      setIsPreviewing(false)
    }
  }

  useEffect(() => {
    setIsLoading(true)
    fetchPreview().finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Save ──────────────────────────────────────────────────────────── //
  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (mode === "create") {
        const created = await pdfTemplatesService.createTemplate({
          name,
          agent_id: agentId,
          template_type: "kyc",
          html_content: KYC_TEMPLATE_HTML,
          fields_schema: KYC_FIELDS_SCHEMA,
          is_default: false,
        })
        toast.success("Modèle créé")
        onSaved(created)
      } else if (initialTemplate) {
        const updated = await pdfTemplatesService.updateTemplate(initialTemplate.id, { name })
        toast.success("Modèle enregistré")
        onSaved(updated)
      }
    } catch (err) {
      const { message } = handleApiError(err)
      toast.error(`Erreur: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────── //
  const handleDelete = async () => {
    if (!initialTemplate) return
    setIsDeleting(true)
    try {
      await pdfTemplatesService.deleteTemplate(initialTemplate.id)
      toast.success("Modèle supprimé")
      setShowDeleteConfirm(false)
      onDeleted?.()
    } catch {
      toast.error("Erreur suppression")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6 animate-spin text-primary" weight="bold" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/agents/${agentId}/devis`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" weight="bold" />
            Retour
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm font-medium">
            <User className="h-3.5 w-3.5 text-primary" weight="fill" />
            <span className="text-foreground">Formulaire KYC</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <Trash className="h-3.5 w-3.5" weight="bold" />
            </button>
          )}
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-1.5">
            {isSaving
              ? <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" />
              : <FloppyDisk className="h-3.5 w-3.5" weight="bold" />
            }
            {mode === "create" ? "Créer" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">

        {/* ── Left: name + fixed-layout notice ── */}
        <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-card">
          <div className="border-b border-border/50 px-4 py-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Nom du template
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fiche KYC"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="mx-4 my-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
            Ce modèle utilise une mise en page fixe (fiche d&apos;identification KYC).
            Seul le nom du modèle est modifiable.
          </div>
        </aside>

        {/* ── Right: A4 preview ── */}
        <div className="flex flex-1 flex-col bg-[#e4e4e4]">
          <div className="flex shrink-0 items-center justify-between border-b border-black/10 bg-[#d0d0d0] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-black/50" weight="regular" />
              <span className="text-xs font-semibold text-black/60">Aperçu A4 — données fictives</span>
            </div>
            <div className="flex items-center gap-2">
              {isPreviewing && (
                <div className="flex items-center gap-1.5 text-[11px] text-black/50">
                  <Spinner className="h-3 w-3 animate-spin" weight="bold" />
                  Rendu…
                </div>
              )}
              {previewError && !isPreviewing && (
                <span className="max-w-[320px] truncate text-[11px] text-red-600" title={previewError}>
                  {previewError}
                </span>
              )}
              <button
                onClick={fetchPreview}
                className="rounded-md bg-black/10 px-2.5 py-1 text-[11px] font-semibold text-black/60 transition-colors hover:bg-black/20"
              >
                Actualiser
              </button>
            </div>
          </div>

          <div className="flex flex-1 items-start justify-center overflow-auto px-8 pb-8 pt-10">
            {previewHtml && !previewError ? (
              <div
                className="origin-top shadow-[0_8px_32px_rgba(0,0,0,0.22)]"
                style={{
                  width: 794,
                  transform: "scale(0.75)",
                  transformOrigin: "top center",
                  marginBottom: -794 * 0.25,
                }}
              >
                <iframe
                  key={previewHtml}
                  srcDoc={previewHtml}
                  title="Aperçu du document"
                  sandbox="allow-same-origin"
                  style={{ width: 794, height: 1123, border: "none", background: "#fff", display: "block" }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 pt-24 text-black/40">
                <FilePdf className="h-12 w-12 opacity-20" weight="thin" />
                <p className="text-sm font-medium">
                  {isPreviewing
                    ? "Génération en cours…"
                    : previewError
                    ? previewError
                    : "Chargement de l'aperçu…"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-5 border-t border-border/60 bg-card px-5 py-2">
        {mode === "edit" && initialTemplate?.is_default ? (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" weight="fill" />
            Outil{" "}
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-primary">
              generate_pdf_quote
            </code>{" "}
            connecté à l&apos;IA via ce modèle
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            Utilisez le bouton « Connecté à l&apos;IA » depuis la liste des modèles pour l&apos;activer.
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Warning className="h-3.5 w-3.5 text-amber-400" weight="fill" />
          Requiert <span className="mx-1 font-medium text-foreground">WeasyPrint</span> sur le serveur
        </div>
      </div>

      {/* ── Delete confirmation ──────────────────────────────────────── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {name} » sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
