"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { invitationsService } from "@/services"
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
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'acceptation")
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
            <div className="flex items-center gap-2 text-green-600">
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle>Invitation</CardTitle>
          </div>
          <CardDescription>
            Vous avez été invité à rejoindre une organisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
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
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
              <p className="text-yellow-800 dark:text-yellow-200">
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
  )
}
