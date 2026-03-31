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
      <CardHeader className="space-y-2 p-0">
        <h2 className="text-[22px] font-bold tracking-tight text-white">
          Connexion
        </h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Entrez vos identifiants pour accéder à votre compte.
        </p>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 px-0 pb-0 pt-7">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#E0D112]/50 focus:ring-[#E0D112]/20 rounded-xl transition-all"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Mot de passe
              </Label>
              <Link
                href="/auth/forgot-password"
                className="text-[11px] text-muted-foreground hover:text-[#E0D112] transition-colors font-medium"
              >
                Mot de passe oubli&eacute; ?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/20 focus:border-[#E0D112]/50 focus:ring-[#E0D112]/20 rounded-xl transition-all"
              {...register("password")}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-5 px-0 pb-0 pt-7">
          <Button
            type="submit"
            className="w-full h-11 text-[13px] font-bold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] bg-[#E0D112] hover:bg-[#E0D112]/90 text-black shadow-lg shadow-[#E0D112]/15"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Se connecter
          </Button>

          <p className="text-center text-[13px] text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link
              href="/auth/register"
              className="font-bold text-[#E0D112] hover:underline hover:text-[#E0D112]/80 transition-colors"
            >
              Cr&eacute;er un compte
            </Link>
          </p>

          <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground/40">
            En vous connectant, vous acceptez nos{" "}
            <Link
              href="/terms"
              className="font-medium hover:text-[#E0D112] transition-colors underline"
              target="_blank"
            >
              Conditions G&eacute;n&eacute;rales d&apos;Utilisation
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
