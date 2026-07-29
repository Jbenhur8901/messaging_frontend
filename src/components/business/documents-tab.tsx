"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Clock,
  DotsThreeOutline,
  Download,
  Eye,
  File,
  FileText,
  Files,
  HardDrive,
  MagnifyingGlass,
  Paperclip,
  PaperPlaneTilt,
  Plus,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
} from "@phosphor-icons/react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table"
import {
  archiveBusinessDocument,
  deleteBusinessDocument,
  getActiveWorkspaceId,
  getBusinessDocumentDownloadUrl,
  getBusinessDocumentStats,
  getToken,
  listBusinessDocumentEvents,
  listBusinessDocuments,
} from "@/services/business"
import type {
  BusinessDocument,
  BusinessDocumentEvent,
  BusinessDocumentStats,
  BusinessDocumentType,
} from "@/types/business"
import { tLabel, useAppLanguage, type SupportedLanguage } from "@/lib/app-language"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  BulkBar,
  ConfirmDialog,
  EmptyState,
  PAGE_SIZE,
  fmt,
  fmtDateTime,
  showApiToast,
} from "@/components/business/shared"
import { biz } from "@/components/business/theme"

const TYPE_LABELS: Record<BusinessDocumentType, [string, string]> = {
  quote: ["Devis", "Quote"],
  invoice: ["Facture", "Invoice"],
  receipt: ["Reçu", "Receipt"],
  kyc: ["KYC", "KYC"],
  certificate: ["Attestation", "Certificate"],
  report: ["Rapport", "Report"],
  other: ["Autre", "Other"],
}

type StatFilter = "all" | "month" | "sent"

function formatStorage(bytes: number, language: SupportedLanguage): string {
  if (bytes <= 0) return language === "en" ? "0 MB" : "0 Mo"
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${Math.round(mb)} ${language === "en" ? "MB" : "Mo"}`
  const kb = bytes / 1024
  return `${Math.round(kb)} KB`
}

function fmtShortDate(value: string, language: SupportedLanguage): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(language === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function TypeIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0 text-muted-foreground"
  switch (type) {
    case "quote":
      return <FileText className={cls} weight="duotone" />
    case "invoice":
      return <Receipt className={cls} weight="duotone" />
    case "receipt":
      return <Paperclip className={cls} weight="duotone" />
    case "kyc":
      return <ShieldCheck className={cls} weight="duotone" />
    default:
      return <File className={cls} weight="duotone" />
  }
}

function documentTypeLabel(type: string, tx: (fr: string, en: string) => string) {
  const labels = TYPE_LABELS[type as BusinessDocumentType] ?? TYPE_LABELS.other
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-foreground">
      <TypeIcon type={type} />
      {tx(labels[0], labels[1])}
    </span>
  )
}

function statusBadge(status: string, tx: (fr: string, en: string) => string) {
  const map: Record<string, { label: [string, string]; cls: string }> = {
    draft: { label: ["Brouillon", "Draft"], cls: "bg-muted/80 text-muted-foreground" },
    generated: { label: ["Généré", "Generated"], cls: "bg-emerald-500/15 text-emerald-400" },
    sent: { label: ["Envoyé", "Sent"], cls: "bg-sky-500/15 text-sky-400" },
    viewed: { label: ["Consulté", "Viewed"], cls: "bg-cyan-500/15 text-cyan-400" },
    accepted: { label: ["Accepté", "Accepted"], cls: "bg-emerald-500/15 text-emerald-400" },
    refused: { label: ["Refusé", "Refused"], cls: "bg-red-500/15 text-red-400" },
    paid: { label: ["Payée", "Paid"], cls: "bg-emerald-500/15 text-emerald-400" },
    unpaid: { label: ["Impayée", "Unpaid"], cls: "bg-amber-500/15 text-amber-400" },
    completed: { label: ["Complété", "Completed"], cls: "bg-emerald-500/15 text-emerald-400" },
    pending_review: { label: ["À vérifier", "To review"], cls: "bg-amber-500/15 text-amber-400" },
    expired: { label: ["Expiré", "Expired"], cls: "bg-muted/80 text-muted-foreground" },
    cancelled: { label: ["Annulé", "Cancelled"], cls: "bg-red-500/15 text-red-400" },
    archived: { label: ["Archivé", "Archived"], cls: "bg-muted/80 text-muted-foreground" },
    error: { label: ["Erreur", "Error"], cls: "bg-red-500/15 text-red-400" },
    processing: { label: ["En cours", "Processing"], cls: "bg-amber-500/15 text-amber-400" },
  }
  const s = map[status] ?? { label: [status, status] as [string, string], cls: "bg-muted/80 text-muted-foreground" }
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-medium", s.cls)}>
      {tx(s.label[0], s.label[1])}
    </span>
  )
}

function eventLabel(eventType: string, tx: (fr: string, en: string) => string): string {
  const map: Record<string, [string, string]> = {
    generation_requested: ["Génération demandée", "Generation requested"],
    generation_completed: ["Génération terminée", "Generation completed"],
    generation_failed: ["Génération échouée", "Generation failed"],
    downloaded: ["Fichier téléchargé", "File downloaded"],
    sent: ["Document envoyé", "Document sent"],
    viewed: ["Document consulté", "Document viewed"],
    status_changed: ["Statut modifié", "Status changed"],
    archived: ["Document archivé", "Document archived"],
    deleted: ["Document supprimé", "Document deleted"],
  }
  const labels = map[eventType]
  return labels ? tx(labels[0], labels[1]) : eventType
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string; weight?: "duotone" | "regular" }>
  active?: boolean
  onClick?: () => void
}) {
  const Tag = onClick ? "button" : "div"
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors",
        onClick && "hover:bg-muted/40",
        active && "border-primary/40 bg-primary/5",
      )}
    >
      <div>
        <p className="text-[12px] text-muted-foreground">{label}</p>
        <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-foreground">{value}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
        <Icon className="h-5 w-5 text-muted-foreground" weight="duotone" />
      </div>
    </Tag>
  )
}

function DocumentsPagination({
  page,
  total,
  pageSize,
  onChange,
  tx,
}: {
  page: number
  total: number
  pageSize: number
  onChange: (p: number) => void
  tx: (fr: string, en: string) => string
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const visible = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…")
      acc.push(p)
      return acc
    }, [])

  const btnBase =
    "inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg border border-border px-2 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12.5px] text-muted-foreground">
        {start}–{end} {tx("sur", "of")} {total} {tx("documents", "documents")}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={cn(btnBase, "text-muted-foreground hover:bg-muted/50")}
          aria-label={tx("Page précédente", "Previous page")}
        >
          ‹
        </button>
        {visible.map((p, i) =>
          p === "…" ? (
            <span key={`el-${i}`} className="flex h-8 w-8 items-center justify-center text-[13px] text-muted-foreground/60">
              ···
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p as number)}
              className={cn(
                btnBase,
                p === page
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className={cn(btnBase, "text-muted-foreground hover:bg-muted/50")}
          aria-label={tx("Page suivante", "Next page")}
        >
          ›
        </button>
      </div>
    </div>
  )
}

export function DocumentsTab() {
  const router = useRouter()
  const { language } = useAppLanguage()
  const tx = useCallback((fr: string, en: string) => tLabel(language, { fr, en }), [language])

  const [documents, setDocuments] = useState<BusinessDocument[]>([])
  const [stats, setStats] = useState<BusinessDocumentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<BusinessDocumentType | "all">("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [agentFilter, setAgentFilter] = useState("all")
  const [statFilter, setStatFilter] = useState<StatFilter>("all")
  const [selectedDoc, setSelectedDoc] = useState<BusinessDocument | null>(null)
  const [events, setEvents] = useState<BusinessDocumentEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<BusinessDocument | null>(null)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })

  const loadDocuments = useCallback(async () => {
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    if (!token || !wsId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [docs, docStats] = await Promise.all([
        listBusinessDocuments(token, wsId, {
          limit: 500,
          page: 1,
          document_type: typeFilter,
          status: statusFilter !== "all" ? statusFilter : undefined,
          period: statFilter === "month" ? "month" : undefined,
          q: search.trim() || undefined,
        }),
        getBusinessDocumentStats(token, wsId),
      ])
      setDocuments(docs)
      setStats(docStats)
    } catch (err) {
      showApiToast(err, tx)
    } finally {
      setLoading(false)
    }
  }, [search, statFilter, statusFilter, typeFilter, tx])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [search, typeFilter, statusFilter, agentFilter, statFilter])

  useEffect(() => {
    if (!selectedDoc) {
      setEvents([])
      return
    }
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    if (!token || !wsId) return
    setEventsLoading(true)
    listBusinessDocumentEvents(token, wsId, selectedDoc.id)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false))
  }, [selectedDoc])

  const agentOptions = useMemo(() => {
    const names = new Set<string>()
    for (const doc of documents) {
      if (doc.agentName) names.add(doc.agentName)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [documents])

  const filtered = useMemo(() => {
    let list = documents
    if (statFilter === "sent") {
      list = list.filter((doc) => doc.status === "sent" || doc.sentAt)
    }
    if (typeFilter !== "all") {
      list = list.filter((doc) => doc.documentType === typeFilter)
    }
    if (statusFilter !== "all") {
      list = list.filter((doc) => doc.status === statusFilter)
    }
    if (agentFilter !== "all") {
      list = list.filter((doc) => doc.agentName === agentFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((doc) =>
        [doc.documentNumber, doc.name, doc.fileName, doc.customerName, doc.agentName]
          .some((v) => v?.toLowerCase().includes(q)),
      )
    }
    return list
  }, [agentFilter, documents, search, statFilter, statusFilter, typeFilter])

  async function handleDownload(doc: BusinessDocument) {
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    if (!token || !wsId) return
    try {
      const url =
        doc.downloadUrl ||
        doc.previewUrl ||
        (await getBusinessDocumentDownloadUrl(token, wsId, doc.id))
      if (!url) {
        toast.error(tx("Fichier indisponible.", "File unavailable."))
        return
      }
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      showApiToast(err, tx)
    }
  }

  async function handleSend(doc: BusinessDocument) {
    if (doc.conversationId) {
      router.push("/conversations")
      return
    }
    toast.info(tx("Envoi WhatsApp bientôt disponible.", "WhatsApp send coming soon."))
  }

  async function handleCopyLink(doc: BusinessDocument) {
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    if (!token || !wsId) return
    try {
      const url =
        doc.downloadUrl ||
        doc.previewUrl ||
        (await getBusinessDocumentDownloadUrl(token, wsId, doc.id))
      if (!url) {
        toast.error(tx("Lien indisponible.", "Link unavailable."))
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success(tx("Lien copié.", "Link copied."))
    } catch (err) {
      showApiToast(err, tx)
    }
  }

  async function handleArchive(doc: BusinessDocument) {
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    if (!token || !wsId) return
    try {
      const updated = await archiveBusinessDocument(token, wsId, doc.id)
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)))
      if (selectedDoc?.id === doc.id) setSelectedDoc(updated)
      toast.success(tx("Document archivé.", "Document archived."))
    } catch (err) {
      showApiToast(err, tx)
    }
  }

  async function handleDelete(doc: BusinessDocument) {
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    if (!token || !wsId) return
    setDeletingId(doc.id)
    try {
      await deleteBusinessDocument(token, wsId, doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      if (selectedDoc?.id === doc.id) setSelectedDoc(null)
      toast.success(tx("Document supprimé.", "Document deleted."))
    } catch (err) {
      showApiToast(err, tx)
    } finally {
      setDeletingId(null)
      setShowDeleteConfirm(null)
    }
  }

  async function confirmBulkDelete() {
    setShowBulkConfirm(false)
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    const ids = Object.entries(rowSelection).filter(([, v]) => v).map(([id]) => id)
    if (!token || !wsId || ids.length === 0) return
    try {
      await Promise.all(ids.map((id) => deleteBusinessDocument(token, wsId, id)))
      setDocuments((prev) => prev.filter((d) => !ids.includes(d.id)))
      setRowSelection({})
      toast.success(
        tx(
          `${ids.length} document${ids.length > 1 ? "s" : ""} supprimé${ids.length > 1 ? "s" : ""}.`,
          `${ids.length} document${ids.length > 1 ? "s" : ""} deleted.`,
        ),
      )
    } catch (err) {
      showApiToast(err, tx)
    }
  }

  const selectedCount = Object.values(rowSelection).filter(Boolean).length

  const columns: ColumnDef<BusinessDocument>[] = [
    {
      id: "select",
      header: ({ table: t }) => (
        <Checkbox
          checked={t.getIsAllPageRowsSelected() || (t.getIsSomePageRowsSelected() ? "indeterminate" : false)}
          onCheckedChange={(v) => t.toggleAllPageRowsSelected(!!v)}
          aria-label={tx("Tout sélectionner", "Select all")}
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label={tx("Sélectionner", "Select")}
          />
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "document",
      header: () => tx("Document", "Document"),
      cell: ({ row }) => (
        <button type="button" onClick={() => setSelectedDoc(row.original)} className="text-left">
          <p className="font-semibold text-foreground hover:text-primary">
            {row.original.documentNumber || `#${row.original.id.slice(0, 8)}`}
          </p>
          <p className="mt-0.5 max-w-[200px] truncate text-[12px] text-muted-foreground">
            {row.original.fileName || row.original.name}
          </p>
        </button>
      ),
    },
    {
      id: "documentType",
      header: () => tx("Type", "Type"),
      cell: ({ row }) => documentTypeLabel(row.original.documentType, tx),
    },
    {
      id: "customer",
      header: () => tx("Client", "Client"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-foreground">{row.original.customerName || "—"}</span>
      ),
    },
    {
      id: "amount",
      header: () => tx("Montant", "Amount"),
      cell: ({ row }) =>
        row.original.amount != null ? (
          <span className="font-medium text-foreground">
            {fmt(row.original.amount, row.original.currency || "XAF", language)}
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        ),
    },
    {
      id: "status",
      header: () => tx("Statut", "Status"),
      cell: ({ row }) => statusBadge(row.original.status, tx),
    },
    {
      id: "agent",
      header: () => tx("Agent", "Agent"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.original.agentName || "—"}</span>
      ),
    },
    {
      id: "createdAt",
      header: () => tx("Créé le", "Created"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground" suppressHydrationWarning>
          {fmtShortDate(row.original.generatedAt || row.original.createdAt, language)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <div
          className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedDoc(row.original)}
            aria-label={tx("Voir", "View")}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => void handleDownload(row.original)}
            aria-label={tx("Télécharger", "Download")}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => void handleSend(row.original)}
            aria-label={tx("Envoyer", "Send")}
          >
            <PaperPlaneTilt className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label={tx("Plus d'actions", "More actions")}
              >
                <DotsThreeOutline className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => void handleCopyLink(row.original)}>
                {tx("Copier le lien", "Copy link")}
              </DropdownMenuItem>
              {row.original.conversationId ? (
                <DropdownMenuItem asChild>
                  <Link href="/conversations">{tx("Voir la conversation", "View conversation")}</Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleArchive(row.original)}>
                {tx("Archiver", "Archive")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onClick={() => setShowDeleteConfirm(row.original)}
              >
                {tx("Supprimer", "Delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      enableSorting: false,
    },
  ]

  const table = useReactTable({
    data: filtered,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting, rowSelection, pagination },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection: true,
  })

  const selectClass =
    "h-9 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/15"

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-foreground">
            {tx("Documents", "Documents")}
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {tx(
              "Centralisez les documents générés par vos agents.",
              "Centralize documents generated by your agents.",
            )}
          </p>
        </div>
        <Button
          className={cn("h-10 gap-2 rounded-xl px-4 text-[13px] font-semibold", biz.btnPrimary)}
          onClick={() => router.push("/agents")}
        >
          <Plus className="h-4 w-4" weight="bold" />
          {tx("Nouveau document", "New document")}
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={tx("Tous", "All")}
          value={String(stats?.total ?? filtered.length)}
          icon={Files}
          active={statFilter === "all"}
          onClick={() => setStatFilter("all")}
        />
        <StatCard
          label={tx("Ce mois", "This month")}
          value={String(stats?.createdThisMonth ?? 0)}
          icon={Clock}
          active={statFilter === "month"}
          onClick={() => setStatFilter("month")}
        />
        <StatCard
          label={tx("Envoyés", "Sent")}
          value={String(stats?.sent ?? 0)}
          icon={PaperPlaneTilt}
          active={statFilter === "sent"}
          onClick={() => setStatFilter("sent")}
        />
        <StatCard
          label={tx("Espace utilisé", "Storage used")}
          value={formatStorage(stats?.storageUsedBytes ?? 0, language)}
          icon={HardDrive}
        />
      </div>

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tx(
              "Rechercher un document, un client ou un numéro…",
              "Search a document, client or number…",
            )}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as BusinessDocumentType | "all")}
            className={selectClass}
          >
            <option value="all">{tx("Tous les types", "All types")}</option>
            {(Object.keys(TYPE_LABELS) as BusinessDocumentType[]).map((key) => (
              <option key={key} value={key}>
                {tx(TYPE_LABELS[key][0], TYPE_LABELS[key][1])}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="all">{tx("Tous les statuts", "All statuses")}</option>
            <option value="draft">{tx("Brouillon", "Draft")}</option>
            <option value="generated">{tx("Généré", "Generated")}</option>
            <option value="sent">{tx("Envoyé", "Sent")}</option>
            <option value="paid">{tx("Payée", "Paid")}</option>
            <option value="completed">{tx("Complété", "Completed")}</option>
            <option value="archived">{tx("Archivé", "Archived")}</option>
          </select>
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className={selectClass}>
            <option value="all">{tx("Tous les agents", "All agents")}</option>
            {agentOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-lg border-border" aria-label={tx("Filtres", "Filters")}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BulkBar
        count={selectedCount}
        onDelete={() => setShowBulkConfirm(true)}
        onClear={() => setRowSelection({})}
      />

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-20 text-[14px] text-muted-foreground">
          {tx("Chargement…", "Loading…")}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="document"
          title={tx("Aucun document", "No documents")}
          desc={tx(
            "Les devis, factures, fiches KYC et autres PDF générés par vos agents apparaîtront ici.",
            "Quotes, invoices, KYC forms and other PDFs generated by your agents will appear here.",
          )}
        />
      ) : (
        <div className={cn("overflow-hidden", biz.card)}>
          <div className="hidden md:block">
            <Table className="text-[13.5px]">
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-b border-border hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="h-auto bg-card px-4 py-3 text-[11.5px] font-semibold normal-case tracking-wide text-muted-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    onClick={() => setSelectedDoc(row.original)}
                    className="group cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/30 data-[state=selected]:bg-primary/5"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 p-3 md:hidden">
            {table.getRowModel().rows.map((row) => {
              const doc = row.original
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-foreground">
                        {doc.documentNumber || `#${doc.id.slice(0, 8)}`}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {doc.fileName || doc.name}
                      </p>
                    </div>
                    {doc.amount != null ? (
                      <span className="shrink-0 text-[13px] font-semibold">
                        {fmt(doc.amount, doc.currency || "XAF", language)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {documentTypeLabel(doc.documentType, tx)}
                    {statusBadge(doc.status, tx)}
                  </div>
                </button>
              )
            })}
          </div>

          <DocumentsPagination
            page={table.getState().pagination.pageIndex + 1}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={(p) => table.setPageIndex(p - 1)}
            tx={tx}
          />
        </div>
      )}

      {selectedDoc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedDoc(null)}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {tx("Détail du document", "Document detail")}
                </p>
                <h3 className="mt-1 text-[18px] font-semibold text-foreground">{selectedDoc.name}</h3>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {selectedDoc.documentNumber || `#${selectedDoc.id.slice(0, 8)}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDoc(null)} aria-label={tx("Fermer", "Close")}>
                ×
              </Button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {documentTypeLabel(selectedDoc.documentType, tx)}
              {statusBadge(selectedDoc.status, tx)}
            </div>

            {(selectedDoc.previewUrl || selectedDoc.downloadUrl) ? (
              <div className="mb-4 overflow-hidden rounded-lg border border-border bg-muted/20">
                <iframe
                  title={selectedDoc.name}
                  src={selectedDoc.previewUrl || selectedDoc.downloadUrl || undefined}
                  className="h-[320px] w-full bg-white"
                />
              </div>
            ) : null}

            <div className="space-y-3 text-[13.5px]">
              <div className="grid gap-2 rounded-lg bg-muted/30 p-3">
                <DetailRow label={tx("Client", "Client")} value={selectedDoc.customerName || "—"} />
                <DetailRow label={tx("Agent", "Agent")} value={selectedDoc.agentName || "—"} />
                <DetailRow
                  label={tx("Montant", "Amount")}
                  value={
                    selectedDoc.amount != null
                      ? fmt(selectedDoc.amount, selectedDoc.currency || "XAF", language)
                      : "—"
                  }
                />
                <DetailRow
                  label={tx("Modèle", "Template")}
                  value={selectedDoc.templateName || selectedDoc.templateId || "—"}
                />
                <DetailRow
                  label={tx("Créé le", "Created")}
                  value={fmtDateTime(selectedDoc.generatedAt || selectedDoc.createdAt, language)}
                />
                <DetailRow
                  label={tx("Expire le", "Expires")}
                  value={selectedDoc.expiresAt ? fmtShortDate(selectedDoc.expiresAt, language) : "—"}
                />
                <DetailRow label={tx("Fichier", "File")} value={selectedDoc.fileName || "—"} />
              </div>

              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {tx("Historique", "History")}
                </p>
                {eventsLoading ? (
                  <p className="text-[13px] text-muted-foreground">{tx("Chargement…", "Loading…")}</p>
                ) : events.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">{tx("Aucun événement.", "No events.")}</p>
                ) : (
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                      >
                        <span className="text-foreground">{eventLabel(event.eventType, tx)}</span>
                        <span className="shrink-0 text-[12px] text-muted-foreground" suppressHydrationWarning>
                          {fmtShortDate(event.createdAt, language)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" className={biz.btnPrimary} onClick={() => void handleDownload(selectedDoc)}>
                  {tx("Télécharger", "Download")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleCopyLink(selectedDoc)}>
                  {tx("Copier le lien", "Copy link")}
                </Button>
                {selectedDoc.conversationId ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/conversations">{tx("Conversation", "Conversation")}</Link>
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => void handleArchive(selectedDoc)}>
                  {tx("Archiver", "Archive")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500"
                  onClick={() => setShowDeleteConfirm(selectedDoc)}
                >
                  {tx("Supprimer", "Delete")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <ConfirmDialog
          title={tx("Supprimer ce document ?", "Delete this document?")}
          message={tx(
            "Cette action est irréversible. Le fichier sera supprimé du registre.",
            "This action cannot be undone. The file will be removed from the registry.",
          )}
          confirmLabel={tx("Supprimer", "Delete")}
          onConfirm={() => void handleDelete(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      ) : null}

      {showBulkConfirm ? (
        <ConfirmDialog
          title={tx(
            `Supprimer ${selectedCount} document${selectedCount > 1 ? "s" : ""} ?`,
            `Delete ${selectedCount} document${selectedCount > 1 ? "s" : ""}?`,
          )}
          message={tx(
            "Ces documents seront définitivement supprimés du registre.",
            "These documents will be permanently removed from the registry.",
          )}
          confirmLabel={tx("Supprimer", "Delete")}
          onConfirm={() => void confirmBulkDelete()}
          onCancel={() => setShowBulkConfirm(false)}
        />
      ) : null}
    </>
  )
}
