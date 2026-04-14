"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/stores"
import { handleApiError } from "@/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const registerSchema = z
  .object({
    firstName: z.string().min(1, "Prenom requis"),
    lastName: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })

type RegisterForm = z.infer<typeof registerSchema>

const inputClass =
  "h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#E0D112]/50 focus:ring-[#E0D112]/20 rounded-xl transition-all"

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70"

export default function RegisterPage() {
  const router = useRouter()
  const { signup } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      const result = await signup(data.email, data.password, data.firstName, data.lastName)

      if (result.emailVerified && result.isAuthenticated) {
        toast.success("Compte cree avec succes")
        router.push("/onboarding")
        return
      }

      router.push(`/auth/confirm-email?email=${encodeURIComponent(data.email)}`)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full border-0 bg-transparent p-0 shadow-none">
      <CardHeader className="space-y-2 p-0">
        <h2 className="text-[22px] font-bold tracking-tight text-white">
          Creer un compte
        </h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Renseignez vos informations pour demarrer rapidement.
        </p>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 px-0 pb-0 pt-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className={labelClass}>Prenom</Label>
              <Input
                id="firstName"
                placeholder="Jean"
                className={inputClass}
                {...register("firstName")}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className={labelClass}>Nom</Label>
              <Input
                id="lastName"
                placeholder="Dupont"
                className={inputClass}
                {...register("lastName")}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className={labelClass}>Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              className={inputClass}
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className={labelClass}>Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              className={inputClass}
              {...register("password")}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className={labelClass}>Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="********"
              className={inputClass}
              {...register("confirmPassword")}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-5 px-0 pb-0 pt-7">
          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-[#E0D112] text-[13px] font-bold text-black shadow-lg shadow-[#E0D112]/15 transition-all hover:scale-[1.01] hover:bg-[#E0D112]/90 active:scale-[0.99]"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Creer mon compte
          </Button>

          <p className="text-center text-[13px] text-muted-foreground">
            Deja un compte ?{" "}
            <Link
              href="/auth/login"
              className="font-bold text-[#E0D112] transition-colors hover:text-[#E0D112]/80 hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
