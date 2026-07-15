"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { segmentsService, handleApiError } from "@/services"
import type { Segment } from "@/services/segments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  Plus,
  Search,
  Funnel,
  Users,
  RefreshCw,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react"
import { ProGate } from "@/components/ui/pro-gate"

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await segmentsService.listSegments({ search: search || undefined, limit: 50 })
      setSegments(res.segments)
      setTotal(res.pagination.total)
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function handleRefreshCount(seg: Segment) {
    setRefreshingId(seg.id)
    try {
      const res = await segmentsService.refreshCount(seg.id)
      setSegments((prev) =>
        prev.map((s) => (s.id === seg.id ? { ...s, estimated_count: res.count, count_refreshed_at: res.refreshed_at } : s))
      )
      toast.success(`Segment mis à jour: ${res.count} contacts`)
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setRefreshingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await segmentsService.deleteSegment(deleteId)
      setSegments((prev) => prev.filter((s) => s.id !== deleteId))
      setTotal((t) => t - 1)
      toast.success("Segment supprimé")
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <ProGate feature="Segments">
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Funnel className="size-6 text-primary" />
            Segments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audiences dynamiques basées sur des règles — {total} segment{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/contacts/segments/new">
            <Plus className="size-4 mr-2" />
            Nouveau segment
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher un segment…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
            <Funnel className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Aucun segment</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Aucun résultat pour cette recherche." : "Créez votre premier segment pour cibler une audience."}
            </p>
          </div>
          {!search && (
            <Button asChild variant="outline">
              <Link href="/contacts/segments/new">
                <Plus className="size-4 mr-2" />
                Créer un segment
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="border border-border/60 rounded-2xl bg-card p-5 flex flex-col gap-3 hover:border-border transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{seg.name}</p>
                  {seg.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{seg.description}</p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 flex items-center gap-1">
                  <Users className="size-3" />
                  {seg.estimated_count != null ? seg.estimated_count.toLocaleString() : "—"}
                </Badge>
              </div>

              {seg.count_refreshed_at && (
                <p className="text-xs text-muted-foreground">
                  Mis à jour {new Date(seg.count_refreshed_at).toLocaleDateString("fr-FR")}
                </p>
              )}

              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/40">
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0"
                  title="Rafraîchir le compte"
                  disabled={refreshingId === seg.id}
                  onClick={() => handleRefreshCount(seg)}
                >
                  <RefreshCw className={`size-3.5 ${refreshingId === seg.id ? "animate-spin" : ""}`} />
                </Button>
                <Button size="sm" variant="ghost" className="size-8 p-0" title="Modifier" asChild>
                  <Link href={`/contacts/segments/${seg.id}`}>
                    <Pencil className="size-3.5" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0 text-destructive hover:text-destructive"
                  title="Supprimer"
                  onClick={() => setDeleteId(seg.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="ml-auto h-7 text-xs gap-1" asChild>
                  <Link href={`/contacts/segments/${seg.id}`}>
                    Voir
                    <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce segment ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action désactive le segment. Les contacts ne sont pas supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ProGate>
  )
}
