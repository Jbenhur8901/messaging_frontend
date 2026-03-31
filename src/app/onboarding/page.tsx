"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore, useOrganizationStore } from "@/stores"
import { organizationsService, handleApiError } from "@/services"
import { authStorage } from "@/lib/auth-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Plus, ChevronRight, Crown, ShieldCheck, User } from "lucide-react"

const organizationSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
})

type OrganizationForm = z.infer<typeof organizationSchema>

const roleConfig = {
  owner: { label: "Propriétaire", icon: Crown, color: "text-[#E0D112]" },
  admin: { label: "Administrateur", icon: ShieldCheck, color: "text-[#E0D112]/70" },
  member: { label: "Membre", icon: User, color: "text-white/40" },
} as const

export default function OnboardingPage() {
  const router = useRouter()
  const { user, setUser, setOrganizations: setSessionOrganizations, setActiveOrgId } = useAuthStore()
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

      if (user && result.organization) {
        const updatedUser = {
          ...user,
          organization_id: result.organization.id,
          organization_name: result.organization.name,
        }
        setUser(updatedUser)
        authStorage.setItem("user", JSON.stringify(updatedUser))
      }
      if (result.organization) {
        setActiveOrgId(result.organization.id)
      }
      await fetchOrganizations()
      const nextOrganizations = useOrganizationStore.getState().organizations
      setSessionOrganizations(nextOrganizations)
      const nextCurrentOrganization = nextOrganizations.find((org) => org.id === result.organization?.id) || null
      if (nextCurrentOrganization) {
        setCurrentOrganization(nextCurrentOrganization)
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

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => {
    setSessionOrganizations(organizations)
  }, [organizations, setSessionOrganizations])

  useEffect(() => {
    if (organizations.length === 0) {
      setShowCreateForm(true)
    }
  }, [organizations.length])

  const handleSelectOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId)
    if (!org) return

    void organizationsService.switchOrganization(orgId).catch(() => null)
    setCurrentOrganization(org)
    setSessionOrganizations(organizations)
    setActiveOrgId(org.id)
    if (user) {
      const updatedUser = {
        ...user,
        organization_id: org.id,
        organization_name: org.name,
      }
      setUser(updatedUser)
      authStorage.setItem("user", JSON.stringify(updatedUser))
    }
    router.push("/dashboard")
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Bienvenue{user?.first_name ? `, ${user.first_name}` : ""}
        </h2>
        <p className="text-[12px] text-white/40">
          Choisissez une organisation.
        </p>
      </div>

      {isLoadingOrganizations ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-white/30" />
          <span className="ml-2 text-[13px] text-white/40">Chargement...</span>
        </div>
      ) : organizations.length > 0 ? (
        <div className="space-y-2">
          {organizations.map((org) => {
            const role = roleConfig[org.role as keyof typeof roleConfig] || roleConfig.member
            const RoleIcon = role.icon
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSelectOrganization(org.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left transition-all hover:border-[#E0D112]/25 hover:bg-white/[0.06]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E0D112]/10">
                  <RoleIcon className={`h-4 w-4 ${role.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate">{org.name}</p>
                  <p className="text-[11px] text-white/35">{role.label}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-[#E0D112]" />
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-center text-[13px] text-white/35 py-4">
          Aucune organisation associ&eacute;e &agrave; votre compte.
        </p>
      )}

      {!showCreateForm && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 text-[13px] rounded-xl border-white/10 bg-transparent text-white/70 hover:border-[#E0D112]/30 hover:bg-white/[0.04] hover:text-white"
          onClick={() => setShowCreateForm(true)}
          disabled={isLoadingOrganizations}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nouvelle organisation
        </Button>
      )}

      {showCreateForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[12px] text-white/50">Nom</Label>
            <Input
              id="name"
              placeholder="Mon entreprise"
              className="h-10 text-[13px] rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 focus:border-[#E0D112]/50 focus:ring-[#E0D112]/20"
              {...register("name")}
              disabled={isLoading}
              autoFocus
            />
            {errors.name && (
              <p className="text-[12px] text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="flex gap-2">
            {organizations.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 text-[13px] rounded-xl border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
                onClick={() => setShowCreateForm(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
            )}
            <Button
              type="submit"
              className="h-10 flex-1 text-[13px] font-bold rounded-xl bg-[#E0D112] hover:bg-[#E0D112]/90 text-black shadow-lg shadow-[#E0D112]/15"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Cr&eacute;er
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
