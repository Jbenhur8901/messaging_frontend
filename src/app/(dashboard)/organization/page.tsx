"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Users, Save, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { formatNumber } from "@/lib/utils"

export default function OrganizationPage() {
  const {
    currentOrganization,
    organizations,
    fetchOrganizations,
    updateOrganization,
    isLoading,
    error,
    clearError,
  } = useOrganizationStore()

  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name)
    }
  }, [currentOrganization])

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom de l'organisation est requis")
      return
    }

    setIsSaving(true)
    try {
      await updateOrganization(name.trim())
      toast.success("Organisation mise à jour")
    } catch {
      // Error handled by store
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading && !currentOrganization) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const userRole = organizations.find((o) => o.id === currentOrganization?.id)?.role

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organisation</h1>
          <p className="text-muted-foreground">
            Gérez les paramètres de votre organisation
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/organization/members">
            <Users className="mr-2 h-4 w-4" />
            Gérer les membres
          </Link>
        </Button>
      </div>

      {/* Organization Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Informations</CardTitle>
            </div>
            <CardDescription>
              Modifiez les informations de votre organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l&apos;organisation</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon entreprise"
                disabled={userRole !== "owner" && userRole !== "admin"}
              />
            </div>
            {(userRole === "owner" || userRole === "admin") && (
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Crédits</CardTitle>
            </div>
            <CardDescription>
              Solde de crédits de l&apos;organisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(currentOrganization?.credit_balance || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              crédits disponibles
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/credits">
                  Voir les détails
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Info */}
      <Card>
        <CardHeader>
          <CardTitle>Votre rôle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {userRole === "owner"
                ? "Propriétaire"
                : userRole === "admin"
                ? "Administrateur"
                : userRole === "member"
                ? "Membre"
                : "Lecteur"}
            </span>
            <span className="text-muted-foreground">
              {userRole === "owner"
                ? "- Accès complet à toutes les fonctionnalités"
                : userRole === "admin"
                ? "- Peut gérer les membres et les paramètres"
                : userRole === "member"
                ? "- Peut envoyer des messages et gérer les contacts"
                : "- Accès en lecture seule"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
