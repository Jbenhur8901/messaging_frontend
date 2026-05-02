"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useOrganizationStore } from "@/stores"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Plus, Save } from "lucide-react"
import { toast } from "sonner"

export default function OrganizationPage() {
  const router = useRouter()
  const {
    currentOrganization,
    organizations,
    updateOrganization,
    isLoading,
    error,
    clearError,
  } = useOrganizationStore()

  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const userRole = organizations.find((o) => o.id === currentOrganization?.id)?.role

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

  useEffect(() => {
    if (currentOrganization && userRole && userRole !== "owner") {
      toast.error("Cette page est réservée au propriétaire de l'organisation")
      router.replace("/dashboard")
    }
  }, [currentOrganization, router, userRole])

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

  if (currentOrganization && userRole && userRole !== "owner") {
    return null
  }

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
      </div>

      <div className="grid gap-5 max-w-2xl">
        {/* Invitations et membres — temporairement masqué */}

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
              disabled={userRole !== "owner"}
              className="h-9 text-[13px] rounded-lg"
            />
          </div>
          {userRole === "owner" && (
            <Button onClick={handleSave} disabled={isSaving} className="h-8 text-[13px] rounded-lg gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          )}
        </div>

        {userRole === "owner" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
                Nouvelle organisation
              </h2>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Utilisez la page de creation dediee pour ajouter une nouvelle organisation.
            </p>
            <Button asChild type="button" className="h-8 text-[13px] rounded-lg gap-1.5">
              <Link href="/onboarding">
                <Plus className="h-3.5 w-3.5" />
                Aller a la creation d&apos;organisation
              </Link>
            </Button>
          </div>
        )}

        {/* Votre rôle — temporairement masqué */}
      </div>
    </div>
  )
}
