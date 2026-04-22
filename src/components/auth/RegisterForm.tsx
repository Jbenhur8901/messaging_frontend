"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { useAuthStore } from "@/stores"
import { handleApiError } from "@/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

const registerSchema = z
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

type RegisterFormValues = z.infer<typeof registerSchema>

const inputClass =
  "h-11 w-full rounded-full border border-white/10 bg-white/[0.06] px-4 text-[13px] text-white placeholder:text-white/30 shadow-[0_1px_0_rgba(0,0,0,0.35)] transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25"

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wider text-white/60"

export function RegisterForm() {
  const router = useRouter()
  const { signup } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      await signup(data.email, data.password, data.firstName, data.lastName)
      toast.success("Compte créé avec succès")
      router.push("/onboarding")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7 text-white shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)] backdrop-blur sm:p-9">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 px-0 pb-0 pt-0">
          <div className="space-y-1 text-center">
            <h1 className="text-[22px] font-extrabold tracking-tight">
              Créer un compte
            </h1>
            <p className="text-[13px] leading-relaxed text-white/60">
              Lancez Flow en quelques secondes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className={labelClass}>
                Prénom
              </Label>
              <Input
                id="firstName"
                placeholder="Jean"
                className={`${inputClass}${errors.firstName ? " border-destructive/60 focus:border-destructive/70 focus:ring-destructive/20" : ""}`}
                {...register("firstName")}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName" className={labelClass}>
                Nom
              </Label>
              <Input
                id="lastName"
                placeholder="Dupont"
                className={`${inputClass}${errors.lastName ? " border-destructive/60 focus:border-destructive/70 focus:ring-destructive/20" : ""}`}
                {...register("lastName")}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className={labelClass}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              className={`${inputClass}${errors.email ? " border-destructive/60 focus:border-destructive/70 focus:ring-destructive/20" : ""}`}
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className={labelClass}>
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className={`${inputClass}${errors.password ? " border-destructive/60 focus:border-destructive/70 focus:ring-destructive/20" : ""}`}
              {...register("password")}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className={labelClass}>
              Confirmer le mot de passe
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className={`${inputClass}${errors.confirmPassword ? " border-destructive/60 focus:border-destructive/70 focus:ring-destructive/20" : ""}`}
              {...register("confirmPassword")}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-5 px-0 pb-0 pt-7">
          <Button
            type="submit"
            className="h-11 w-full rounded-full bg-primary text-[13px] font-extrabold text-black shadow-[0_18px_52px_-28px_rgba(255,204,0,0.85)] transition-all hover:bg-primary/90 active:translate-y-px"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer mon compte
          </Button>

          <p className="text-center text-[13px] text-white/60">
            Déjà un compte ?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-primary hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

