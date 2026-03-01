"use client"

import { useEffect, useState } from "react"
import { useAdminStore } from "@/stores"
import type { CreditRequestStatus, PaymentMethod } from "@/types"
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
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  FileImage,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatNumber } from "@/lib/utils"

const statusLabels: Record<CreditRequestStatus, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  cancelled: "Annulé",
}

const statusVariants: Record<CreditRequestStatus, "default" | "secondary" | "destructive" | "outline" | "success"> = {
  pending: "secondary",
  approved: "success",
  rejected: "destructive",
  cancelled: "outline",
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Espèces",
  airtel_money: "Airtel Money",
  mobile_money: "Mobile Money",
  bank_transfer: "Virement bancaire",
}

export default function AdminCreditRequestsPage() {
  const {
    creditRequests,
    fetchCreditRequests,
    approveRequest,
    rejectRequest,
    isLoading,
    error,
    clearError,
  } = useAdminStore()

  const [statusFilter, setStatusFilter] = useState<CreditRequestStatus | "all">("pending")
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  const [note, setNote] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchCreditRequests(statusFilter === "all" ? undefined : statusFilter)
  }, [fetchCreditRequests, statusFilter])

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleAction = async () => {
    if (!selectedRequest || !action) return

    if (action === "reject" && !note.trim()) {
      toast.error("Le motif de rejet est requis")
      return
    }

    setIsProcessing(true)
    try {
      if (action === "approve") {
        await approveRequest(selectedRequest, note || undefined)
        toast.success("Demande approuvée")
      } else {
        await rejectRequest(selectedRequest, note)
        toast.success("Demande rejetée")
      }
      setSelectedRequest(null)
      setAction(null)
      setNote("")
    } catch {
      // Error handled by store
    } finally {
      setIsProcessing(false)
    }
  }

  const openDialog = (requestId: string, actionType: "approve" | "reject") => {
    setSelectedRequest(requestId)
    setAction(actionType)
    setNote("")
  }

  if (isLoading && creditRequests.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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
          <h1 className="text-2xl font-semibold">Demandes de crédits</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les demandes de recharge des organisations.
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

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Demandes</CardTitle>
          </div>
          <CardDescription>
            {creditRequests.length} demande{creditRequests.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {creditRequests.length === 0 ? (
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
                  <TableHead>Montant</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Preuve</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-muted-foreground">
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
                        <div className="text-xs text-muted-foreground">
                          {request.requester_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(request.amount)} crédits
                    </TableCell>
                    <TableCell>
                      {paymentMethodLabels[request.payment_method]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.payment_reference || "—"}
                    </TableCell>
                    <TableCell>
                      {request.payment_proof_url ? (
                        <a
                          href={request.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <FileImage className="h-3.5 w-3.5" />
                          Voir
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[request.status]}>
                        {statusLabels[request.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openDialog(request.id, "approve")}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDialog(request.id, "reject")}
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
                ? "Les crédits seront ajoutés au compte de l'organisation."
                : "Veuillez indiquer le motif du rejet."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAction(null); setSelectedRequest(null); setNote(""); }}
            >
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
    </div>
  )
}
