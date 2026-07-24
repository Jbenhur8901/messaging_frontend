"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Eye, FloppyDisk, Trash, FilePdf,
  Spinner, CaretDown, CaretRight, CheckCircle, Warning,
  Buildings, Palette, User, Table, CurrencyCircleDollar,
  CloudArrowUp,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/alert-dialog"
import { handleApiError } from "@/services/api"
import {
  pdfTemplatesService,
  DEFAULT_PDF_STYLES,
  type PdfStyles,
  type PdfTemplate,
  type PdfTemplateType,
} from "@/services/pdf-templates"
import {
  KYC_TEMPLATE_NAME,
  KYC_TEMPLATE_HTML,
  KYC_FIELDS_SCHEMA,
  KYC_SAMPLE_DATA,
} from "@/services/pdf-templates-kyc"

// ─── Colour presets ────────────────────────────────────────────────────── //
const COLOR_PRESETS = [
  "#233064", "#1a73e8", "#0d9488", "#7c3aed",
  "#dc2626", "#b45309", "#374151", "#000000",
]

// ─── Font options (system fonts, safe for WeasyPrint) ────────────────── //
const FONT_OPTIONS = [
  { value: "Arial, Helvetica, sans-serif",             label: "Arial",        sample: "Arial" },
  { value: "Verdana, Geneva, sans-serif",              label: "Verdana",      sample: "Verdana" },
  { value: "Tahoma, Geneva, sans-serif",               label: "Tahoma",       sample: "Tahoma" },
  { value: "'Trebuchet MS', Helvetica, sans-serif",    label: "Trebuchet MS", sample: "Trebuchet MS" },
  { value: "Georgia, 'Times New Roman', serif",        label: "Georgia",      sample: "Georgia" },
  { value: "'Times New Roman', Times, serif",          label: "Times New Roman", sample: "Times New Roman" },
  { value: "'Courier New', Courier, monospace",        label: "Courier New",  sample: "Courier New" },
]

const CURRENCY_OPTIONS = ["FCFA", "EUR", "USD", "XAF", "GBP", "MAD"]
const DOC_TITLE_SUGGESTIONS = ["DEVIS", "FACTURE", "PROFORMA", "BON DE COMMANDE", "OFFRE COMMERCIALE"]

// ─── Section types ────────────────────────────────────────────────────── //
type SectionId = "document" | "apparence" | "entreprise" | "client" | "tableau" | "totaux"

const SECTIONS: { id: SectionId; label: string; Icon: React.ElementType }[] = [
  { id: "document",   label: "Document",          Icon: FilePdf },
  { id: "apparence",  label: "Couleurs & Police", Icon: Palette },
  { id: "entreprise", label: "Entreprise",        Icon: Buildings },
  { id: "client",     label: "Champs client",     Icon: User },
  { id: "tableau",    label: "Tableau & colonnes",Icon: Table },
  { id: "totaux",     label: "Totaux & Sections", Icon: CurrencyCircleDollar },
]

// ─── Small reusable atoms ─────────────────────────────────────────────── //
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
    />
  )
}

function Textarea({ value, onChange, rows = 3 }: {
  value: string; onChange: (v: string) => void; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
    />
  )
}

function ToggleRow({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5 h-5 w-9 shrink-0 data-[state=checked]:bg-primary data-[state=unchecked]:bg-border [&>span]:h-4 [&>span]:w-4 [&>span]:bg-white [&>span]:data-[state=checked]:translate-x-4"
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
          />
          <div className="absolute inset-0" style={{ background: value }} />
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-9 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 uppercase focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>
    </Field>
  )
}

function LogoUploader({ value, onChange }: {
  value: string
  onChange: (v: string) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === "string") onChange(result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <div
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) processFile(file)
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => { if (!value) inputRef.current?.click() }}
        className={`relative flex min-h-[72px] items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : value
              ? "cursor-default border-border/40 bg-background"
              : "cursor-pointer border-border/50 hover:border-border hover:bg-muted/20"
        }`}
      >
        {value ? (
          <div className="flex w-full items-center gap-3 px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Logo"
              className="h-10 max-w-[100px] rounded object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />
            <p className="flex-1 truncate text-[11px] text-muted-foreground">Logo configuré</p>
            <button
              onClick={(e) => { e.stopPropagation(); onChange("") }}
              className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
              title="Supprimer"
            >
              <Trash className="h-3.5 w-3.5" weight="bold" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground">
            <CloudArrowUp className={`h-5 w-5 transition-colors ${isDragging ? "text-primary" : ""}`} weight="bold" />
            <p className="text-[11px] font-medium">Glisser ou cliquer pour importer</p>
            <p className="text-[10px] opacity-50">PNG · JPG · SVG · WEBP</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) processFile(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}

function Section({ id, open, onToggle, children }: {
  id: SectionId; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  const { label, Icon } = SECTIONS.find((s) => s.id === id)!
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-primary" weight="fill" />
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        {open
          ? <CaretDown className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
          : <CaretRight className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
        }
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-5 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main editor ──────────────────────────────────────────────────────── //
export interface TemplateEditorProps {
  agentId: string
  mode: "create" | "edit"
  templateType: PdfTemplateType
  initialTemplate?: PdfTemplate
  onSaved: (t: PdfTemplate) => void
  onDeleted?: () => void
}

export function TemplateEditor({
  agentId, mode, templateType, initialTemplate, onSaved, onDeleted,
}: TemplateEditorProps) {
  const isKyc = templateType === "kyc"

  const [isLoading, setIsLoading]     = useState(true)
  const [isSaving, setIsSaving]       = useState(false)
  const [isDeleting, setIsDeleting]   = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [name, setName] = useState(
    initialTemplate?.name ?? (isKyc ? KYC_TEMPLATE_NAME : "Devis")
  )
  const [styles, setStyles] = useState<PdfStyles>({
    ...DEFAULT_PDF_STYLES,
    ...(initialTemplate?.styles as Partial<PdfStyles> | undefined),
  })
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set(["apparence", "entreprise"])
  )

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Preview (can be immediate or debounced) ───────────────────────────── //
  const fetchPreview = useCallback(async (s: PdfStyles, htmlContent?: string) => {
    setIsPreviewing(true)
    setPreviewError(null)
    try {
      const html = await pdfTemplatesService.previewTemplate(
        htmlContent ? { html_content: htmlContent, data: KYC_SAMPLE_DATA } : { styles: s }
      )
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
  }, [])

  const requestPreview = useCallback((s: PdfStyles) => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => fetchPreview(s), 700)
  }, [fetchPreview])

  // ── Initial preview on mount ───────────────────────────────────────────── //
  useEffect(() => {
    let active = true
    const init = async () => {
      if (isKyc) {
        await fetchPreview(styles, KYC_TEMPLATE_HTML)
        return
      }
      if (mode === "edit") {
        await fetchPreview(styles)
        return
      }
      // create + facturation: seed styles from the org's current default template
      try {
        const { data: sys } = await pdfTemplatesService.getDefaultTemplate()
        if (!active) return
        const s = { ...DEFAULT_PDF_STYLES, ...(sys.styles as Partial<PdfStyles>) }
        setStyles(s)
        await fetchPreview(s)
      } catch {
        await fetchPreview(DEFAULT_PDF_STYLES)
      }
    }
    setIsLoading(true)
    init().finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Style helper ─────────────────────────────────────────────────────── //
  const set = <K extends keyof PdfStyles>(key: K, value: PdfStyles[K]) =>
    setStyles((prev) => ({ ...prev, [key]: value }))

  // ── Auto-preview on style changes (facturation only) ──────────────────── //
  const stylesRef = useRef(styles)
  stylesRef.current = styles
  useEffect(() => {
    if (!isLoading && !isKyc) requestPreview(stylesRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styles])

  // ── Section toggle ─────────────────────────────────────────────────── //
  const toggleSection = (id: SectionId) =>
    setOpenSections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ── Save ──────────────────────────────────────────────────────────── //
  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (mode === "create") {
        const created = isKyc
          ? await pdfTemplatesService.createTemplate({
              name,
              agent_id: agentId,
              template_type: "kyc",
              html_content: KYC_TEMPLATE_HTML,
              fields_schema: KYC_FIELDS_SCHEMA,
              is_default: false,
            })
          : await pdfTemplatesService.createTemplate({
              name,
              agent_id: agentId,
              template_type: "facturation",
              styles,
              is_default: false,
            })
        toast.success("Modèle créé")
        onSaved(created)
      } else if (initialTemplate) {
        const updated = await pdfTemplatesService.updateTemplate(
          initialTemplate.id,
          isKyc ? { name } : { name, styles }
        )
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
            {isKyc
              ? <User className="h-3.5 w-3.5 text-primary" weight="fill" />
              : <FilePdf className="h-3.5 w-3.5 text-primary" weight="fill" />
            }
            <span className="text-foreground">{isKyc ? "Formulaire KYC" : "Facturation"}</span>
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

        {/* ── Left: visual configurator ── */}
        <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-card">

          {/* Template name */}
          <div className="border-b border-border/50 px-4 py-4">
            <Field label="Nom du template">
              <Input value={name} onChange={setName} placeholder="Devis" />
            </Field>
          </div>

          {/* Accordion sections — n/a for KYC (fixed layout) */}
          {isKyc ? (
            <div className="mx-4 my-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
              Ce modèle utilise une mise en page fixe (fiche d&apos;identification KYC).
              Seul le nom du modèle est modifiable.
            </div>
          ) : (
          <>
          {/* ─ Document ─ */}
          <Section id="document" open={openSections.has("document")} onToggle={() => toggleSection("document")}>
            <Field label="Type de document">
              <Input value={styles.doc_title} onChange={(v) => set("doc_title", v)} placeholder="DEVIS" />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {DOC_TITLE_SUGGESTIONS.map((o) => (
                <button
                  key={o}
                  onClick={() => set("doc_title", o)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    styles.doc_title === o
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <Field label="Devise">
              <select
                value={styles.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Pied de page">
              <Textarea value={styles.footer_text} onChange={(v) => set("footer_text", v)} rows={3} />
            </Field>
          </Section>

          {/* ─ Apparence ─ */}
          <Section id="apparence" open={openSections.has("apparence")} onToggle={() => toggleSection("apparence")}>
            {/* Primary color */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Couleur principale
              </label>
              <div className="flex items-center gap-2">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border">
                  <input
                    type="color"
                    value={styles.primary_color}
                    onChange={(e) => set("primary_color", e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
                  />
                  <div className="absolute inset-0" style={{ background: styles.primary_color }} />
                </div>
                <input
                  value={styles.primary_color}
                  onChange={(e) => set("primary_color", e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-sm uppercase text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  placeholder="#233064"
                />
              </div>
              <div className="flex gap-1.5 pt-0.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => set("primary_color", c)}
                    title={c}
                    className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: styles.primary_color === c ? "white" : "transparent",
                      boxShadow: styles.primary_color === c ? "0 0 0 1px #fff, 0 0 0 2px " + c : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            <ColorField
              label="Couleur texte des en-têtes"
              value={styles.header_text_color}
              onChange={(v) => set("header_text_color", v)}
            />
            <ColorField
              label="Couleur du texte"
              value={styles.text_color}
              onChange={(v) => set("text_color", v)}
            />

            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Couleur atténuée"
                value={styles.muted_color}
                onChange={(v) => set("muted_color", v)}
              />
              <ColorField
                label="Lignes alternées"
                value={styles.row_alt_color}
                onChange={(v) => set("row_alt_color", v)}
              />
            </div>

            {/* Font family */}
            <Field label="Police de caractères">
              <select
                value={styles.font_family}
                onChange={(e) => set("font_family", e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                style={{ fontFamily: FONT_OPTIONS.find(f => f.value === styles.font_family)?.sample }}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.sample }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          {/* ─ Entreprise ─ */}
          <Section id="entreprise" open={openSections.has("entreprise")} onToggle={() => toggleSection("entreprise")}>
            <Field label="Nom de l'entreprise">
              <Input value={styles.entreprise_nom} onChange={(v) => set("entreprise_nom", v)} placeholder="Mon Entreprise" />
            </Field>
            <Field label="Adresse">
              <Textarea value={styles.entreprise_adresse} onChange={(v) => set("entreprise_adresse", v)} rows={2} />
            </Field>
            <Field label="Téléphone">
              <Input type="tel" value={styles.entreprise_telephone} onChange={(v) => set("entreprise_telephone", v)} placeholder="+242 06 000 0000" />
            </Field>
            <Field label="Email">
              <Input type="email" value={styles.entreprise_email} onChange={(v) => set("entreprise_email", v)} placeholder="contact@entreprise.com" />
            </Field>
            <Field label="Logo">
              <LogoUploader
                value={styles.entreprise_logo_url}
                onChange={(v) => set("entreprise_logo_url", v)}
              />
            </Field>
          </Section>

          {/* ─ Champs client ─ */}
          <Section id="client" open={openSections.has("client")} onToggle={() => toggleSection("client")}>
            <Field label="Titre de la section client">
              <Input value={styles.label_client} onChange={(v) => set("label_client", v)} placeholder="Destinataire" />
            </Field>
            <div className="divide-y divide-border/40 rounded-xl border border-border/60">
              <div className="px-3">
                <ToggleRow
                  label="Téléphone du client"
                  checked={styles.show_client_telephone}
                  onChange={(v) => set("show_client_telephone", v)}
                />
              </div>
              <div className="px-3">
                <ToggleRow
                  label="Email du client"
                  checked={styles.show_client_email}
                  onChange={(v) => set("show_client_email", v)}
                />
              </div>
              <div className="px-3">
                <ToggleRow
                  label="Adresse du client"
                  checked={styles.show_client_adresse}
                  onChange={(v) => set("show_client_adresse", v)}
                />
              </div>
            </div>
          </Section>

          {/* ─ Tableau ─ */}
          <Section id="tableau" open={openSections.has("tableau")} onToggle={() => toggleSection("tableau")}>
            <div className="divide-y divide-border/40 rounded-xl border border-border/60">
              <div className="px-3">
                <ToggleRow
                  label="Colonne quantité"
                  checked={styles.show_quantite}
                  onChange={(v) => set("show_quantite", v)}
                />
              </div>
              <div className="px-3">
                <ToggleRow
                  label="Colonne prix unitaire"
                  checked={styles.show_prix_unitaire}
                  onChange={(v) => set("show_prix_unitaire", v)}
                />
              </div>
            </div>
            <div className="space-y-3 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Étiquettes des colonnes
              </p>
              <Field label="Description">
                <Input value={styles.label_description} onChange={(v) => set("label_description", v)} placeholder="Description" />
              </Field>
              {styles.show_quantite && (
                <Field label="Quantité">
                  <Input value={styles.label_quantite} onChange={(v) => set("label_quantite", v)} placeholder="Qté" />
                </Field>
              )}
              {styles.show_prix_unitaire && (
                <Field label="Prix unitaire">
                  <Input value={styles.label_prix_unitaire} onChange={(v) => set("label_prix_unitaire", v)} placeholder="Prix unitaire" />
                </Field>
              )}
              <Field label="Total">
                <Input value={styles.label_total} onChange={(v) => set("label_total", v)} placeholder="Total" />
              </Field>
            </div>
          </Section>

          {/* ─ Totaux & Sections ─ */}
          <Section id="totaux" open={openSections.has("totaux")} onToggle={() => toggleSection("totaux")}>
            <div className="divide-y divide-border/40 rounded-xl border border-border/60">
              <div className="px-3">
                <ToggleRow
                  label="Afficher le sous-total HT"
                  checked={styles.show_sous_total}
                  onChange={(v) => set("show_sous_total", v)}
                />
              </div>
              <div className="px-3">
                <ToggleRow
                  label="Afficher la TVA"
                  hint="Le taux TVA est fourni par l'agent IA"
                  checked={styles.show_tva}
                  onChange={(v) => set("show_tva", v)}
                />
              </div>
            </div>
            <Field label="Taux TVA (%)">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={styles.tva_taux}
                onChange={(e) => set("tva_taux", parseFloat(e.target.value) || 0)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </Field>

            <div className="divide-y divide-border/40 rounded-xl border border-border/60">
              <div className="flex items-center justify-between px-3 py-2.5">
                <label className="text-sm text-foreground">Centime additionnel</label>
                <Switch
                  checked={styles.centime_additionnel_enabled}
                  onCheckedChange={(v) => set("centime_additionnel_enabled", v)}
                />
              </div>
            </div>

            {styles.centime_additionnel_enabled && (
              <>
                <Field label="Taux centime additionnel (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={styles.centime_additionnel_taux}
                    onChange={(e) => set("centime_additionnel_taux", parseFloat(e.target.value) || 0)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </Field>
                <Field label="Libellé centime additionnel">
                  <Input
                    value={styles.centime_additionnel_label}
                    onChange={(v) => set("centime_additionnel_label", v)}
                    placeholder="Centime additionnel"
                  />
                </Field>
              </>
            )}

            <div className="divide-y divide-border/40 rounded-xl border border-border/60">
              <div className="px-3">
                <ToggleRow
                  label="Afficher les notes"
                  hint="Notes et conditions en bas de page"
                  checked={styles.show_notes}
                  onChange={(v) => set("show_notes", v)}
                />
              </div>
            </div>
            {styles.show_notes && (
              <Field label="Titre de la section notes">
                <Input value={styles.label_notes} onChange={(v) => set("label_notes", v)} placeholder="Notes & Conditions" />
              </Field>
            )}
          </Section>
          </>
          )}
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
                onClick={() => fetchPreview(styles, isKyc ? KYC_TEMPLATE_HTML : undefined)}
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
