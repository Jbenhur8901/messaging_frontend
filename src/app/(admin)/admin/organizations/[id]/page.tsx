"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { adminService } from "@/services"
import { handleApiError } from "@/services/api"
import type { Organization, OrganizationMember, CreditRequest, OrganizationRole } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Users,
  CreditCard,
  Clock,
  ShieldOff,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatNumber } from "@/lib/utils"

const roleLabels: Record<OrganizationRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
}

export default function AdminOrganizationDetailPage() {
  const params = useParams()
  const orgId = params.id as string

  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [recentRequests, setRecentRequests] = useState<CreditRequest[]>([])
  const [stats, setStats] = useState<{ total_members: number; total_credit_requests: number; pending_requests: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [resetMFAMember, setResetMFAMember] = useState<OrganizationMember | null>(null)
  const [isResettingMFA, setIsResettingMFA] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await adminService.getOrganization(orgId)
        setOrganization(data.organization)
        setMembers(data.members)
        setRecentRequests(data.recent_credit_requests)
        setStats(data.stats)
      } catch {
        toast.error("Erreur lors du chargement de l'organisation")
      } finally {
        setIsLoading(false)
      }
    }

    if (orgId) {
      loadData()
    }
  }, [orgId])

  const handleResetMFA = async (member: OrganizationMember) => {
    if (!member.user_id) return
    setIsResettingMFA(true)
    try {
      await adminService.resetUserMFA(member.user_id)
      toast.success(`MFA réinitialisé pour ${member.email}`)
      setResetMFAMember(null)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsResettingMFA(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Organisation non trouvée</p>
        <Button asChild className="mt-4">
          <Link href="/admin/organizations">Retour à la liste</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{organization.name}</h1>
            <Badge variant={organization.is_active ? "default" : "secondary"}>
              {organization.is_active ? "Actif" : "Inactif"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Details de l&apos;organisation.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Crédits
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
              <CreditCard className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(organization.credit_balance)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Membres
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.total_members || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Demandes en attente
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/10">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.pending_requests || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Membres</CardTitle>
          </div>
          <CardDescription>{members.length} membres</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {member.first_name && member.last_name
                      ? `${member.first_name} ${member.last_name}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleLabels[member.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "accepted" ? "default" : "secondary"}>
                      {member.status === "accepted" ? "Actif" : "En attente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.user_id && member.status === "accepted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[12px] gap-1.5"
                        onClick={() => setResetMFAMember(member)}
                      >
                        <ShieldOff className="h-3 w-3" />
                        Reset MFA
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Credit Requests */}
      {recentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Demandes de crédits récentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(request.amount)}
                    </TableCell>
                    <TableCell>{request.payment_method}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          request.status === "approved"
                            ? "default"
                            : request.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Reset MFA Confirmation Dialog */}
      <AlertDialog
        open={!!resetMFAMember}
        onOpenChange={(open) => {
          if (!open) setResetMFAMember(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le MFA</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous réinitialiser l&apos;authentification à double facteur pour{" "}
              <strong>{resetMFAMember?.email}</strong> ? L&apos;utilisateur devra reconfigurer son 2FA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingMFA}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (resetMFAMember) void handleResetMFA(resetMFAMember)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResettingMFA && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
