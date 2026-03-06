"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { contactsService, handleApiError } from "@/services"
import { getTrackedContactImportJobs, type TrackedContactImportJob } from "@/lib/contact-import-jobs"
import { useOrganizationStore } from "@/stores"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { ArrowLeft, RefreshCw } from "lucide-react"

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

export default function ExportationPage() {
  const { currentOrganization } = useOrganizationStore()
  const [jobs, setJobs] = useState<TrackedContactImportJob[]>([])
  const [statuses, setStatuses] = useState<Record<string, ImportStatus>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadTrackedJobs = useCallback(() => {
    setJobs(getTrackedContactImportJobs(currentOrganization?.id))
  }, [currentOrganization?.id])

  const refreshStatuses = useCallback(async () => {
    if (jobs.length === 0) return
    setIsRefreshing(true)
    try {
      const results = await Promise.all(
        jobs.map(async (job) => {
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
  }, [jobs])

  useEffect(() => {
    loadTrackedJobs()
  }, [loadTrackedJobs])

  useEffect(() => {
    if (jobs.length === 0) return
    void refreshStatuses()
    const timer = setInterval(() => {
      void refreshStatuses()
    }, 3000)
    return () => clearInterval(timer)
  }, [jobs, refreshStatuses])

  const rows = useMemo(
    () =>
      jobs.map((job) => {
        const status = statuses[job.import_id]
        return {
          ...job,
          status: status?.status || "queued",
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
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
        <Button
          variant="outline"
          className="h-8 text-[13px] rounded-lg gap-1.5"
          onClick={() => {
            loadTrackedJobs()
            void refreshStatuses()
            toast.success("Liste actualisée")
          }}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border/40 p-6 text-center">
          <p className="text-[13px] font-medium">Aucun job d&apos;importation</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Lancez un import CSV pour voir la liste ici.
          </p>
          <Link href="/contacts/import">
            <Button className="h-8 text-[13px] rounded-lg mt-4">Importer des contacts</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border/40 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Import ID</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>total</TableHead>
                <TableHead>processed</TableHead>
                <TableHead>imported_count</TableHead>
                <TableHead>updated_count</TableHead>
                <TableHead>skipped_count</TableHead>
                <TableHead>failed_count</TableHead>
                <TableHead>Erreur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.import_id}>
                  <TableCell className="font-mono text-[12px]">{row.import_id}</TableCell>
                  <TableCell className="text-[12px]">{formatDateTime(row.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(row.status)} className="text-[10px] h-5">
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12px]">{formatCount(row.total)}</TableCell>
                  <TableCell className="text-[12px]">{formatCount(row.processed)}</TableCell>
                  <TableCell className="text-[12px]">{formatCount(row.imported_count)}</TableCell>
                  <TableCell className="text-[12px]">{formatCount(row.updated_count)}</TableCell>
                  <TableCell className="text-[12px]">{formatCount(row.skipped_count)}</TableCell>
                  <TableCell className="text-[12px]">{formatCount(row.failed_count)}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-[12px] text-destructive">
                    {row.error || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
