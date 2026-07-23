"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type PaginationState,
} from "@tanstack/react-table"
import {
  deleteBusinessOperation,
  getActiveWorkspaceId,
  getToken,
  listBusinessOperations,
} from "@/services/business"
import type { BusinessOperation, BusinessOperationType } from "@/types/business"
import { tLabel, useAppLanguage } from "@/lib/app-language"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ConfirmDialog,
  EmptyState,
  PAGE_SIZE,
  Pagination,
  downloadCsv,
  fmt,
  fmtDateTime,
  showApiToast,
} from "@/components/business/shared"

const TYPE_LABELS: Record<BusinessOperationType, [string, string]> = {
  quote: ["Devis", "Quote"],
  form: ["Formulaire", "Form"],
  rtc: ["RTC", "RTC"],
  order: ["Commande", "Order"],
  invoice: ["Facture", "Invoice"],
  document: ["Document", "Document"],
  other: ["Autre", "Other"],
}

const TYPE_BADGE: Record<string, string> = {
  quote: "bg-primary/15 text-primary border-primary/20",
  form: "bg-emerald-500/15 text-emerald-400",
  rtc: "bg-purple-500/15 text-purple-400",
  order: "bg-orange-500/15 text-orange-400",
  invoice: "bg-blue-500/15 text-blue-400",
  document: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
}

function operationTypeBadge(type: string, tx: (fr: string, en: string) => string) {
  const labels = TYPE_LABELS[type as BusinessOperationType] ?? TYPE_LABELS.other
  return (
    <Badge variant="secondary" className={cn("border-0 text-[11px] font-medium", TYPE_BADGE[type] ?? TYPE_BADGE.other)}>
      {tx(labels[0], labels[1])}
    </Badge>
  )
}

function statusBadge(status: string, tx: (fr: string, en: string) => string) {
  const map: Record<string, { label: [string, string]; cls: string }> = {
    pending: { label: ["En attente", "Pending"], cls: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
    draft: { label: ["Brouillon", "Draft"], cls: "bg-muted text-muted-foreground border-border" },
    sent: { label: ["Envoyé", "Sent"], cls: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
    completed: { label: ["Terminé", "Completed"], cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
    cancelled: { label: ["Annulé", "Cancelled"], cls: "bg-red-500/15 text-red-400 border-red-500/25" },
    confirmed: { label: ["Confirmé", "Confirmed"], cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  }
  const s = map[status] ?? { label: [status, status] as [string, string], cls: "bg-muted text-muted-foreground border-border" }
  return (
    <Badge variant="outline" className={cn("text-[12px] font-medium", s.cls)}>
      {tx(s.label[0], s.label[1])}
    </Badge>
  )
}

const FILTER_TABS: { key: BusinessOperationType | "all"; label: [string, string] }[] = [
  { key: "all", label: ["Tous", "All"] },
  { key: "quote", label: ["Devis", "Quotes"] },
  { key: "form", label: ["Formulaires", "Forms"] },
  { key: "rtc", label: ["RTC", "RTC"] },
  { key: "document", label: ["Documents", "Documents"] },
  { key: "order", label: ["Commandes", "Orders"] },
]

export function OperationsTab() {
  const { language } = useAppLanguage()
  const tx = useCallback((fr: string, en: string) => tLabel(language, { fr, en }), [language])

  const [operations, setOperations] = useState<BusinessOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<BusinessOperationType | "all">("all")
  const [selectedOp, setSelectedOp] = useState<BusinessOperation | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })

  const loadOperations = useCallback(async () => {
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    if (!token || !wsId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await listBusinessOperations(token, wsId, {
        limit: 500,
        page: 1,
        type: typeFilter,
        q: search.trim() || undefined,
      })
      setOperations(data)
    } catch (err) {
      showApiToast(err, tx)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, tx])

  useEffect(() => {
    void loadOperations()
  }, [loadOperations])

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [search, typeFilter])

  const filtered = useMemo(() => {
    let list = operations
    if (typeFilter !== "all") {
      list = list.filter((op) => op.operationType === typeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((op) =>
        [op.reference, op.title, op.contactName, op.contactPhone, op.internalNote]
          .some((v) => v?.toLowerCase().includes(q)),
      )
    }
    return list
  }, [operations, search, typeFilter])

  function exportCsv() {
    const rows: string[][] = [[
      tx("Référence", "Reference"),
      tx("Type", "Type"),
      tx("Titre", "Title"),
      tx("Client", "Client"),
      tx("Téléphone", "Phone"),
      tx("Statut", "Status"),
      tx("Montant", "Amount"),
      tx("Devise", "Currency"),
      tx("Source", "Source"),
      tx("Créé le", "Created at"),
    ]]
    for (const op of filtered) {
      const typeLabel = TYPE_LABELS[op.operationType] ?? TYPE_LABELS.other
      rows.push([
        op.reference || "",
        tx(typeLabel[0], typeLabel[1]),
        op.title,
        op.contactName || "",
        op.contactPhone || "",
        op.status,
        op.amount != null ? String(op.amount) : "",
        op.currency || "",
        op.source || "",
        op.createdAt || "",
      ])
    }
    downloadCsv(rows, "operations-enregistrees.csv")
  }

  async function removeOperation(id: string) {
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    if (!token || !wsId) return
    setDeletingId(id)
    try {
      await deleteBusinessOperation(token, wsId, id)
      setOperations((prev) => prev.filter((op) => op.id !== id))
      if (selectedOp?.id === id) setSelectedOp(null)
      toast.success(tx("Opération supprimée.", "Operation deleted."))
    } catch (err) {
      showApiToast(err, tx)
    } finally {
      setDeletingId(null)
    }
  }

  async function confirmBulkDelete() {
    setShowBulkConfirm(false)
    const token = getToken()
    const wsId = getActiveWorkspaceId()
    const ids = Object.entries(rowSelection).filter(([, v]) => v).map(([id]) => id)
    if (!token || !wsId || ids.length === 0) return
    try {
      await Promise.all(ids.map((id) => deleteBusinessOperation(token, wsId, id)))
      setOperations((prev) => prev.filter((op) => !ids.includes(op.id)))
      setRowSelection({})
      toast.success(
        tx(
          `${ids.length} opération${ids.length > 1 ? "s" : ""} supprimée${ids.length > 1 ? "s" : ""}.`,
          `${ids.length} operation${ids.length > 1 ? "s" : ""} deleted.`,
        ),
      )
    } catch (err) {
      showApiToast(err, tx)
    }
  }

  const selectedCount = Object.values(rowSelection).filter(Boolean).length

  const columns: ColumnDef<BusinessOperation>[] = [
    {
      id: "select",
      header: ({ table: t }) => (
        <Checkbox
          checked={t.getIsAllPageRowsSelected() || (t.getIsSomePageRowsSelected() ? "indeterminate" : false)}
          onCheckedChange={(v) => t.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    },
    {
      id: "reference",
      accessorFn: (row) => row.reference || row.id,
      header: () => tx("Référence", "Reference"),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setSelectedOp(row.original)}
          className="font-medium text-foreground hover:text-primary"
        >
          {row.original.reference || `#${row.original.id.slice(0, 8)}`}
        </button>
      ),
    },
    {
      id: "operationType",
      accessorFn: (row) => row.operationType,
      header: () => tx("Type", "Type"),
      cell: ({ row }) => operationTypeBadge(row.original.operationType, tx),
    },
    {
      id: "title",
      accessorFn: (row) => row.title,
      header: () => tx("Titre", "Title"),
      cell: ({ row }) => (
        <span className="block max-w-[220px] truncate text-foreground" title={row.original.title}>
          {row.original.title}
        </span>
      ),
    },
    {
      id: "client",
      header: () => tx("Client", "Client"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.original.contactName || row.original.contactPhone || "—"}
        </span>
      ),
    },
    {
      id: "amount",
      accessorFn: (row) => row.amount ?? 0,
      header: () => tx("Montant", "Amount"),
      cell: ({ row }) =>
        row.original.amount != null ? (
          <span className="font-medium">{fmt(row.original.amount, row.original.currency || "XOF", language)}</span>
        ) : (
          <span className="text-muted-foreground/70">—</span>
        ),
    },
    {
      id: "status",
      header: () => tx("Statut", "Status"),
      cell: ({ row }) => statusBadge(row.original.status, tx),
    },
    {
      id: "source",
      header: () => tx("Source", "Source"),
      cell: ({ row }) => (
        <span className="text-[12px] text-muted-foreground">
          {row.original.source === "ai" || row.original.source === "whatsapp"
            ? tx("Agent IA", "AI agent")
            : row.original.source || "—"}
        </span>
      ),
    },
    {
      id: "createdAt",
      accessorFn: (row) => row.createdAt,
      header: () => tx("Créé le", "Created"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground" suppressHydrationWarning>
          {fmtDateTime(row.original.createdAt, language)}
        </span>
      ),
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

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-foreground">
            {tx("Opérations enregistrées", "Recorded operations")}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {tx(
              "Devis, formulaires et enregistrements générés par l'agent IA.",
              "Quotes, forms and records generated by the AI agent.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setShowBulkConfirm(true)} className="text-red-600">
              {tx(`Supprimer (${selectedCount})`, `Delete (${selectedCount})`)}
            </Button>
          ) : null}
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            {tx("Exporter", "Export")}
          </Button>
          <Button variant="outline" onClick={() => void loadOperations()}>
            {tx("Actualiser", "Refresh")}
          </Button>
        </div>
      </div>

      <div className="mb-3 relative">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tx(
            "Rechercher par référence, client, titre ou téléphone",
            "Search by reference, client, title or phone",
          )}
          className={cn("h-9 text-[13.5px]", search ? "border-primary" : "")}
        />
      </div>

      <div className="mb-3 overflow-x-auto">
        <div className="inline-flex min-w-max items-center gap-1 rounded-[14px] bg-card p-1 shadow-lg border border-border">
          {FILTER_TABS.map((tab) => {
            const active = typeFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTypeFilter(tab.key)}
                className={cn(
                  "rounded-[10px] px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {tx(tab.label[0], tab.label[1])}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[14px] text-muted-foreground">
          {tx("Chargement…", "Loading…")}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="invoice"
          title={tx("Aucune opération enregistrée", "No recorded operations")}
          desc={tx(
            "Les devis, formulaires et autres enregistrements créés par votre agent Duo apparaîtront ici automatiquement.",
            "Quotes, forms and other records created by your Duo agent will appear here automatically.",
          )}
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {table.getRowModel().rows.map((row) => {
              const op = row.original
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedOp(op)}
                  className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-foreground">
                        {op.reference || `#${op.id.slice(0, 8)}`}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{op.title}</p>
                    </div>
                    {op.amount != null ? (
                      <span className="shrink-0 text-[13px] font-semibold">
                        {fmt(op.amount, op.currency || "XOF", language)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {operationTypeBadge(op.operationType, tx)}
                    {statusBadge(op.status, tx)}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <Table className="text-[13.5px]" style={{ minWidth: 900 }}>
              <TableHeader className="bg-card">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-b border-border hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="h-auto px-4 py-2.5 text-[11.5px] font-semibold normal-case tracking-wide text-muted-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    onClick={() => setSelectedOp(row.original)}
                    className="cursor-pointer border-0 transition-colors hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3.5 text-[13.5px]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={table.getState().pagination.pageIndex + 1}
            total={filtered.length}
            onChange={(p) => table.setPageIndex(p - 1)}
          />
        </>
      )}

      {selectedOp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedOp(null)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {tx("Détail de l'opération", "Operation detail")}
                </p>
                <h3 className="mt-1 text-[18px] font-semibold text-foreground">{selectedOp.title}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedOp(null)} aria-label={tx("Fermer", "Close")}>
                ×
              </Button>
            </div>

            <div className="space-y-3 text-[13.5px]">
              <div className="flex flex-wrap gap-2">
                {operationTypeBadge(selectedOp.operationType, tx)}
                {statusBadge(selectedOp.status, tx)}
              </div>
              <div className="grid gap-2 rounded-lg bg-muted/30 p-3">
                <Row label={tx("Référence", "Reference")} value={selectedOp.reference || "—"} />
                <Row label={tx("Client", "Client")} value={selectedOp.contactName || "—"} />
                <Row label={tx("Téléphone", "Phone")} value={selectedOp.contactPhone || "—"} />
                <Row
                  label={tx("Montant", "Amount")}
                  value={
                    selectedOp.amount != null
                      ? fmt(selectedOp.amount, selectedOp.currency || "XOF", language)
                      : "—"
                  }
                />
                <Row label={tx("Source", "Source")} value={selectedOp.source || "—"} />
                <Row label={tx("Créé le", "Created")} value={fmtDateTime(selectedOp.createdAt, language)} />
              </div>
              {selectedOp.documentUrl ? (
                <a
                  href={selectedOp.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-[13px] font-medium text-primary hover:underline"
                >
                  {tx("Ouvrir le document", "Open document")}
                </a>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                className="text-red-600"
                disabled={deletingId === selectedOp.id}
                onClick={() => void removeOperation(selectedOp.id)}
              >
                {tx("Supprimer", "Delete")}
              </Button>
              <Button onClick={() => setSelectedOp(null)}>{tx("Fermer", "Close")}</Button>
            </div>
          </div>
        </div>
      ) : null}

      {showBulkConfirm ? (
        <ConfirmDialog
          title={tx(
            `Supprimer ${selectedCount} opération${selectedCount > 1 ? "s" : ""} ?`,
            `Delete ${selectedCount} operation${selectedCount > 1 ? "s" : ""}?`,
          )}
          message={tx(
            "Ces enregistrements seront définitivement supprimés.",
            "These records will be permanently deleted.",
          )}
          confirmLabel={tx("Supprimer", "Delete")}
          onConfirm={() => void confirmBulkDelete()}
          onCancel={() => setShowBulkConfirm(false)}
        />
      ) : null}
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
