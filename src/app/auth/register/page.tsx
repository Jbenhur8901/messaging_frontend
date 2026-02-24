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

type RegisterForm = z.infer<typeof registerSchema>

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
      await signup(
        data.email,
        data.password,
        data.firstName,
        data.lastName
      )
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
    <Card className="w-full border-0 bg-transparent p-0 shadow-none">
      <CardHeader className="space-y-1.5 p-0">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Cr&eacute;er un compte
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Renseignez vos informations pour d&eacute;marrer rapidement.
        </p>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-3 px-0 pb-0 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-[13px]">Pr&eacute;nom</Label>
              <Input
                id="firstName"
                placeholder="Jean"
                className="h-9 text-[13px] rounded-lg"
                {...register("firstName")}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="text-[12px] text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-[13px]">Nom</Label>
              <Input
                id="lastName"
                placeholder="Dupont"
                className="h-9 text-[13px] rounded-lg"
                {...register("lastName")}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="text-[12px] text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px]">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              className="h-9 text-[13px] rounded-lg"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-[12px] text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[13px]">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="h-9 text-[13px] rounded-lg"
              {...register("password")}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-[12px] text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[13px]">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="h-9 text-[13px] rounded-lg"
              {...register("confirmPassword")}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="text-[12px] text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 px-0 pb-0 pt-5">
          <p className="text-center text-[11px] text-muted-foreground/60">
            En cr&eacute;ant un compte, vous acceptez nos{" "}
            <Link
              href="/terms"
              className="font-medium text-muted-foreground hover:text-primary transition-colors underline"
              target="_blank"
            >
              Conditions G&eacute;n&eacute;rales d&apos;Utilisation
            </Link>
            .
          </p>
          <Button type="submit" className="w-full h-9 text-[13px] rounded-lg" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Cr&eacute;er mon compte
          </Button>
          <p className="text-center text-[13px] text-muted-foreground">
            D&eacute;j&agrave; un compte ?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
