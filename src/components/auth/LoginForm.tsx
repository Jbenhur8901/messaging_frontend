"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"

import { useAuthStore } from "@/stores"
import { handleApiError } from "@/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
})

type LoginFormValues = z.infer<typeof loginSchema>

const inputClass =
  "h-11 w-full rounded-full border border-white/10 bg-white/[0.06] px-4 text-[13px] text-white placeholder:text-white/30 shadow-[0_1px_0_rgba(0,0,0,0.35)] transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/25"

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wider text-white/60"

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      const result = await login(data.email, data.password)
      toast.success("Connexion réussie")
      router.push(result.requiresMFA ? "/auth/verify-2fa" : "/dashboard")
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
          <div className="flex justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-1 pr-2 text-[13px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Retour à l&apos;accueil
            </Link>
          </div>

          <div className="space-y-1 text-center">
            <h1 className="text-[22px] font-extrabold tracking-tight">
              Connexion
            </h1>
            <p className="text-[13px] leading-relaxed text-white/60">
              Accédez à votre espace Flow.
            </p>
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
        </CardContent>

        <CardFooter className="flex flex-col gap-5 px-0 pb-0 pt-7">
          <Button
            type="submit"
            className="h-11 w-full rounded-full bg-primary text-[13px] font-extrabold text-black shadow-[0_18px_52px_-28px_rgba(255,204,0,0.85)] transition-all hover:bg-primary/90 active:translate-y-px"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Se connecter
          </Button>

          <p className="text-center text-[13px] text-white/60">
            Pas de compte ?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-primary hover:underline"
            >
              Créer un compte
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

