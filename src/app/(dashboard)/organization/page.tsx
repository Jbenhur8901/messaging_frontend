"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useOrganizationStore } from "@/stores"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Users, Save } from "lucide-react"
import { toast } from "sonner"

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
      <div className="space-y-5">
        <Skeleton className="h-7 w-48 rounded-xl" />
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>
    )
  }

  const userRole = organizations.find((o) => o.id === currentOrganization?.id)?.role

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Organisation</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Gérez les paramètres de votre organisation.
          </p>
        </div>
        <Button asChild variant="outline" className="h-8 text-[13px] rounded-lg gap-1.5">
          <Link href="/organization/members">
            <Users className="h-3.5 w-3.5" />
            Gérer les membres
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 max-w-2xl">
        {/* Informations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Informations</h2>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[13px]">Nom de l&apos;organisation</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon entreprise"
              disabled={userRole !== "owner" && userRole !== "admin"}
              className="h-9 text-[13px] rounded-lg"
            />
          </div>
          {(userRole === "owner" || userRole === "admin") && (
            <Button onClick={handleSave} disabled={isSaving} className="h-8 text-[13px] rounded-lg gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
        </div>

        {/* Votre rôle */}
        <div className="space-y-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Votre rôle</h2>
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 border border-border/40">
            <Badge variant="secondary" className="text-[10px] h-5">
              {userRole === "owner"
                ? "Propriétaire"
                : userRole === "admin"
                ? "Administrateur"
                : userRole === "member"
                ? "Membre"
                : "Lecteur"}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {userRole === "owner"
                ? "Accès complet à toutes les fonctionnalités"
                : userRole === "admin"
                ? "Peut gérer les membres et les paramètres"
                : userRole === "member"
                ? "Peut envoyer des messages et gérer les contacts"
                : "Accès en lecture seule"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
