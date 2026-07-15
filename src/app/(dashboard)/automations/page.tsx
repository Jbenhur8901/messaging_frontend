"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { automationsService, handleApiError } from "@/services"
import type { Automation } from "@/services/automations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  CheckCircle,
  ArrowRight,
  Tag,
  Clock,
  Calendar,
} from "lucide-react"
import { ProGate } from "@/components/ui/pro-gate"

const TRIGGER_LABELS = {
  tag_added: { label: "Tag ajouté", icon: Tag },
  no_reply: { label: "Sans réponse", icon: Clock },
  scheduled: { label: "Planifié", icon: Calendar },
} as const

function AutomationsPageContent() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await automationsService.listAutomations({ limit: 50 })
      setAutomations(res.automations)
      setTotal(res.pagination.total)
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggle(auto: Automation) {
    setTogglingId(auto.id)
    try {
      if (auto.is_active) {
        await automationsService.deactivateAutomation(auto.id)
      } else {
        await automationsService.activateAutomation(auto.id)
      }
      setAutomations((prev) =>
        prev.map((a) => (a.id === auto.id ? { ...a, is_active: !a.is_active } : a))
      )
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await automationsService.deleteAutomation(deleteId)
      setAutomations((prev) => prev.filter((a) => a.id !== deleteId))
      setTotal((t) => t - 1)
      toast.success("Automation supprimée")
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Automatisations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Séquences déclenchées automatiquement — {total} automation{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/automations/new">
            <Plus className="size-4 mr-2" />
            Nouvelle automation
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="size-16 rounded-2xl bg-muted flex items-center justify-center text-2xl">⚡</div>
          <div>
            <p className="font-medium">Aucune automation</p>
            <p className="text-sm text-muted-foreground mt-1">
              Créez une séquence pour automatiser vos actions marketing.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/automations/new">
              <Plus className="size-4 mr-2" />
              Créer une automation
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => {
            const triggerMeta = TRIGGER_LABELS[auto.trigger_type]
            const TriggerIcon = triggerMeta.icon
            return (
              <div
                key={auto.id}
                className={`border rounded-2xl bg-card p-5 flex items-center gap-4 transition-colors ${
                  auto.is_active ? "border-border/60" : "border-border/30 opacity-70"
                }`}
              >
                {/* Trigger badge */}
                <div className="shrink-0 size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TriggerIcon className="size-5 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{auto.name}</p>
                    <Badge variant="outline" className="text-xs shrink-0">{triggerMeta.label}</Badge>
                    {auto.is_active && <Badge variant="secondary" className="text-xs shrink-0 text-green-600 bg-green-500/10">Actif</Badge>}
                  </div>
                  {auto.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{auto.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="size-3" />{auto.total_enrolled} inscrits</span>
                    <span className="flex items-center gap-1"><CheckCircle className="size-3" />{auto.total_completed} complétés</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <Switch
                    checked={auto.is_active}
                    disabled={togglingId === auto.id}
                    onCheckedChange={() => handleToggle(auto)}
                  />
                  <Button size="sm" variant="ghost" className="size-8 p-0" asChild>
                    <Link href={`/automations/${auto.id}`}><Pencil className="size-3.5" /></Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="size-8 p-0" asChild>
                    <Link href={`/automations/${auto.id}/enrollments`}><ArrowRight className="size-3.5" /></Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(auto.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette automation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les enrollments en cours seront annulés. Cette action est irréversible.
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
  )
}

export default function AutomationsPage() {
  return <ProGate feature="Automatisations"><AutomationsPageContent /></ProGate>
}
