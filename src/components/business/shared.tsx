"use client"

import type { ReactNode } from "react"
import { toast } from "sonner"
import { Icon, type IconName } from "@/lib/icons"
import { tLabel, useAppLanguage, formatAppNumber, formatAppDateTime, type SupportedLanguage } from "@/lib/app-language"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export const PAGE_SIZE = 20

export const SECTION_HEAD =
  "mb-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground"

export function fmt(amount: number, currency: string, language: SupportedLanguage = "fr") {
  return `${formatAppNumber(amount, language)} ${currency || "XOF"}`
}

export function fmtDateTime(value: string, language: SupportedLanguage = "fr") {
  if (!value) return "—"
  return formatAppDateTime(value, language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  })
}

export function apiErr(err: unknown, tx: (fr: string, en: string) => string): string {
  if (!(err instanceof Error)) return tx("Une erreur est survenue.", "An error occurred.")
  const m = err.message
  if (/409|already.exist|existe.d.j/i.test(m)) return tx("Ce nom existe déjà.", "This name already exists.")
  if (/413|too.large|trop.lourd/i.test(m)) return tx("Image trop lourde (max 5 Mo).", "Image too large (max 5 MB).")
  if (/400/.test(m)) return tx("Vérifiez les informations saisies.", "Please check the submitted information.")
  return m
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-[14px] bg-card px-5 py-4 shadow-md border border-border">
      <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  desc,
  onAdd,
  addLabel,
}: {
  icon: IconName
  title: string
  desc: string
  onAdd?: () => void
  addLabel?: string
}) {
  const { language } = useAppLanguage()
  return (
    <div className="rounded-[18px] bg-card px-6 py-16 text-center shadow-lg border border-border">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Icon name={icon} size={26} className="text-primary" />
      </div>
      <p className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-6 text-muted-foreground">{desc}</p>
      {onAdd ? (
        <Button onClick={onAdd} className="mt-5 rounded-xl px-4">
          + {addLabel ?? tLabel(language, { fr: "Ajouter", en: "Add" })}
        </Button>
      ) : null}
    </div>
  )
}

export function Pagination({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (p: number) => void
}) {
  const { language } = useAppLanguage()
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null

  const visible = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…")
      acc.push(p)
      return acc
    }, [])

  const btnBase =
    "inline-flex h-8 min-w-[32px] items-center justify-center rounded-[9px] border border-border px-2 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"

  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-[12.5px] text-muted-foreground">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{" "}
        {tLabel(language, { fr: "sur", en: "of" })} {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={cn(btnBase, "text-muted-foreground hover:bg-accent hover:text-foreground")}
          aria-label="Page précédente"
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
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
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
          className={cn(btnBase, "text-muted-foreground hover:bg-accent hover:text-foreground")}
          aria-label="Page suivante"
        >
          ›
        </button>
      </div>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold tracking-tight">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = true,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={danger ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" : ""}
          >
            {confirmLabel ?? "Confirmer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function Hint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ml-1.5 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          ?
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[200px] text-[12px] leading-relaxed">{text}</TooltipContent>
    </Tooltip>
  )
}

export function BulkBar({
  count,
  onDelete,
  onClear,
}: {
  count: number
  onDelete: () => void
  onClear: () => void
}) {
  const { language } = useAppLanguage()
  if (count === 0) return null
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-[14px] bg-warning/10 px-4 py-2.5 shadow-[0_6px_18px_-14px_rgba(146,64,14,0.35)]">
      <p className="text-[13.5px] font-semibold text-warning">
        {count} {tLabel(language, { fr: `sélectionné${count > 1 ? "s" : ""}`, en: "selected" })}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-warning">
          {tLabel(language, { fr: "Annuler", en: "Cancel" })}
        </Button>
        <Button
          size="sm"
          onClick={onDelete}
          className="h-7 gap-1.5 border border-red-500/30 bg-card text-red-400 hover:bg-red-500/10"
        >
          <Icon name="trash" size={12} />
          {tLabel(language, { fr: "Supprimer", en: "Delete" })}
        </Button>
      </div>
    </div>
  )
}

export function downloadCsv(rows: string[][], filename: string): void {
  const esc = (v: string) => (/[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const content = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n")
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function showApiToast(err: unknown, tx: (fr: string, en: string) => string) {
  toast.error(apiErr(err, tx))
}
