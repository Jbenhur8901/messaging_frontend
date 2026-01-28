"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useCreditRequestsStore } from "@/stores"
import type { CreditRequestStatus, PaymentMethod } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Plus, Clock, X } from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatNumber } from "@/lib/utils"

const statusLabels: Record<CreditRequestStatus, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  cancelled: "Annulé",
}

const statusVariants: Record<CreditRequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Espèces",
  airtel_money: "Airtel Money",
  mobile_money: "Mobile Money",
}

export default function CreditRequestsPage() {
  const {
    requests,
    fetchRequests,
    cancelRequest,
    isLoading,
    error,
    clearError,
  } = useCreditRequestsStore()

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleCancel = async (id: string) => {
    try {
      await cancelRequest(id)
      toast.success("Demande annulée")
    } catch {
      // Error handled by store
    }
  }

  if (isLoading && requests.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/credits">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mes demandes</h1>
            <p className="text-muted-foreground">
              Historique de vos demandes de crédits
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/credits/request">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle demande
          </Link>
        </Button>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Demandes de crédits</CardTitle>
          </div>
          <CardDescription>
            {requests.length} demande{requests.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>Aucune demande de crédits</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/credits/request">Créer une demande</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Mode de paiement</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(request.created_at)}
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
                      <Badge variant={statusVariants[request.status]}>
                        {statusLabels[request.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Annuler cette demande ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. La demande sera annulée.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Non</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancel(request.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Oui, annuler
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info about rejected requests */}
      {requests.some((r) => r.status === "rejected" && r.review_note) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notes des demandes rejetées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests
                .filter((r) => r.status === "rejected" && r.review_note)
                .map((r) => (
                  <div key={r.id} className="text-sm">
                    <span className="text-muted-foreground">
                      {formatDate(r.created_at)} - {formatNumber(r.amount)} crédits:
                    </span>{" "}
                    <span>{r.review_note}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
