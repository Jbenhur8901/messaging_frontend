"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Plus, FilePdf, User, Star, CheckCircle,
  PencilSimple, Trash, Spinner, ArrowRight,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { handleApiError } from "@/services/api"
import { pdfTemplatesService, type PdfTemplate } from "@/services/pdf-templates"
import { TemplateTypeDialog } from "./_components/template-type-dialog"

export default function DevisListPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params)

  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<PdfTemplate[]>([])
  const [orgDefault, setOrgDefault] = useState<PdfTemplate | null>(null)
  const [showTypeDialog, setShowTypeDialog] = useState(false)
  const [connectTarget, setConnectTarget] = useState<PdfTemplate | null>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PdfTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [{ templates: tpls }, defaultResp] = await Promise.all([
        pdfTemplatesService.listTemplates(agentId),
        pdfTemplatesService.getDefaultTemplate().catch(() => null),
      ])
      setTemplates(tpls)
      setOrgDefault(defaultResp?.data?.id ? defaultResp.data : null)
    } catch (err) {
      toast.error(handleApiError(err).message || "Erreur de chargement")
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  const handleConnect = async () => {
    if (!connectTarget) return
    setConnectingId(connectTarget.id)
    try {
      const updated = await pdfTemplatesService.updateTemplate(connectTarget.id, { is_default: true })
      setTemplates((prev) => prev.map((t) => ({ ...t, is_default: t.id === updated.id })))
      setOrgDefault(updated)
      toast.success("Modèle connecté à l'IA")
    } catch (err) {
      toast.error(handleApiError(err).message || "Erreur de connexion")
    } finally {
      setConnectingId(null)
      setConnectTarget(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await pdfTemplatesService.deleteTemplate(deleteTarget.id)
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      toast.success("Modèle supprimé")
    } catch {
      toast.error("Erreur suppression")
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link
              href={`/agents/${agentId}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" weight="bold" />
              Retour
            </Link>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FilePdf className="h-6 w-6 text-primary" weight="fill" />
            Modèles PDF
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {templates.length} modèle{templates.length !== 1 ? "s" : ""} — devis, factures, fiches KYC…
          </p>
        </div>
        <Button onClick={() => setShowTypeDialog(true)}>
          <Plus className="mr-2 h-4 w-4" weight="bold" />
          Nouveau modèle
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FilePdf className="h-8 w-8 text-muted-foreground" weight="regular" />
          </div>
          <div>
            <p className="font-medium">Aucun modèle</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez votre premier modèle pour générer des documents PDF depuis cet agent.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowTypeDialog(true)}>
            <Plus className="mr-2 h-4 w-4" weight="bold" />
            Créer un modèle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const isKyc = t.template_type === "kyc"
            const isConnected = t.is_default
            return (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-border"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-medium">{t.name}</p>
                      {isConnected && <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-500 text-yellow-500" weight="fill" />}
                    </div>
                    {t.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    {isKyc ? <User className="h-3 w-3" /> : <FilePdf className="h-3 w-3" />}
                    {isKyc ? "KYC" : "Document"}
                  </Badge>
                </div>

                {isConnected ? (
                  <Badge variant="success" className="w-fit text-[10px]">
                    <CheckCircle className="mr-1 h-3 w-3" weight="fill" />
                    Connecté à l&apos;IA
                  </Badge>
                ) : (
                  <p className="text-xs text-muted-foreground">Non connecté à l&apos;IA</p>
                )}

                <div className="mt-auto flex items-center gap-2 border-t border-border/40 pt-3">
                  <Switch
                    checked={isConnected}
                    disabled={isConnected || connectingId === t.id}
                    onCheckedChange={() => setConnectTarget(t)}
                    aria-label="Connecter à l'IA"
                  />
                  <span className="text-[11px] text-muted-foreground">Connecté à l&apos;IA</span>

                  <Button size="sm" variant="ghost" className="ml-auto h-8 w-8 p-0" title="Modifier" asChild>
                    <Link href={`/agents/${agentId}/devis/${t.id}`}>
                      <PencilSimple className="h-3.5 w-3.5" weight="bold" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Supprimer"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash className="h-3.5 w-3.5" weight="bold" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" asChild>
                    <Link href={`/agents/${agentId}/devis/${t.id}`}>
                      Voir
                      <ArrowRight className="h-3 w-3" weight="bold" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TemplateTypeDialog agentId={agentId} open={showTypeDialog} onOpenChange={setShowTypeDialog} />

      {/* Connect confirmation — warns about org-wide disconnect */}
      <AlertDialog open={!!connectTarget} onOpenChange={(o) => !o && setConnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Connecter « {connectTarget?.name} » à l&apos;IA ?</AlertDialogTitle>
            <AlertDialogDescription>
              {orgDefault && orgDefault.id !== connectTarget?.id
                ? `Le modèle actuellement connecté (« ${orgDefault.name} »), possiblement utilisé par un autre agent, sera déconnecté. Un seul modèle peut être connecté à la fois pour toute l'organisation.`
                : "Ce modèle deviendra celui utilisé par l'IA pour générer des PDF depuis n'importe quel agent de l'organisation."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!connectingId}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConnect} disabled={!!connectingId}>
              {connectingId ? <Spinner className="mr-1.5 h-3.5 w-3.5 animate-spin" weight="bold" /> : null}
              Connecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteTarget?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
