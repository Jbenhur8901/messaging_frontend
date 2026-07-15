"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { automationsService, handleApiError } from "@/services"
import type { Automation, AutomationEnrollment, EnrollmentStatus } from "@/services/automations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, XCircle, RefreshCw } from "lucide-react"
import { ProGate } from "@/components/ui/pro-gate"

const STATUS_BADGE: Record<EnrollmentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Actif", variant: "secondary" },
  waiting: { label: "En attente", variant: "outline" },
  completed: { label: "Complété", variant: "default" },
  exited: { label: "Sorti", variant: "outline" },
  failed: { label: "Échec", variant: "destructive" },
}

const limit = 50

function EnrollmentsPageContent() {
  const { id } = useParams<{ id: string }>()
  const [automation, setAutomation] = useState<Automation | null>(null)
  const [enrollments, setEnrollments] = useState<AutomationEnrollment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    automationsService.getAutomation(id)
      .then(setAutomation)
      .catch(() => {})
  }, [id])

  async function load(pg = 0, sf = statusFilter) {
    setLoading(true)
    try {
      const res = await automationsService.listEnrollments(id, {
        status: sf || undefined,
        limit,
        offset: pg * limit,
      })
      setEnrollments(res.enrollments)
      setTotal(res.pagination.total)
      setPage(pg)
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(0) }, [id])

  async function handleStatusFilter(v: string) {
    setStatusFilter(v)
    await load(0, v)
  }

  async function handleCancel() {
    if (!cancelId) return
    setCancelling(true)
    try {
      await automationsService.cancelEnrollment(id, cancelId)
      setEnrollments((prev) =>
        prev.map((e) => (e.id === cancelId ? { ...e, status: "exited" as EnrollmentStatus } : e))
      )
      toast.success("Enrollment annulé")
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setCancelling(false)
      setCancelId(null)
    }
  }

  function contactName(e: AutomationEnrollment) {
    const c = e.contacts
    if (!c) return e.contact_id.slice(0, 8) + "…"
    return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.phone_number
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link href="/automations"><ArrowLeft className="size-4" />Automations</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">
          {automation?.name ?? "—"} — Enrollments
        </h1>
      </div>

      {/* Stats */}
      {automation && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Inscrits", value: automation.total_enrolled },
            { label: "Complétés", value: automation.total_completed },
            { label: "Sortis", value: automation.total_exited },
          ].map((s) => (
            <div key={s.label} className="border border-border/60 rounded-2xl bg-card p-4">
              <p className="text-2xl font-bold tabular-nums">{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="waiting">En attente</SelectItem>
            <SelectItem value="completed">Complété</SelectItem>
            <SelectItem value="exited">Sorti</SelectItem>
            <SelectItem value="failed">Échec</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => load(page)}>
          <RefreshCw className="size-3.5" />
          Actualiser
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">{total.toLocaleString()} enrollment{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border/60 rounded-2xl">
          Aucun enrollment{statusFilter ? ` avec le statut "${statusFilter}"` : ""}.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Étape</TableHead>
                <TableHead>Prochaine action</TableHead>
                <TableHead>Via</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e) => {
                const sb = STATUS_BADGE[e.status] ?? { label: e.status, variant: "outline" as const }
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{contactName(e)}</TableCell>
                    <TableCell>
                      <Badge variant={sb.variant} className="text-xs">{sb.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Étape {e.current_step_order}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.next_step_at
                        ? new Date(e.next_step_at).toLocaleString("fr-FR")
                        : e.status === "active" ? "Immédiate" : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{e.enrolled_via.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(e.enrolled_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      {(e.status === "active" || e.status === "waiting") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setCancelId(e.id)}
                        >
                          <XCircle className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>{total.toLocaleString()} total</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => load(page - 1)}>Précédent</Button>
              <span className="flex items-center px-2">Page {page + 1} / {Math.ceil(total / limit)}</span>
              <Button size="sm" variant="outline" disabled={(page + 1) * limit >= total || loading} onClick={() => load(page + 1)}>Suivant</Button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cet enrollment ?</AlertDialogTitle>
            <AlertDialogDescription>Le contact quittera la séquence. Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Fermer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Annulation…" : "Annuler l'enrollment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function EnrollmentsPage() {
  return <ProGate feature="Automatisations"><EnrollmentsPageContent /></ProGate>
}
