"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { contactsService, handleApiError } from "@/services"
import {
  clearTrackedContactImportJobs,
  getTrackedContactImportJobs,
  untrackContactImportJob,
  type TrackedContactImportJob,
} from "@/lib/contact-import-jobs"
import { useOrganizationStore } from "@/stores"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Clock3,
  LoaderCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react"

type ImportStatus = Awaited<ReturnType<typeof contactsService.getContactImportStatus>>

const formatCount = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "0"
  return String(value)
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("fr-FR")
}

const getStatusBadgeVariant = (status?: string) => {
  if (status === "completed") return "success"
  if (status === "failed") return "destructive"
  if (status === "processing") return "default"
  return "secondary"
}

const readCount = (
  status: ImportStatus | undefined,
  key: "imported" | "updated" | "skipped" | "failed"
): number | null | undefined => {
  if (!status) return null
  const countKey = `${key}_count` as "imported_count" | "updated_count" | "skipped_count" | "failed_count"
  return status[countKey] ?? status[key]
}

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

export default function ExportationPage() {
  const { currentOrganization } = useOrganizationStore()
  const [jobs, setJobs] = useState<TrackedContactImportJob[]>([])
  const [statuses, setStatuses] = useState<Record<string, ImportStatus>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadTrackedJobs = useCallback((): TrackedContactImportJob[] => {
    const tracked = getTrackedContactImportJobs(currentOrganization?.id)
    setJobs(tracked)
    return tracked
  }, [currentOrganization?.id])

  const handleDeleteJob = (importId: string) => {
    untrackContactImportJob(importId)
    setJobs((prev) => prev.filter((job) => job.import_id !== importId))
    setStatuses((prev) => {
      const next = { ...prev }
      delete next[importId]
      return next
    })
    toast.success("Job supprimé")
  }

  const handleClearJobs = () => {
    clearTrackedContactImportJobs(currentOrganization?.id)
    setJobs([])
    setStatuses({})
    toast.success("Jobs supprimés")
  }

  const refreshStatuses = useCallback(async (targetJobs: TrackedContactImportJob[]) => {
    if (targetJobs.length === 0) {
      setStatuses({})
      return
    }
    setIsRefreshing(true)
    try {
      const results = await Promise.all(
        targetJobs.map(async (job) => {
          try {
            const status = await contactsService.getContactImportStatus(job.import_id)
            return [job.import_id, status] as const
          } catch (error) {
            const apiError = handleApiError(error)
            const fallbackStatus: ImportStatus = {
              import_id: job.import_id,
              status: "failed",
              total: null,
              processed: null,
              imported: null,
              updated: null,
              skipped: null,
              failed: null,
              errors: [apiError.message],
            }
            return [
              job.import_id,
              fallbackStatus,
            ] as const
          }
        })
      )

      setStatuses((prev) => {
        const next = { ...prev }
        for (const [importId, status] of results) {
          next[importId] = status
        }
        return next
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const tracked = loadTrackedJobs()
    void refreshStatuses(tracked)
  }, [loadTrackedJobs, refreshStatuses])

  const rows = useMemo(
    () =>
      jobs.map((job) => {
        const status = statuses[job.import_id]
        return {
          ...job,
          status: status?.status,
          total: status?.total,
          processed: status?.processed,
          imported_count: readCount(status, "imported"),
          updated_count: readCount(status, "updated"),
          skipped_count: readCount(status, "skipped"),
          failed_count: readCount(status, "failed"),
          error:
            typeof status?.error === "string"
              ? status.error
              : Array.isArray(status?.errors) && status.errors.length > 0
                ? String(status.errors[0])
                : null,
        }
      }),
    [jobs, statuses]
  )

  const kpis = useMemo(() => {
    const total = rows.length
    const queued = rows.filter((row) => row.status === "queued").length
    const processing = rows.filter((row) => row.status === "processing").length
    const completed = rows.filter((row) => row.status === "completed").length
    const failed = rows.filter((row) => row.status === "failed").length
    return { total, queued, processing, completed, failed }
  }, [rows])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3" style={stagger(0)}>
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Exportation</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Suivi des jobs d&apos;importation et de leurs statuts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 text-[13px] rounded-lg gap-1.5"
            onClick={() => {
              const tracked = loadTrackedJobs()
              void refreshStatuses(tracked)
              toast.success("Liste actualisée")
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button
            variant="outline"
            className="h-8 text-[13px] rounded-lg gap-1.5 text-destructive hover:text-destructive"
            onClick={handleClearJobs}
            disabled={rows.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Vider
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={stagger(1)}>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total jobs</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-amber-700">
              <Clock3 className="h-3.5 w-3.5" />
              En file
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">{kpis.queued}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-blue-700">
              <LoaderCircle className="h-3.5 w-3.5" />
              En cours
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-blue-700">{kpis.processing}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terminés
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{kpis.completed}</p>
          </CardContent>
        </Card>
      </div>

      {kpis.failed > 0 && (
        <Card className="border-red-200 bg-red-50/50" style={stagger(2)}>
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-[13px] font-medium text-red-700">
              <XCircle className="h-4 w-4" />
              {kpis.failed} job{kpis.failed > 1 ? "s" : ""} en échec
            </p>
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border/40 p-6 text-center" style={stagger(3)}>
          <p className="text-[13px] font-medium">Aucun job d&apos;importation</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Lancez un import CSV pour voir la liste ici.
          </p>
          <Link href="/contacts/import">
            <Button className="h-8 text-[13px] rounded-lg mt-4">Importer des contacts</Button>
          </Link>
        </div>
      ) : (
        <Card className="border-border/40 overflow-hidden" style={stagger(3)}>
          <CardHeader className="pb-1.5 pt-3">
            <CardTitle className="text-[13px] font-medium">Historique des imports</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="h-8 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Créé le</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Statut</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Traités</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Importés</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Mis à jour</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Ignorés</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Échecs</TableHead>
                  <TableHead className="h-8 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Erreur</TableHead>
                  <TableHead className="h-8 px-3 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.import_id} className="h-9">
                    <TableCell className="px-3 py-2 text-[11px]">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell className="px-3 py-2">
                      <Badge variant={getStatusBadgeVariant(row.status)} className="h-4 px-1.5 text-[9px]">
                        {row.status || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-[11px] tabular-nums">{formatCount(row.total)}</TableCell>
                    <TableCell className="px-3 py-2 text-[11px] tabular-nums">{formatCount(row.processed)}</TableCell>
                    <TableCell className="px-3 py-2 text-[11px] tabular-nums">{formatCount(row.imported_count)}</TableCell>
                    <TableCell className="px-3 py-2 text-[11px] tabular-nums">{formatCount(row.updated_count)}</TableCell>
                    <TableCell className="px-3 py-2 text-[11px] tabular-nums">{formatCount(row.skipped_count)}</TableCell>
                    <TableCell className="px-3 py-2 text-[11px] tabular-nums">{formatCount(row.failed_count)}</TableCell>
                    <TableCell className="max-w-[220px] px-3 py-2 truncate text-[11px] text-destructive">
                      {row.error || "-"}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteJob(row.import_id)}
                        title="Supprimer le job"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
