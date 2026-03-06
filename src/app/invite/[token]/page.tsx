"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { invitationsService } from "@/services"
import { handleApiError } from "@/services/api"
import { useAuthStore } from "@/stores"
import type { OrganizationInvitation, OrganizationRole } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Building2, Mail, UserPlus, AlertCircle, CheckCircle } from "lucide-react"
import { toast } from "sonner"

const roleLabels: Record<OrganizationRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const { isAuthenticated, user } = useAuthStore()

  const [invitation, setInvitation] = useState<OrganizationInvitation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const data = await invitationsService.getInvitation(token)
        setInvitation(data)
      } catch {
        setError("Cette invitation n'existe pas ou a expiré.")
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      loadInvitation()
    }
  }, [token])

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/auth/login?redirect=/invite/${token}`)
      return
    }

    setIsAccepting(true)
    try {
      await invitationsService.acceptInvitation(token)
      setIsAccepted(true)
      toast.success("Invitation acceptée")
      // Redirect to organization page after a short delay
      setTimeout(() => {
        router.push("/organization")
      }, 2000)
    } catch (err) {
      const apiError = handleApiError(err)
      toast.error(apiError.message || "Erreur lors de l'acceptation")
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Invitation invalide</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <CardTitle>Invitation acceptée</CardTitle>
            </div>
            <CardDescription>
              Vous avez rejoint {invitation?.organization_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Redirection vers votre organisation...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="relative z-10 mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Invitation</h1>
            <p className="text-muted-foreground mt-1">
              Vous avez été invité à rejoindre une organisation
            </p>
          </div>
        </div>
        <Card className="border border-border/60 shadow-[var(--shadow-sm)]">
        <CardHeader className="sr-only">
          <CardTitle>Détails de l&apos;invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-4">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-lg">{invitation?.organization_name}</p>
              <Badge variant="secondary">{roleLabels[invitation?.role || "member"]}</Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Invitation pour: {invitation?.email}</span>
            </div>
          </div>

          {isAuthenticated && user?.email !== invitation?.email && (
            <div className="rounded-lg border border-amber-200/70 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
              <p className="text-amber-800 dark:text-amber-200">
                Cette invitation a été envoyée à <strong>{invitation?.email}</strong>.
                Vous êtes connecté en tant que <strong>{user?.email}</strong>.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">Refuser</Link>
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="flex-1"
          >
            {isAccepting
              ? "Acceptation..."
              : isAuthenticated
              ? "Accepter"
              : "Se connecter pour accepter"}
          </Button>
        </CardFooter>
      </Card>
      </div>
    </div>
  )
}
