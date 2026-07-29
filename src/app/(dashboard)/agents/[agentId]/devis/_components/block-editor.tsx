"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsOut,
  CaretLeft,
  CaretRight,
  CloudArrowUp,
  Copy,
  DotsSixVertical,
  Eye,
  FilePdf,
  FlagBanner,
  FloppyDisk,
  GridFour,
  Image as ImageIcon,
  ListBullets,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Minus as MinusIcon,
  Plus,
  Sigma,
  Signature as SignatureIcon,
  Spinner,
  TextAa,
  TextT,
  TextUnderline,
  Trash,
  User,
  Table as TableIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
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
import { pdfTemplatesService, DEFAULT_PDF_STYLES, type PdfStyles, type PdfTemplate } from "@/services/pdf-templates"
import {
  BLOCK_LIBRARY,
  PRICE_TABLE_COLUMNS,
  createBlock,
  createBlockId,
  reorder,
  type BlockAlign,
  type PdfBlock,
  type PdfBlockType,
} from "@/types/pdf-blocks"

const PAGE_WIDTH = 794

// ─── Document data: the *real* quote information (client, lignes, signature) ── //
// Distinct from block config (which controls styling/layout). This is what the
// user fills in manually for each quote instead of relying on placeholder data.
interface DocumentItem {
  description: string
  detail: string
  quantity: number
  unit_price: number
}

interface DocumentData {
  doc_number: string
  date_emission: string
  date_validite: string
  client: {
    company: string
    address: string
    contact_name: string
    contact_email: string
    contact_phone: string
  }
  items: DocumentItem[]
  signature: { name: string; org: string }
}

// Page blanche : aucune donnée fictive pré-remplie — tout reste vide jusqu'à ce
// que l'utilisateur saisisse ses propres informations.
const DEFAULT_DOCUMENT_DATA: DocumentData = {
  doc_number: "",
  date_emission: "",
  date_validite: "",
  client: {
    company: "",
    address: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  },
  items: [{ description: "", detail: "", quantity: 1, unit_price: 0 }],
  signature: { name: "", org: "" },
}

const COLUMN_LABELS: Record<string, string> = {
  description: "Description",
  detail: "Détail",
  quantity: "Quantité",
  unit_price: "Prix unitaire",
  amount: "Montant",
}

const BLOCK_ICONS: Record<PdfBlockType, React.ElementType> = {
  title: TextT,
  text: TextAa,
  field: TextUnderline,
  list: ListBullets,
  customer_information: User,
  price_table: TableIcon,
  total: Sigma,
  image: ImageIcon,
  section_header: FlagBanner,
  separator: MinusIcon,
  signature: SignatureIcon,
}

const formatAmount = (value: number) =>
  `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

const LOCAL_KEY = "flow-pdf-template-blocks-v1"

function loadLocalBlocks(templateId?: string): PdfBlock[] | null {
  if (typeof window === "undefined" || !templateId) return null
  try {
    const raw = window.localStorage.getItem(`${LOCAL_KEY}:${templateId}`)
    return raw ? (JSON.parse(raw) as PdfBlock[]) : null
  } catch {
    return null
  }
}

function saveLocalBlocks(templateId: string, blocks: PdfBlock[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(`${LOCAL_KEY}:${templateId}`, JSON.stringify(blocks))
}

const LOCAL_DATA_KEY = "flow-pdf-template-data-v1"

function loadLocalDocumentData(templateId?: string): DocumentData | null {
  if (typeof window === "undefined" || !templateId) return null
  try {
    const raw = window.localStorage.getItem(`${LOCAL_DATA_KEY}:${templateId}`)
    return raw ? (JSON.parse(raw) as DocumentData) : null
  } catch {
    return null
  }
}

function saveLocalDocumentData(templateId: string, data: DocumentData) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(`${LOCAL_DATA_KEY}:${templateId}`, JSON.stringify(data))
}

// ─── Migration: rebuild blocks from an existing (pre-blocks) template's styles ─── //
// Ensures an existing template stays fully editable — instead of showing empty
// generic blocks, the editor reconstructs the document from its real configuration.
function migrateStylesToBlocks(styles: PdfStyles): PdfBlock[] {
  const blocks: PdfBlock[] = []
  let order = 1
  const push = (type: PdfBlockType, config: Record<string, unknown>) => {
    blocks.push({ id: createBlockId(), type, order: order++, config })
  }

  if (styles.entreprise_logo_url) {
    push("image", { url: styles.entreprise_logo_url, align: "left", size: "medium" })
  }
  push("title", {
    text: styles.doc_title || "DEVIS",
    align: "left",
    color: styles.primary_color || "#111111",
    size: "large",
    show_doc_info: true,
  })
  push("customer_information", {
    show_company: true,
    show_contact: Boolean(styles.show_client_telephone || styles.show_client_email),
    show_address: Boolean(styles.show_client_adresse),
    title: styles.label_client || "Informations client",
    accent_color: styles.primary_color || "#111111",
  })

  const columns: string[] = ["description"]
  if (styles.show_quantite) columns.push("quantity")
  if (styles.show_prix_unitaire) columns.push("unit_price")
  columns.push("amount")
  push("price_table", {
    columns,
    header_bg: styles.muted_color ? `${styles.muted_color}22` : "#f3f4f6",
    zebra: Boolean(styles.row_alt_color),
    show_border: true,
  })

  push("total", {
    show_subtotal: Boolean(styles.show_sous_total),
    show_tax: Boolean(styles.show_tva),
    tax_rate: styles.tva_taux ?? 0,
    accent_color: styles.primary_color || "#111111",
  })

  if (styles.show_notes && styles.footer_text) {
    push("text", { text: styles.footer_text, align: "left", color: styles.text_color || "#333333", size: "medium" })
  }

  push("signature", {
    align: "center",
    size: "medium",
    show_name: true,
    show_title: true,
    ink_color: styles.primary_color || "#111111",
  })

  return blocks
}

export interface BlockTemplateEditorProps {
  agentId: string
  mode: "create" | "edit"
  initialTemplate?: PdfTemplate
  onSaved: (t: PdfTemplate) => void
  onDeleted?: () => void
}

export function BlockTemplateEditor({ agentId, mode, initialTemplate, onSaved, onDeleted }: BlockTemplateEditorProps) {
  const [name, setName] = useState(initialTemplate?.name ?? "Nouveau document")
  const [isEditingName, setIsEditingName] = useState(false)
  const [initialData] = useState(() => {
    if (initialTemplate?.blocks?.length) {
      return { blocks: initialTemplate.blocks, migrated: false }
    }
    const local = loadLocalBlocks(initialTemplate?.id)
    if (local?.length) {
      return { blocks: local, migrated: false }
    }
    if (initialTemplate) {
      return { blocks: migrateStylesToBlocks(initialTemplate.styles), migrated: true }
    }
    // Page blanche : l'utilisateur construit son document bloc par bloc, sans pré-remplissage.
    return { blocks: [], migrated: false }
  })
  const [blocks, setBlocksState] = useState<PdfBlock[]>(initialData.blocks)
  const [documentData, setDocumentDataState] = useState<DocumentData>(
    () => loadLocalDocumentData(initialTemplate?.id) ?? DEFAULT_DOCUMENT_DATA
  )

  type Snapshot = { blocks: PdfBlock[]; documentData: DocumentData }
  const [history, setHistory] = useState<Snapshot[]>([])
  const [future, setFuture] = useState<Snapshot[]>([])
  const stateRef = useRef<Snapshot>({ blocks, documentData })
  stateRef.current = { blocks, documentData }

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const selected = blocks.find((b) => b.id === selectedId) ?? null

  const setBlocks = (updater: PdfBlock[] | ((prev: PdfBlock[]) => PdfBlock[])) => {
    setBlocksState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      setHistory((h) => [...h.slice(-19), { blocks: prev, documentData: stateRef.current.documentData }])
      setFuture([])
      return next
    })
  }

  const setDocumentData = (updater: DocumentData | ((prev: DocumentData) => DocumentData)) => {
    setDocumentDataState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      setHistory((h) => [...h.slice(-19), { blocks: stateRef.current.blocks, documentData: prev }])
      setFuture([])
      return next
    })
  }

  const updateDocInfo = (patch: Partial<Pick<DocumentData, "doc_number" | "date_emission" | "date_validite">>) =>
    setDocumentData((prev) => ({ ...prev, ...patch }))
  const updateClient = (patch: Partial<DocumentData["client"]>) =>
    setDocumentData((prev) => ({ ...prev, client: { ...prev.client, ...patch } }))
  const updateItems = (items: DocumentItem[]) =>
    setDocumentData((prev) => ({ ...prev, items }))
  const updateSignature = (patch: Partial<DocumentData["signature"]>) =>
    setDocumentData((prev) => ({ ...prev, signature: { ...prev.signature, ...patch } }))

  const handleUndo = () => {
    setHistory((h) => {
      if (h.length === 0) return h
      const previous = h[h.length - 1]
      setFuture((f) => [stateRef.current, ...f])
      setBlocksState(previous.blocks)
      setDocumentDataState(previous.documentData)
      return h.slice(0, -1)
    })
  }

  const handleRedo = () => {
    setFuture((f) => {
      if (f.length === 0) return f
      const [next, ...rest] = f
      setHistory((h) => [...h, stateRef.current])
      setBlocksState(next.blocks)
      setDocumentDataState(next.documentData)
      return rest
    })
  }

  const handleAddBlock = (type: PdfBlockType) => {
    const block = createBlock(type, blocks.length + 1)
    setBlocks((prev) => reorder([...prev, block]))
    setSelectedId(block.id)
  }

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => reorder(prev.filter((b) => b.id !== id)))
    setSelectedId((current) => (current === id ? null : current))
  }

  const handleDuplicateBlock = (id: string) => {
    const newId = createBlockId()
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id)
      if (index === -1) return prev
      const copy: PdfBlock = { ...prev[index], id: newId, config: { ...prev[index].config } }
      const next = [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]
      return reorder(next)
    })
    setSelectedId(newId)
  }

  const handleUpdateConfig = (id: string, patch: Record<string, unknown>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, config: { ...b.config, ...patch } } : b))
    )
  }

  const handleReorderDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.id === draggedId)
      const to = prev.findIndex((b) => b.id === targetId)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return reorder(next)
    })
    setDraggedId(null)
    setDragOverId(null)
  }

  useEffect(() => {
    if (initialData.migrated && initialTemplate?.id) {
      saveLocalBlocks(initialTemplate.id, initialData.blocks)
      toast.info("Modèle existant migré vers l'éditeur par blocs à partir de sa configuration actuelle.")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) handleRedo()
        else handleUndo()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (mode === "create") {
        const created = await pdfTemplatesService.createTemplate({
          name,
          agent_id: agentId,
          template_type: "facturation",
          styles: DEFAULT_PDF_STYLES,
          blocks,
          is_default: false,
        })
        saveLocalBlocks(created.id, blocks)
        saveLocalDocumentData(created.id, documentData)
        toast.success("Modèle créé")
        onSaved({ ...created, blocks })
      } else if (initialTemplate) {
        const updated = await pdfTemplatesService.updateTemplate(initialTemplate.id, { name, blocks })
        saveLocalBlocks(initialTemplate.id, blocks)
        saveLocalDocumentData(initialTemplate.id, documentData)
        toast.success("Modèle enregistré")
        onSaved({ ...updated, blocks })
      }
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setIsSaving(false)
    }
  }

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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      {/* ── Top bar ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card px-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/agents/${agentId}/devis`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" weight="bold" />
            Retour
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-sm text-muted-foreground">Modèles</span>
          <span className="text-muted-foreground/30">/</span>
          {isEditingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter") setIsEditingName(false) }}
              className="h-7 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-sm font-semibold text-foreground transition-opacity hover:opacity-80"
            >
              {name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label="Annuler"
          >
            <ArrowUUpLeft className="h-4 w-4" weight="bold" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={future.length === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label="Rétablir"
          >
            <ArrowUUpRight className="h-4 w-4" weight="bold" />
          </button>
          <div className="mx-2 flex items-center gap-1.5 rounded-lg border border-border/50 px-2 py-1 text-[11px] text-muted-foreground">
            <CaretLeft className="h-3.5 w-3.5 opacity-30" weight="bold" />
            <span>1 / 1</span>
            <CaretRight className="h-3.5 w-3.5 opacity-30" weight="bold" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode((p) => !p)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              previewMode
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" weight="regular" />
            Aperçu
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <Trash className="h-3.5 w-3.5" weight="bold" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" /> : <FloppyDisk className="h-3.5 w-3.5" weight="bold" />}
            {mode === "create" ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1">
        {/* Block library */}
        {!previewMode && !sidebarCollapsed && (
          <aside className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-border/60 bg-card">
            <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
              <span className="text-xs font-semibold text-foreground">Bibliothèque de blocs</span>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <CaretLeft className="h-3.5 w-3.5" weight="bold" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
              <BlockLibraryGroup title="Contenu" category="content" onAdd={handleAddBlock} />
              <BlockLibraryGroup title="Mise en page" category="layout" onAdd={handleAddBlock} />
            </div>
            <div className="border-t border-border/50 px-3 py-3 text-[10px] leading-relaxed text-muted-foreground/50">
              Faites glisser les blocs pour les ajouter au document.
            </div>
          </aside>
        )}
        {!previewMode && sidebarCollapsed && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="flex w-7 shrink-0 items-center justify-center border-r border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            <CaretRight className="h-3.5 w-3.5" weight="bold" />
          </button>
        )}

        {/* Canvas */}
        <div className="relative flex flex-1 flex-col overflow-auto bg-[#2b2b2b]" onClick={() => setSelectedId(null)}>
          <div className="flex flex-1 justify-center px-8 py-10">
            <div
              className="h-fit shrink-0 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
              style={{ width: PAGE_WIDTH, transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-14 py-16">
                {blocks.map((block) => (
                  <BlockWrapper
                    key={block.id}
                    block={block}
                    selected={selectedId === block.id}
                    previewMode={previewMode}
                    isDragOver={dragOverId === block.id}
                    onSelect={() => setSelectedId(block.id)}
                    onDelete={() => handleDeleteBlock(block.id)}
                    onDuplicate={() => handleDuplicateBlock(block.id)}
                    onDragStart={() => setDraggedId(block.id)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(block.id) }}
                    onDrop={(e) => { e.preventDefault(); handleReorderDrop(block.id) }}
                    onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
                  >
                    <BlockRenderer
                      block={block}
                      editable={selectedId === block.id && !previewMode}
                      onUpdateConfig={(patch) => handleUpdateConfig(block.id, patch)}
                      documentData={documentData}
                      onUpdateDocInfo={updateDocInfo}
                      onUpdateClient={updateClient}
                      onUpdateItems={updateItems}
                      onUpdateSignature={updateSignature}
                    />
                  </BlockWrapper>
                ))}
                {blocks.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-24 text-center text-black/30">
                    <FilePdf className="h-10 w-10" weight="thin" />
                    <p className="text-sm">Ajoutez des blocs depuis la bibliothèque</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating zoom toolbar */}
          <div className="pointer-events-none sticky inset-x-0 bottom-6 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/40 bg-[#1a1a1a] px-2 py-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <MagnifyingGlassMinus className="h-3.5 w-3.5" weight="bold" />
              </button>
              <span className="w-10 text-center text-[11px] text-muted-foreground">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(150, z + 10))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <MagnifyingGlassPlus className="h-3.5 w-3.5" weight="bold" />
              </button>
              <div className="mx-1 h-4 w-px bg-border/50" />
              <button
                type="button"
                onClick={() => setZoom(100)}
                title="Réinitialiser le zoom"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <ArrowsOut className="h-3.5 w-3.5" weight="bold" />
              </button>
              <button
                type="button"
                title="Document"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <FilePdf className="h-3.5 w-3.5" weight="fill" />
              </button>
              <button
                type="button"
                title="Grille"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <GridFour className="h-3.5 w-3.5" weight="regular" />
              </button>
            </div>
          </div>
        </div>

        {/* Properties panel */}
        {!previewMode && (
          <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-border/60 bg-card p-4">
            {selected ? (
              <BlockProperties
                block={selected}
                onChange={(patch) => handleUpdateConfig(selected.id, patch)}
                onDelete={() => handleDeleteBlock(selected.id)}
                onDuplicate={() => handleDuplicateBlock(selected.id)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground/50">
                <p className="text-[12px]">Sélectionnez un bloc pour modifier ses propriétés.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── Delete confirmation ── */}
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

// ─── Block library sidebar group ──────────────────────────────────────── //
function BlockLibraryGroup({
  title, category, onAdd,
}: {
  title: string
  category: "content" | "layout"
  onAdd: (type: PdfBlockType) => void
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">{title}</p>
      <div className="space-y-1">
        {BLOCK_LIBRARY.filter((item) => item.category === category).map((item) => {
          const Icon = BLOCK_ICONS[item.type]
          return (
            <button
              key={`${title}-${item.type}`}
              type="button"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/block-type", item.type)}
              onClick={() => onAdd(item.type)}
              className="flex w-full cursor-grab items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] text-foreground transition-colors hover:bg-muted active:cursor-grabbing"
            >
              <DotsSixVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" weight="bold" />
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" weight="regular" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Canvas block wrapper (selection outline + floating tag) ─────────── //
function BlockWrapper({
  block, selected, previewMode, isDragOver, onSelect, onDelete, onDuplicate,
  onDragStart, onDragOver, onDrop, onDragEnd, children,
}: {
  block: PdfBlock
  selected: boolean
  previewMode: boolean
  isDragOver: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  children: React.ReactNode
}) {
  if (previewMode) {
    return <div className="py-2">{children}</div>
  }

  const Icon = BLOCK_ICONS[block.type]
  const label = BLOCK_LIBRARY.find((b) => b.type === block.type)?.label ?? block.type

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      className={`group relative cursor-pointer rounded-sm py-2 outline outline-1 outline-offset-4 transition-colors ${
        selected
          ? "outline-2 outline-dashed outline-primary"
          : "outline-transparent hover:outline-dashed hover:outline-border"
      } ${isDragOver ? "outline-2 outline-primary" : ""}`}
    >
      {selected && (
        <div className="absolute -top-8 left-0 z-10 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/40 bg-[#1a1a1a] px-2 py-1 text-[11px] text-white shadow-lg">
          <span draggable onDragStart={onDragStart} className="flex cursor-grab items-center">
            <DotsSixVertical className="h-3.5 w-3.5 text-white/50" weight="bold" />
          </span>
          <Icon className="h-3.5 w-3.5 text-primary" weight="regular" />
          <span>{label}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            className="ml-1 text-white/50 transition-colors hover:text-foreground"
            title="Dupliquer"
          >
            <Copy className="h-3.5 w-3.5" weight="regular" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-white/50 transition-colors hover:text-destructive"
            title="Supprimer"
          >
            <Trash className="h-3.5 w-3.5" weight="regular" />
          </button>
        </div>
      )}
      {children}
    </div>
  )
}

const TEXT_SIZE_CLASSES: Record<string, string> = { small: "text-[10px]", medium: "text-[12px]", large: "text-[14px]" }
const TITLE_SIZE_CLASSES: Record<string, string> = { small: "text-xl", medium: "text-2xl", large: "text-3xl" }
const IMAGE_SIZE_CLASSES: Record<string, string> = { small: "max-h-12", medium: "max-h-24", large: "max-h-40" }

// ─── Inline-editable text (contentEditable, committed on blur to avoid caret jumps) ── //
function EditableText({
  as: Tag, value, onCommit, editable, singleLine, className, style,
}: {
  as: "h1" | "p" | "span"
  value: string
  onCommit: (text: string) => void
  editable: boolean
  singleLine?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLElement>(null)

  if (!editable) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    )
  }

  return (
    <Tag
      ref={ref as React.RefObject<HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>}
      className={`${className ?? ""} cursor-text rounded outline-none ring-primary/40 focus:ring-2`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (singleLine && e.key === "Enter") {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        }
      }}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
    >
      {value}
    </Tag>
  )
}

// ─── Editable table cell (plain input, committed on blur, resynced on undo) ── //
function EditableCell({
  value, onCommit, editable, type = "text", className,
}: {
  value: string
  onCommit: (value: string) => void
  editable: boolean
  type?: "text" | "number"
  className?: string
}) {
  if (!editable) {
    return <span className={className}>{value}</span>
  }
  return (
    <input
      key={value}
      type={type}
      defaultValue={value}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onCommit(e.currentTarget.value)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
      className={`${className ?? ""} w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 outline-none focus:border-primary/40 focus:bg-primary/5`}
    />
  )
}

// ─── Canvas block content renderer (real document data, filled in manually) ── //
function BlockRenderer({
  block, editable, onUpdateConfig, documentData, onUpdateDocInfo, onUpdateClient, onUpdateItems, onUpdateSignature,
}: {
  block: PdfBlock
  editable: boolean
  onUpdateConfig: (patch: Record<string, unknown>) => void
  documentData: DocumentData
  onUpdateDocInfo: (patch: Partial<Pick<DocumentData, "doc_number" | "date_emission" | "date_validite">>) => void
  onUpdateClient: (patch: Partial<DocumentData["client"]>) => void
  onUpdateItems: (items: DocumentItem[]) => void
  onUpdateSignature: (patch: Partial<DocumentData["signature"]>) => void
}) {
  switch (block.type) {
    case "title": {
      const cfg = block.config as { text: string; align: BlockAlign; color?: string; size?: string; show_doc_info?: boolean }
      return (
        <div className="flex items-start justify-between gap-4" style={{ textAlign: cfg.align }}>
          <EditableText
            as="h1"
            editable={editable}
            singleLine
            value={cfg.text}
            onCommit={(text) => onUpdateConfig({ text })}
            className={`font-bold tracking-tight ${TITLE_SIZE_CLASSES[cfg.size ?? "large"]}`}
            style={{ color: cfg.color || "#111111" }}
          />
          {cfg.show_doc_info && (
            <div className="whitespace-nowrap text-right text-[11px] leading-relaxed text-black/50">
              <p className="flex justify-end gap-1">
                N°
                <EditableText
                  as="span"
                  editable={editable}
                  singleLine
                  value={documentData.doc_number}
                  onCommit={(text) => onUpdateDocInfo({ doc_number: text })}
                />
              </p>
              <EditableText
                as="span"
                editable={editable}
                singleLine
                value={documentData.date_emission}
                onCommit={(text) => onUpdateDocInfo({ date_emission: text })}
                className="block"
              />
              <p className="flex justify-end gap-1">
                Valide jusqu&apos;au
                <EditableText
                  as="span"
                  editable={editable}
                  singleLine
                  value={documentData.date_validite}
                  onCommit={(text) => onUpdateDocInfo({ date_validite: text })}
                />
              </p>
            </div>
          )}
        </div>
      )
    }
    case "text": {
      const cfg = block.config as { text: string; align: BlockAlign; color?: string; size?: string }
      return (
        <EditableText
          as="p"
          editable={editable}
          value={cfg.text}
          onCommit={(text) => onUpdateConfig({ text })}
          className={`whitespace-pre-line leading-relaxed ${TEXT_SIZE_CLASSES[cfg.size ?? "medium"]}`}
          style={{ textAlign: cfg.align, color: cfg.color || "#333333" }}
        />
      )
    }
    case "field": {
      const cfg = block.config as { label: string; value: string; style: "line" | "boxed"; accent_color?: string }
      return (
        <div className="flex items-baseline gap-2 text-[12px] text-black/80">
          <EditableText
            as="span"
            editable={editable}
            singleLine
            value={cfg.label}
            onCommit={(text) => onUpdateConfig({ label: text })}
            className="shrink-0 font-medium"
            style={{ color: cfg.accent_color || "#111111" }}
          />
          <EditableText
            as="span"
            editable={editable}
            singleLine
            value={cfg.value}
            onCommit={(text) => onUpdateConfig({ value: text })}
            className={
              cfg.style === "boxed"
                ? "min-h-[22px] flex-1 rounded border border-black/15 px-2 py-0.5"
                : "min-h-[18px] flex-1 border-b border-dotted border-black/40 px-1"
            }
          />
        </div>
      )
    }
    case "list": {
      const cfg = block.config as { items: string[]; style: "bullet" | "number" | "dash"; color?: string }
      const updateItem = (idx: number, text: string) =>
        onUpdateConfig({ items: cfg.items.map((it, i) => (i === idx ? text : it)) })
      const removeItem = (idx: number) =>
        onUpdateConfig({ items: cfg.items.filter((_, i) => i !== idx) })
      return (
        <div className="space-y-1 text-[12px]" style={{ color: cfg.color || "#333333" }}>
          {cfg.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-black/50">
                {cfg.style === "number" ? `${i + 1}.` : cfg.style === "dash" ? "–" : "•"}
              </span>
              <EditableText
                as="span"
                editable={editable}
                singleLine
                value={item}
                onCommit={(text) => updateItem(i, text)}
                className="flex-1 leading-relaxed"
              />
              {editable && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeItem(i) }}
                  className="mt-0.5 shrink-0 text-black/25 transition-colors hover:text-destructive"
                  title="Supprimer le point"
                >
                  <Trash className="h-3 w-3" weight="bold" />
                </button>
              )}
            </div>
          ))}
          {editable && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUpdateConfig({ items: [...cfg.items, "Nouveau point"] }) }}
              className="text-[10px] font-medium text-primary transition-opacity hover:opacity-80"
            >
              + Ajouter un point
            </button>
          )}
        </div>
      )
    }
    case "section_header": {
      const cfg = block.config as { text: string; align?: BlockAlign; bg_color?: string; text_color?: string }
      return (
        <div
          className="rounded px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: cfg.bg_color || "#f3f4f6", color: cfg.text_color || "#111111", textAlign: cfg.align || "left" }}
        >
          <EditableText
            as="span"
            editable={editable}
            singleLine
            value={cfg.text}
            onCommit={(text) => onUpdateConfig({ text })}
          />
        </div>
      )
    }
    case "customer_information": {
      const cfg = block.config as {
        show_company: boolean; show_contact: boolean; show_address: boolean
        title?: string; accent_color?: string
      }
      return (
        <div>
          <EditableText
            as="p"
            editable={editable}
            singleLine
            value={cfg.title || "Informations client"}
            onCommit={(text) => onUpdateConfig({ title: text })}
            className="mb-2 inline-block text-[11px] font-semibold"
            style={{ color: cfg.accent_color || "#111111" }}
          />
          <div className="grid grid-cols-2 gap-8 text-[11px] text-black/70">
            <div className="space-y-0.5">
              {cfg.show_company && (
                <EditableText
                  as="p"
                  editable={editable}
                  singleLine
                  value={documentData.client.company}
                  onCommit={(text) => onUpdateClient({ company: text })}
                  className="font-medium text-black"
                />
              )}
              {cfg.show_address && (
                <EditableText
                  as="p"
                  editable={editable}
                  value={documentData.client.address}
                  onCommit={(text) => onUpdateClient({ address: text })}
                  className="whitespace-pre-line"
                />
              )}
            </div>
            {cfg.show_contact && (
              <div className="space-y-0.5">
                <p className="text-black/50">Contact</p>
                <EditableText
                  as="p"
                  editable={editable}
                  singleLine
                  value={documentData.client.contact_name}
                  onCommit={(text) => onUpdateClient({ contact_name: text })}
                  className="font-medium text-black"
                />
                <EditableText
                  as="p"
                  editable={editable}
                  singleLine
                  value={documentData.client.contact_email}
                  onCommit={(text) => onUpdateClient({ contact_email: text })}
                />
                <EditableText
                  as="p"
                  editable={editable}
                  singleLine
                  value={documentData.client.contact_phone}
                  onCommit={(text) => onUpdateClient({ contact_phone: text })}
                />
              </div>
            )}
          </div>
        </div>
      )
    }
    case "price_table": {
      const cfg = block.config as {
        title?: string; columns: string[]; header_bg?: string; zebra?: boolean; show_border?: boolean
      }
      const border = cfg.show_border ?? true
      return (
        <div>
          <EditableText
            as="p"
            editable={editable}
            singleLine
            value={cfg.title || "Prestation proposée"}
            onCommit={(text) => onUpdateConfig({ title: text })}
            className="mb-2 inline-block text-[11px] font-semibold text-black"
          />
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr style={{ background: cfg.header_bg || "transparent" }} className={border ? "border-b border-black/15" : ""}>
                {cfg.columns.map((c) => (
                  <th key={c} className="px-1.5 py-1.5 text-left font-medium text-black/50">{COLUMN_LABELS[c] || c}</th>
                ))}
                {editable && <th className="w-6" />}
              </tr>
            </thead>
            <tbody>
              {documentData.items.map((item, i) => {
                const amount = item.quantity * item.unit_price
                const updateItem = (patch: Partial<DocumentItem>) => {
                  const next = documentData.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
                  onUpdateItems(next)
                }
                return (
                  <tr
                    key={i}
                    className={border ? "border-b border-black/5" : ""}
                    style={{ background: cfg.zebra && i % 2 === 1 ? "rgba(0,0,0,0.03)" : "transparent" }}
                  >
                    {cfg.columns.map((c) => {
                      if (c === "amount") {
                        return <td key={c} className="px-1.5 py-1.5 text-black/80">{formatAmount(amount)}</td>
                      }
                      if (c === "unit_price") {
                        return (
                          <td key={c} className="px-1.5 py-1.5 text-black/80">
                            <EditableCell
                              type="number"
                              editable={editable}
                              value={editable ? String(item.unit_price) : formatAmount(item.unit_price)}
                              onCommit={(v) => updateItem({ unit_price: parseFloat(v) || 0 })}
                            />
                          </td>
                        )
                      }
                      if (c === "quantity") {
                        return (
                          <td key={c} className="px-1.5 py-1.5 text-black/80">
                            <EditableCell
                              type="number"
                              editable={editable}
                              value={String(item.quantity)}
                              onCommit={(v) => updateItem({ quantity: parseFloat(v) || 0 })}
                            />
                          </td>
                        )
                      }
                      const field = c as "description" | "detail"
                      return (
                        <td key={c} className="px-1.5 py-1.5 text-black/80">
                          <EditableCell
                            editable={editable}
                            value={item[field] ?? ""}
                            onCommit={(v) => updateItem({ [field]: v })}
                          />
                        </td>
                      )
                    })}
                    {editable && (
                      <td className="px-1 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdateItems(documentData.items.filter((_, idx) => idx !== i))
                          }}
                          className="text-black/30 transition-colors hover:text-destructive"
                          title="Supprimer la ligne"
                        >
                          <Trash className="h-3 w-3" weight="bold" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {editable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onUpdateItems([...documentData.items, { description: "Nouvelle ligne", detail: "", quantity: 1, unit_price: 0 }])
              }}
              className="mt-2 text-[10px] font-medium text-primary transition-opacity hover:opacity-80"
            >
              + Ajouter une ligne
            </button>
          )}
        </div>
      )
    }
    case "total": {
      const cfg = block.config as { show_subtotal: boolean; show_tax: boolean; tax_rate: number; accent_color?: string }
      const subtotal = documentData.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
      const tax = subtotal * (cfg.tax_rate / 100)
      const total = subtotal + (cfg.show_tax ? tax : 0)
      return (
        <div className="ml-auto w-56 space-y-1 text-[11px] text-black/80">
          {cfg.show_subtotal && (
            <div className="flex justify-between"><span>Sous-total</span><span>{formatAmount(subtotal)}</span></div>
          )}
          {cfg.show_tax && (
            <div className="flex justify-between"><span>TVA ({cfg.tax_rate}%)</span><span>{formatAmount(tax)}</span></div>
          )}
          <div
            className="flex justify-between border-t pt-1 font-semibold"
            style={{ borderColor: "rgba(0,0,0,0.15)", color: cfg.accent_color || "#111111" }}
          >
            <span>Total TTC</span><span>{formatAmount(total)}</span>
          </div>
        </div>
      )
    }
    case "image": {
      const cfg = block.config as { url: string; align: BlockAlign; size?: string }
      const justify = cfg.align === "center" ? "justify-center" : cfg.align === "right" ? "justify-end" : "justify-start"
      return (
        <div className={`flex ${justify}`}>
          {cfg.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.url} alt="" className={`${IMAGE_SIZE_CLASSES[cfg.size ?? "medium"]} object-contain`} />
          ) : (
            <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-black/20 text-[10px] text-black/40">
              Image
            </div>
          )}
        </div>
      )
    }
    case "separator": {
      const cfg = block.config as { style: "solid" | "dashed"; color?: string; thickness?: number }
      return (
        <hr
          style={{
            borderStyle: cfg.style,
            borderColor: cfg.color || "#d1d5db",
            borderTopWidth: cfg.thickness ?? 1,
          }}
        />
      )
    }
    case "signature": {
      const cfg = block.config as {
        align: BlockAlign; size: "small" | "medium" | "large"; show_name: boolean; show_title: boolean; ink_color?: string
      }
      const alignClass = cfg.align === "center" ? "mx-auto items-center text-center" : cfg.align === "right" ? "ml-auto items-end text-right" : "items-start text-left"
      const sizeClass = cfg.size === "small" ? "text-lg" : cfg.size === "large" ? "text-4xl" : "text-2xl"
      const ink = cfg.ink_color || "#111111"
      return (
        <div className={`flex w-fit flex-col ${alignClass}`}>
          <p className="mb-1 text-[10px] font-medium text-black/50">Signature</p>
          <p className={`italic ${sizeClass}`} style={{ fontFamily: "'Brush Script MT', cursive", color: ink }}>
            {documentData.signature.name.split(" ")[0] || "…"}
          </p>
          <div className="mt-1 w-40 border-t" style={{ borderColor: ink, opacity: 0.3 }} />
          {cfg.show_name && (
            <EditableText
              as="p"
              editable={editable}
              singleLine
              value={documentData.signature.name}
              onCommit={(text) => onUpdateSignature({ name: text })}
              className="mt-1 text-[11px] font-medium text-black"
            />
          )}
          {cfg.show_title && (
            <EditableText
              as="p"
              editable={editable}
              singleLine
              value={documentData.signature.org}
              onCommit={(text) => onUpdateSignature({ org: text })}
              className="text-[10px] text-black/50"
            />
          )}
        </div>
      )
    }
    default:
      return null
  }
}

// ─── Properties panel atoms ────────────────────────────────────────────── //
function PropField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function AlignButtons({ value, onChange }: { value: BlockAlign; onChange: (v: BlockAlign) => void }) {
  const options: { value: BlockAlign; icon: string }[] = [
    { value: "left", icon: "⯇" },
    { value: "center", icon: "⯃" },
    { value: "right", icon: "⯈" },
  ]
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex h-8 flex-1 items-center justify-center rounded-lg border text-[11px] font-medium transition-colors ${
            value === opt.value
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          {opt.value === "left" ? "Gauche" : opt.value === "center" ? "Centre" : "Droite"}
        </button>
      ))}
    </div>
  )
}

function ColorPickerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <PropField label={label}>
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border">
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
          className="h-8 flex-1 rounded-lg border border-border bg-background px-2.5 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none"
        />
      </div>
    </PropField>
  )
}

function SizeButtons({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { value: "small", label: "Petit" },
    { value: "medium", label: "Moyen" },
    { value: "large", label: "Grand" },
  ]
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex h-8 flex-1 items-center justify-center rounded-lg border text-[11px] font-medium transition-colors ${
            value === opt.value
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ImageUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
        onClick={() => inputRef.current?.click()}
        className={`relative flex min-h-[64px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-border hover:bg-muted/20"
        }`}
      >
        {value ? (
          <div className="flex w-full items-center gap-2 px-2.5 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-9 max-w-[80px] rounded object-contain" />
            <p className="flex-1 truncate text-[11px] text-muted-foreground">Image importée</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange("") }}
              className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash className="h-3.5 w-3.5" weight="bold" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-3 text-muted-foreground">
            <CloudArrowUp className={`h-4 w-4 ${isDragging ? "text-primary" : ""}`} weight="bold" />
            <p className="text-[10px] font-medium">Glisser ou cliquer pour importer</p>
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

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-foreground">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="h-5 w-9 data-[state=checked]:bg-primary data-[state=unchecked]:bg-border [&>span]:h-4 [&>span]:w-4 [&>span]:bg-white [&>span]:data-[state=checked]:translate-x-4"
      />
    </div>
  )
}

function BlockProperties({
  block, onChange, onDelete, onDuplicate,
}: {
  block: PdfBlock
  onChange: (patch: Record<string, unknown>) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const label = BLOCK_LIBRARY.find((b) => b.type === block.type)?.label ?? block.type

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onDuplicate} title="Dupliquer" className="text-muted-foreground transition-colors hover:text-foreground">
            <Copy className="h-4 w-4" weight="regular" />
          </button>
          <button type="button" onClick={onDelete} title="Supprimer" className="text-muted-foreground transition-colors hover:text-destructive">
            <Trash className="h-4 w-4" weight="regular" />
          </button>
        </div>
      </div>

      {block.type === "title" && (
        <>
          <PropField label="Texte">
            <input
              value={(block.config.text as string) ?? ""}
              onChange={(e) => onChange({ text: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </PropField>
          <PropField label="Alignement">
            <AlignButtons value={(block.config.align as BlockAlign) ?? "left"} onChange={(v) => onChange({ align: v })} />
          </PropField>
          <PropField label="Taille">
            <SizeButtons value={(block.config.size as string) ?? "large"} onChange={(v) => onChange({ size: v })} />
          </PropField>
          <ColorPickerField label="Couleur" value={(block.config.color as string) ?? "#111111"} onChange={(v) => onChange({ color: v })} />
          <div className="rounded-xl border border-border/60 px-3">
            <ToggleField
              label="Afficher n° et dates"
              checked={Boolean(block.config.show_doc_info)}
              onChange={(v) => onChange({ show_doc_info: v })}
            />
          </div>
        </>
      )}

      {block.type === "text" && (
        <>
          <PropField label="Contenu">
            <textarea
              value={(block.config.text as string) ?? ""}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </PropField>
          <PropField label="Alignement">
            <AlignButtons value={(block.config.align as BlockAlign) ?? "left"} onChange={(v) => onChange({ align: v })} />
          </PropField>
          <PropField label="Taille">
            <SizeButtons value={(block.config.size as string) ?? "medium"} onChange={(v) => onChange({ size: v })} />
          </PropField>
          <ColorPickerField label="Couleur" value={(block.config.color as string) ?? "#333333"} onChange={(v) => onChange({ color: v })} />
        </>
      )}

      {block.type === "field" && (
        <>
          <PropField label="Libellé">
            <input
              value={(block.config.label as string) ?? ""}
              onChange={(e) => onChange({ label: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </PropField>
          <PropField label="Valeur">
            <input
              value={(block.config.value as string) ?? ""}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="Laisser vide pour une ligne à remplir manuellement"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </PropField>
          <PropField label="Style">
            <div className="flex gap-1.5">
              {([{ v: "line", l: "Ligne à remplir" }, { v: "boxed", l: "Valeur encadrée" }] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => onChange({ style: opt.v })}
                  className={`flex h-8 flex-1 items-center justify-center rounded-lg border px-1.5 text-[11px] font-medium transition-colors ${
                    (block.config.style ?? "line") === opt.v
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </PropField>
          <ColorPickerField
            label="Couleur du libellé"
            value={(block.config.accent_color as string) ?? "#111111"}
            onChange={(v) => onChange({ accent_color: v })}
          />
        </>
      )}

      {block.type === "list" && (
        <>
          <PropField label="Points de la liste">
            <div className="space-y-1.5 rounded-xl border border-border/60 p-2">
              {((block.config.items as string[]) ?? []).map((item, i) => {
                const items = (block.config.items as string[]) ?? []
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={item}
                      onChange={(e) => onChange({ items: items.map((it, idx) => (idx === i ? e.target.value : it)) })}
                      className="h-8 flex-1 rounded-lg border border-border bg-background px-2.5 text-[12px] text-foreground focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash className="h-3.5 w-3.5" weight="regular" />
                    </button>
                  </div>
                )
              })}
              <button
                type="button"
                onClick={() => onChange({ items: [...((block.config.items as string[]) ?? []), "Nouveau point"] })}
                className="flex h-8 w-full items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <Plus className="h-3 w-3" weight="bold" />
                Ajouter un point
              </button>
            </div>
          </PropField>
          <PropField label="Style de puce">
            <div className="flex gap-1.5">
              {([{ v: "bullet", l: "• Puces" }, { v: "number", l: "1. Numéros" }, { v: "dash", l: "– Tirets" }] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => onChange({ style: opt.v })}
                  className={`flex h-8 flex-1 items-center justify-center rounded-lg border px-1 text-[11px] font-medium transition-colors ${
                    (block.config.style ?? "bullet") === opt.v
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </PropField>
          <ColorPickerField label="Couleur du texte" value={(block.config.color as string) ?? "#333333"} onChange={(v) => onChange({ color: v })} />
        </>
      )}

      {block.type === "section_header" && (
        <>
          <PropField label="Texte du bandeau">
            <input
              value={(block.config.text as string) ?? ""}
              onChange={(e) => onChange({ text: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </PropField>
          <PropField label="Alignement">
            <AlignButtons value={(block.config.align as BlockAlign) ?? "left"} onChange={(v) => onChange({ align: v })} />
          </PropField>
          <ColorPickerField label="Couleur de fond" value={(block.config.bg_color as string) ?? "#f3f4f6"} onChange={(v) => onChange({ bg_color: v })} />
          <ColorPickerField label="Couleur du texte" value={(block.config.text_color as string) ?? "#111111"} onChange={(v) => onChange({ text_color: v })} />
        </>
      )}

      {block.type === "customer_information" && (
        <>
          <PropField label="Titre de la section">
            <input
              value={(block.config.title as string) ?? "Informations client"}
              onChange={(e) => onChange({ title: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </PropField>
          <div className="divide-y divide-border/40 rounded-xl border border-border/60 px-3">
            <ToggleField label="Afficher l'entreprise" checked={Boolean(block.config.show_company)} onChange={(v) => onChange({ show_company: v })} />
            <ToggleField label="Afficher le contact" checked={Boolean(block.config.show_contact)} onChange={(v) => onChange({ show_contact: v })} />
            <ToggleField label="Afficher l'adresse" checked={Boolean(block.config.show_address)} onChange={(v) => onChange({ show_address: v })} />
          </div>
          <ColorPickerField
            label="Couleur d'accent"
            value={(block.config.accent_color as string) ?? "#111111"}
            onChange={(v) => onChange({ accent_color: v })}
          />
        </>
      )}

      {block.type === "price_table" && (
        <>
          <PropField label="Titre de la section">
            <input
              value={(block.config.title as string) ?? "Prestation proposée"}
              onChange={(e) => onChange({ title: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </PropField>
          <PropField label="Colonnes affichées">
            <div className="space-y-1 rounded-xl border border-border/60 px-3 py-1">
              {PRICE_TABLE_COLUMNS.map((col) => {
                const columns = (block.config.columns as string[]) ?? []
                const checked = columns.includes(col.value)
                return (
                  <label key={col.value} className="flex items-center justify-between py-1.5 text-[12px] text-foreground">
                    {col.label}
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...columns, col.value]
                          : columns.filter((c) => c !== col.value)
                        onChange({ columns: next })
                      }}
                      className="accent-primary"
                    />
                  </label>
                )
              })}
            </div>
          </PropField>
          <ColorPickerField
            label="Couleur d'en-tête"
            value={(block.config.header_bg as string) ?? "#f3f4f6"}
            onChange={(v) => onChange({ header_bg: v })}
          />
          <div className="divide-y divide-border/40 rounded-xl border border-border/60 px-3">
            <ToggleField label="Lignes alternées" checked={Boolean(block.config.zebra)} onChange={(v) => onChange({ zebra: v })} />
            <ToggleField label="Afficher les bordures" checked={block.config.show_border !== false} onChange={(v) => onChange({ show_border: v })} />
          </div>
        </>
      )}

      {block.type === "total" && (
        <>
          <div className="divide-y divide-border/40 rounded-xl border border-border/60 px-3">
            <ToggleField label="Afficher le sous-total" checked={Boolean(block.config.show_subtotal)} onChange={(v) => onChange({ show_subtotal: v })} />
            <ToggleField label="Afficher la TVA" checked={Boolean(block.config.show_tax)} onChange={(v) => onChange({ show_tax: v })} />
          </div>
          {Boolean(block.config.show_tax) && (
            <PropField label="Taux TVA (%)">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={(block.config.tax_rate as number) ?? 0}
                onChange={(e) => onChange({ tax_rate: parseFloat(e.target.value) || 0 })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </PropField>
          )}
          <ColorPickerField
            label="Couleur d'accent"
            value={(block.config.accent_color as string) ?? "#111111"}
            onChange={(v) => onChange({ accent_color: v })}
          />
        </>
      )}

      {block.type === "image" && (
        <>
          <PropField label="Image">
            <ImageUploader value={(block.config.url as string) ?? ""} onChange={(v) => onChange({ url: v })} />
          </PropField>
          <PropField label="Ou URL externe">
            <input
              value={(block.config.url as string)?.startsWith("data:") ? "" : (block.config.url as string) ?? ""}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://…"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </PropField>
          <PropField label="Alignement">
            <AlignButtons value={(block.config.align as BlockAlign) ?? "left"} onChange={(v) => onChange({ align: v })} />
          </PropField>
          <PropField label="Taille">
            <SizeButtons value={(block.config.size as string) ?? "medium"} onChange={(v) => onChange({ size: v })} />
          </PropField>
        </>
      )}

      {block.type === "separator" && (
        <>
          <PropField label="Style">
            <div className="flex gap-1.5">
              {(["solid", "dashed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ style: s })}
                  className={`flex h-8 flex-1 items-center justify-center rounded-lg border text-[11px] font-medium capitalize transition-colors ${
                    block.config.style === s
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {s === "solid" ? "Continu" : "Pointillé"}
                </button>
              ))}
            </div>
          </PropField>
          <PropField label="Épaisseur (px)">
            <input
              type="number"
              min={1}
              max={8}
              value={(block.config.thickness as number) ?? 1}
              onChange={(e) => onChange({ thickness: parseInt(e.target.value, 10) || 1 })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </PropField>
          <ColorPickerField label="Couleur" value={(block.config.color as string) ?? "#d1d5db"} onChange={(v) => onChange({ color: v })} />
        </>
      )}

      {block.type === "signature" && (
        <>
          <PropField label="Alignement">
            <AlignButtons value={(block.config.align as BlockAlign) ?? "center"} onChange={(v) => onChange({ align: v })} />
          </PropField>
          <PropField label="Taille">
            <select
              value={(block.config.size as string) ?? "medium"}
              onChange={(e) => onChange({ size: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="small">Petite</option>
              <option value="medium">Moyenne</option>
              <option value="large">Grande</option>
            </select>
          </PropField>
          <div className="divide-y divide-border/40 rounded-xl border border-border/60 px-3">
            <ToggleField label="Afficher le nom" checked={Boolean(block.config.show_name)} onChange={(v) => onChange({ show_name: v })} />
            <ToggleField label="Afficher le titre" checked={Boolean(block.config.show_title)} onChange={(v) => onChange({ show_title: v })} />
          </div>
          <ColorPickerField
            label="Couleur de l'encre"
            value={(block.config.ink_color as string) ?? "#111111"}
            onChange={(v) => onChange({ ink_color: v })}
          />
        </>
      )}
    </div>
  )
}
