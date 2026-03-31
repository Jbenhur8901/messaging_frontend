"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { authService } from "@/services/auth"
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
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react"

const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true)
    try {
      await authService.requestPasswordReset(data.email)
      setIsSubmitted(true)
      toast.success("Email envoyé")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full border-0 bg-transparent p-0 shadow-none">
        <CardHeader className="space-y-4 p-0 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E0D112]/10 border border-[#E0D112]/20">
            <CheckCircle className="h-8 w-8 text-[#E0D112]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-[22px] font-bold text-white">Email envoyé</h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Si un compte existe avec cette adresse, vous recevrez
              un lien de réinitialisation.
            </p>
          </div>
        </CardHeader>
        <CardFooter className="px-0 pb-0 pt-8">
          <Link href="/auth/login" className="w-full">
            <Button
              variant="outline"
              className="w-full h-11 border-white/10 hover:bg-white/5 text-white rounded-xl text-[13px]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full border-0 bg-transparent p-0 shadow-none">
      <CardHeader className="space-y-2 p-0">
        <h2 className="text-[22px] font-bold tracking-tight text-white">
          Mot de passe oublié
        </h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Entrez votre adresse email pour recevoir un lien de réinitialisation.
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
        </CardContent>

        <CardFooter className="flex flex-col gap-4 px-0 pb-0 pt-7">
          <Button
            type="submit"
            className="w-full h-11 text-[13px] font-bold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] bg-[#E0D112] hover:bg-[#E0D112]/90 text-black shadow-lg shadow-[#E0D112]/15"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer le lien
          </Button>
          <Link href="/auth/login" className="w-full">
            <Button
              variant="ghost"
              className="w-full h-11 text-[13px] text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
