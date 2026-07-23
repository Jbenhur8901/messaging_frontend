"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Loader2,
  LogIn,
  Mail,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

import { invitationsService, handleApiError } from "@/services"
import { savePersistentInvitationToken } from "@/lib/invitation-auth"
import { useAuthStore } from "@/stores"
import type { OrganizationInvitation, OrganizationRole } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

const roleLabels: Record<OrganizationRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
}

const inputClass =
  "h-11 w-full rounded-full border border-white/10 bg-white/[0.06] px-4 text-[13px] text-white placeholder:text-white/30 shadow-[0_1px_0_rgba(0,0,0,0.35)] transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25"

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wider text-white/60"

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
})

const signupSchema = z
  .object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })

type AuthMode = "login" | "signup"

function getPostInvitationPath(
  invitationAccepted?: boolean,
  requiresMFA?: boolean,
): string {
  if (requiresMFA) return "/auth/verify-2fa"
  if (invitationAccepted) return "/dashboard"
  return "/dashboard"
}

export function InvitationAcceptFlow() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const { login, signup, isAuthenticated } = useAuthStore()

  const [invitation, setInvitation] = useState<OrganizationInvitation | null>(null)
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const data = await invitationsService.getInvitation(token)
        setInvitation(data)
        loginForm.setValue("email", data.email)
        signupForm.setValue("email", data.email)
      } catch {
        setLoadError("Cette invitation n'existe pas ou a expiré.")
      } finally {
        setIsLoadingInvitation(false)
      }
    }

    if (token) {
      void loadInvitation()
    }
  }, [token, loginForm, signupForm])

  useEffect(() => {
    if (isAuthenticated && invitation && !isCompleted) {
      router.replace("/dashboard")
    }
  }, [invitation, isAuthenticated, isCompleted, router])

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true)
    try {
      const result = await login(values.email, values.password, { invitationToken: token })

      if (result.invitationAccepted) {
        setIsCompleted(true)
        toast.success(`Vous avez rejoint ${invitation?.organization_name}`)
        router.push(getPostInvitationPath(true, result.requiresMFA))
        return
      }

      if (result.requiresMFA) {
        toast.message("Vérification à deux facteurs requise")
        router.push("/auth/verify-2fa")
        return
      }

      toast.success("Connexion réussie")
      router.push("/dashboard")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    setIsSubmitting(true)
    try {
      const result = await signup(
        values.email,
        values.password,
        values.firstName,
        values.lastName,
        undefined,
        { invitationToken: token },
      )

      if (result.invitationAccepted) {
        setIsCompleted(true)
        toast.success(`Bienvenue dans ${invitation?.organization_name}`)
        router.push("/dashboard")
        return
      }

      if (!result.isAuthenticated || !result.emailVerified) {
        savePersistentInvitationToken(token)
        toast.success("Compte créé — vérifiez votre email pour finaliser l'invitation")
        router.push(`/auth/confirm-email?email=${encodeURIComponent(values.email)}`)
        return
      }

      toast.success("Compte créé avec succès")
      router.push("/dashboard")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingInvitation) {
    return (
      <div className="min-h-screen bg-[#070707] px-4 py-10 text-white">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <Skeleton className="h-8 w-48 rounded-xl bg-white/10" />
          <Skeleton className="h-40 w-full rounded-[28px] bg-white/10" />
          <Skeleton className="h-72 w-full rounded-[28px] bg-white/10" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070707] p-4 text-white">
        <Card className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7">
          <CardHeader className="space-y-3 p-0">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <h1 className="text-lg font-semibold">Invitation invalide</h1>
            </div>
            <p className="text-[13px] text-white/60">{loadError}</p>
          </CardHeader>
          <CardFooter className="p-0 pt-6">
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070707] p-4 text-white">
        <Card className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7">
          <CardHeader className="space-y-3 p-0">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              <h1 className="text-lg font-semibold">Invitation acceptée</h1>
            </div>
            <p className="text-[13px] text-white/60">
              Vous avez rejoint {invitation?.organization_name}. Redirection en cours…
            </p>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#070707] px-4 py-10 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 50% 20%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.00) 62%), linear-gradient(180deg, #070707 0%, #0B0B0B 55%, #070707 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-[24px] font-extrabold tracking-tight">Rejoindre une organisation</h1>
          <p className="text-[13px] text-white/60">
            Connectez-vous ou créez un compte pour accepter l&apos;invitation.
          </p>
        </div>

        <Card className="rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-6 shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)]">
          <CardContent className="space-y-4 p-0">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Building2 className="h-10 w-10 shrink-0 text-white/50" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{invitation?.organization_name}</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  {roleLabels[invitation?.role || "member"]}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[12px] text-white/60">
              <Mail className="h-3.5 w-3.5" />
              Invitation pour {invitation?.email}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7 shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)] sm:p-8">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold transition-colors ${
                authMode === "login"
                  ? "bg-primary text-black"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              J&apos;ai déjà un compte
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold transition-colors ${
                authMode === "signup"
                  ? "bg-primary text-black"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Créer un compte
            </button>
          </div>

          {authMode === "login" ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-login-email" className={labelClass}>
                  Email
                </Label>
                <Input
                  id="invite-login-email"
                  type="email"
                  readOnly
                  className={`${inputClass} opacity-80`}
                  {...loginForm.register("email")}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-login-password" className={labelClass}>
                  Mot de passe
                </Label>
                <Input
                  id="invite-login-password"
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                  {...loginForm.register("password")}
                  disabled={isSubmitting}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-primary text-[13px] font-extrabold text-black"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Se connecter et rejoindre
              </Button>
            </form>
          ) : (
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-first-name" className={labelClass}>
                    Prénom
                  </Label>
                  <Input
                    id="invite-first-name"
                    className={inputClass}
                    {...signupForm.register("firstName")}
                    disabled={isSubmitting}
                  />
                  {signupForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive">
                      {signupForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-last-name" className={labelClass}>
                    Nom
                  </Label>
                  <Input
                    id="invite-last-name"
                    className={inputClass}
                    {...signupForm.register("lastName")}
                    disabled={isSubmitting}
                  />
                  {signupForm.formState.errors.lastName && (
                    <p className="text-xs text-destructive">
                      {signupForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-signup-email" className={labelClass}>
                  Email
                </Label>
                <Input
                  id="invite-signup-email"
                  type="email"
                  readOnly
                  className={`${inputClass} opacity-80`}
                  {...signupForm.register("email")}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-signup-password" className={labelClass}>
                  Mot de passe
                </Label>
                <Input
                  id="invite-signup-password"
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                  {...signupForm.register("password")}
                  disabled={isSubmitting}
                />
                {signupForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-confirm-password" className={labelClass}>
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="invite-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                  {...signupForm.register("confirmPassword")}
                  disabled={isSubmitting}
                />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-primary text-[13px] font-extrabold text-black"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer mon compte et rejoindre
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
