"use client"

import { useEffect, useState, useCallback } from "react"
import { adminService } from "@/services/admin"
import { handleApiError } from "@/services"
import type { AICreditRequest, CreditRequestStatus } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  FileImage,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatNumber = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n)

const statusLabels: Record<CreditRequestStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
  cancelled: "Annulée",
}

const statusVariants: Record<CreditRequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Espèces",
  airtel_money: "Airtel Money",
  mobile_money: "Mobile Money",
  bank_transfer: "Virement bancaire",
}

const PAGE_LIMIT = 50

export default function AdminAICreditRequestsPage() {
  const [requests, setRequests] = useState<AICreditRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<CreditRequestStatus | "all">("pending")
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)

  // Action dialog
  const [selectedRequest, setSelectedRequest] = useState<AICreditRequest | null>(null)
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  const [note, setNote] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Detail dialog
  const [detailRequest, setDetailRequest] = useState<AICreditRequest | null>(null)

  const loadRequests = useCallback(async (newOffset = 0) => {
    setIsLoading(true)
    try {
      const data = await adminService.getAICreditRequests(
        statusFilter === "all" ? undefined : statusFilter,
        PAGE_LIMIT,
        newOffset
      )
      setRequests(data.requests || [])
      setTotal(data.pagination?.total || 0)
      setOffset(newOffset)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadRequests(0)
  }, [loadRequests])

  const handleAction = async () => {
    if (!selectedRequest || !action) return

    if (action === "approve" && !selectedRequest.payment_proof_url) {
      toast.error("Impossible d'approuver sans preuve de paiement")
      return
    }

    if (action === "reject" && note.trim().length < 5) {
      toast.error("Le motif doit contenir au moins 5 caractères")
      return
    }

    setIsProcessing(true)
    try {
      if (action === "approve") {
        const result = await adminService.approveAICreditRequest(selectedRequest.id, note || undefined)
        toast.success(`Demande approuvée — ${formatNumber(result.credits_added)} crédits ajoutés (nouveau solde : ${formatNumber(result.new_balance)})`)
      } else {
        await adminService.rejectAICreditRequest(selectedRequest.id, note)
        toast.success("Demande rejetée")
      }
      setSelectedRequest(null)
      setAction(null)
      setNote("")
      loadRequests(offset)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const openActionDialog = (request: AICreditRequest, actionType: "approve" | "reject") => {
    setSelectedRequest(request)
    setAction(actionType)
    setNote("")
  }

  if (isLoading && requests.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Demandes de crédits IA</h1>
          <p className="text-muted-foreground mt-1">
            Validez les demandes d&apos;achat de crédits IA des organisations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as CreditRequestStatus | "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvées</SelectItem>
              <SelectItem value="rejected">Rejetées</SelectItem>
              <SelectItem value="cancelled">Annulées</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <CardTitle>Demandes IA</CardTitle>
          </div>
          <CardDescription>
            {total} demande{total > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Aucune demande
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead>Crédits</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Preuve</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer"
                    onClick={() => setDetailRequest(request)}
                  >
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(request.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {request.organization_name || "—"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{request.requester_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{request.requester_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {request.package_code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(request.credits_amount)}
                    </TableCell>
                    <TableCell>
                      {formatNumber(request.total_price_fcfa)} FCFA
                    </TableCell>
                    <TableCell>
                      {paymentMethodLabels[request.payment_method] || request.payment_method}
                    </TableCell>
                    <TableCell>
                      {request.payment_proof_url ? (
                        <a
                          href={request.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileImage className="h-3 w-3" />
                          Voir
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[request.status]}>
                        {statusLabels[request.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="default"
                            disabled={!request.payment_proof_url}
                            title={!request.payment_proof_url ? "Preuve de paiement requise pour approuver" : undefined}
                            onClick={() => openActionDialog(request, "approve")}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openActionDialog(request, "reject")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {total > PAGE_LIMIT && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {offset + 1}–{Math.min(offset + PAGE_LIMIT, total)} sur {total}
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => loadRequests(Math.max(0, offset - PAGE_LIMIT))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={offset + PAGE_LIMIT >= total} onClick={() => loadRequests(offset + PAGE_LIMIT)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!action} onOpenChange={() => { setAction(null); setSelectedRequest(null); setNote(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approuver la demande" : "Rejeter la demande"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? `${formatNumber(selectedRequest?.credits_amount || 0)} crédits IA seront ajoutés au compte de l'organisation.`
                : "Veuillez indiquer le motif du rejet (min. 5 caractères)."}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Org :</span> {selectedRequest.organization_name}</p>
              <p><span className="text-muted-foreground">Pack :</span> {selectedRequest.package_code} — {formatNumber(selectedRequest.credits_amount)} crédits</p>
              <p><span className="text-muted-foreground">Montant :</span> {formatNumber(selectedRequest.total_price_fcfa)} FCFA</p>
              <p><span className="text-muted-foreground">Réf :</span> {selectedRequest.payment_reference || "—"}</p>
              {selectedRequest.payment_proof_url && (
                <a
                  href={selectedRequest.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <FileImage className="h-3.5 w-3.5" />
                  Voir la preuve de paiement
                </a>
              )}
            </div>
          )}
          <div className="space-y-2 py-2">
            <Label htmlFor="note">
              {action === "approve" ? "Note (optionnel)" : "Motif de rejet"}
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "approve"
                  ? "Paiement vérifié..."
                  : "Indiquez le motif du rejet..."
              }
              required={action === "reject"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAction(null); setSelectedRequest(null); setNote(""); }}>
              Annuler
            </Button>
            <Button
              onClick={handleAction}
              disabled={isProcessing}
              variant={action === "approve" ? "default" : "destructive"}
            >
              {isProcessing
                ? "Traitement..."
                : action === "approve"
                ? "Approuver"
                : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailRequest} onOpenChange={() => setDetailRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détail de la demande</DialogTitle>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Organisation</p>
                  <p className="font-medium">{detailRequest.organization_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Demandeur</p>
                  <p className="font-medium">{detailRequest.requester_name || detailRequest.requester_email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pack</p>
                  <p className="font-medium">{detailRequest.package_name || detailRequest.package_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Crédits</p>
                  <p className="font-medium">{formatNumber(detailRequest.credits_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Montant</p>
                  <p className="font-medium">{formatNumber(detailRequest.total_price_fcfa)} FCFA</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Paiement</p>
                  <p className="font-medium">{paymentMethodLabels[detailRequest.payment_method] || detailRequest.payment_method}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Référence</p>
                  <p className="font-mono">{detailRequest.payment_reference || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                  <p>{formatDate(detailRequest.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Statut</p>
                  <Badge variant={statusVariants[detailRequest.status]}>
                    {statusLabels[detailRequest.status]}
                  </Badge>
                </div>
              </div>
              {detailRequest.payment_proof_url && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Preuve de paiement</p>
                  <a
                    href={detailRequest.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <FileImage className="h-4 w-4" />
                    Ouvrir la preuve
                  </a>
                </div>
              )}
              {detailRequest.review_note && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Note de review</p>
                  <p className="text-sm">{detailRequest.review_note}</p>
                  {detailRequest.reviewed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Traité le {formatDate(detailRequest.reviewed_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
