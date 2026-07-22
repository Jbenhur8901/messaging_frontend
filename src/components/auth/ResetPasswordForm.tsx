"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react"

import { authService } from "@/services/auth"
import { handleApiError } from "@/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

const inputClass =
  "h-11 w-full rounded-full border border-white/10 bg-white/[0.06] px-4 text-[13px] text-white placeholder:text-white/30 shadow-[0_1px_0_rgba(0,0,0,0.35)] transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25"

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wider text-white/60"

export function ResetPasswordForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordValues) => {
    setIsLoading(true)
    try {
      await authService.updatePassword(data.password)
      await authService.signout()
      setIsSuccess(true)
      toast.success("Mot de passe mis à jour")
      setTimeout(() => {
        router.push("/auth/login?reset=success")
      }, 1800)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7 text-white shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)] backdrop-blur sm:p-9">
        <CardContent className="space-y-5 px-0 pb-0 pt-0 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-[22px] font-extrabold tracking-tight">
              Mot de passe modifié
            </h1>
            <p className="text-[13px] leading-relaxed text-white/60">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
          </div>
        </CardContent>
        <CardFooter className="px-0 pb-0 pt-7">
          <Button
            asChild
            className="h-11 w-full rounded-full bg-primary text-[13px] font-extrabold text-black shadow-[0_18px_52px_-28px_rgba(255,204,0,0.85)] hover:bg-primary/90"
          >
            <Link href="/auth/login">Retour à la connexion</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full rounded-[28px] border border-white/10 bg-[#0B0B0B]/95 p-7 text-white shadow-[0_40px_110px_-70px_rgba(0,0,0,0.65)] backdrop-blur sm:p-9">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 px-0 pb-0 pt-0">
          <div className="flex justify-start">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-1 pr-2 text-[13px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Retour à la connexion
            </Link>
          </div>

          <div className="space-y-1 text-center">
            <h1 className="text-[22px] font-extrabold tracking-tight">
              Nouveau mot de passe
            </h1>
            <p className="text-[13px] leading-relaxed text-white/60">
              Choisissez un mot de passe sécurisé pour votre compte Flow.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className={labelClass}>
              Nouveau mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className={`${inputClass}${errors.password ? " border-destructive/60 focus:border-destructive/70 focus:ring-destructive/20" : ""}`}
              {...register("password")}
              disabled={isLoading}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
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
              autoComplete="new-password"
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
            Mettre à jour le mot de passe
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
