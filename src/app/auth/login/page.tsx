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

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const result = await login(data.email, data.password)

      // Check if MFA verification is required
      if (result.requiresMFA) {
        router.push("/auth/verify-2fa")
      } else {
        toast.success("Connexion réussie")
        router.push("/dashboard")
      }
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
          Connexion
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Entrez vos identifiants pour acc&eacute;der &agrave; votre compte.
        </p>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-3 px-0 pb-0 pt-5">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px]">Mot de passe</Label>
              <Link
                href="/auth/forgot-password"
                className="text-[12px] text-muted-foreground hover:text-primary transition-colors"
              >
                Mot de passe oubli&eacute; ?
              </Link>
            </div>
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
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 px-0 pb-0 pt-5">
          <Button type="submit" className="w-full h-9 text-[13px] rounded-lg" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Se connecter
          </Button>
          <p className="text-center text-[13px] text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-primary hover:underline"
            >
              Cr&eacute;er un compte
            </Link>
          </p>
          <p className="text-center text-[11px] text-muted-foreground/60">
            En vous connectant, vous acceptez nos{" "}
            <Link
              href="/terms"
              className="font-medium text-muted-foreground hover:text-primary transition-colors underline"
              target="_blank"
            >
              Conditions G&eacute;n&eacute;rales d&apos;Utilisation
            </Link>
            .
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
