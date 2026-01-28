"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore, useOrganizationStore } from "@/stores"
import { organizationsService, handleApiError } from "@/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Building2, Plus, Check } from "lucide-react"

const organizationSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
})

type OrganizationForm = z.infer<typeof organizationSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const {
    organizations,
    fetchOrganizations,
    setCurrentOrganization,
    isLoading: isLoadingOrganizations,
  } = useOrganizationStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
  })

  const onSubmit = async (data: OrganizationForm) => {
    setIsLoading(true)
    try {
      const result = await organizationsService.createOrganization(data.name)

      // Update user with new organization
      if (user && result.organization) {
        const updatedUser = {
          ...user,
          organization_id: result.organization.id,
          organization_name: result.organization.name,
        }
        setUser(updatedUser)
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(updatedUser))
        }
      }
      if (result.organization) {
        setCurrentOrganization(result.organization)
      }
      await fetchOrganizations()

      toast.success("Workspace créé avec succès")
      router.push("/dashboard")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => {
    if (organizations.length === 0) {
      setShowCreateForm(true)
    }
  }, [organizations.length])

  const handleSelectOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId)
    if (!org) return

    setCurrentOrganization(org)
    if (user) {
      const updatedUser = {
        ...user,
        organization_id: org.id,
        organization_name: org.name,
      }
      setUser(updatedUser)
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(updatedUser))
      }
    }
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Bienvenue {user?.first_name}</CardTitle>
            <CardDescription>
              Sélectionnez une organisation pour continuer ou créez-en une nouvelle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingOrganizations ? (
              <p className="text-sm text-muted-foreground text-center">Chargement des organisations...</p>
            ) : organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                Aucune organisation associée à votre compte.
              </p>
            ) : (
              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelectOrganization(org.id)}
                    className="w-full rounded-lg border px-4 py-3 text-left transition hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Rôle : {org.role === "owner" ? "Propriétaire" : org.role === "admin" ? "Administrateur" : "Membre"}
                        </p>
                      </div>
                      <Check className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateForm((prev) => !prev)}
              disabled={isLoadingOrganizations}
            >
              <Plus className="mr-2 h-4 w-4" />
              {organizations.length === 0 ? "Créer une organisation" : "Ajouter une organisation"}
            </Button>
          </CardFooter>
        </Card>

        {showCreateForm && (
          <Card>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Créer votre workspace</CardTitle>
              <CardDescription>
                Donnez un nom à votre espace de travail pour commencer.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du workspace</Label>
                  <Input
                    id="name"
                    placeholder="Mon entreprise"
                    {...register("name")}
                    disabled={isLoading}
                    autoFocus
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Vous pourrez inviter des membres de votre équipe plus tard.
                </p>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer et continuer
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
