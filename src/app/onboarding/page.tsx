"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/stores"
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
import { Loader2, Building2 } from "lucide-react"

const organizationSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
})

type OrganizationForm = z.infer<typeof organizationSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

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
        setUser({
          ...user,
          organization_id: result.organization.id,
          organization_name: result.organization.name,
        })
      }

      toast.success("Workspace créé avec succès")
      router.push("/dashboard")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Créer votre workspace</CardTitle>
          <CardDescription>
            Bienvenue {user?.first_name} ! Donnez un nom à votre espace de travail pour commencer.
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
    </div>
  )
}
