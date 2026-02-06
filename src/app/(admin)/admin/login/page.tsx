"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminStore } from "@/stores"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AdminLoginPage() {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAdminStore()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email.trim() || !password) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    try {
      await login(email.trim(), password)
      toast.success("Connexion réussie")
      router.push("/admin/dashboard")
    } catch {
      toast.error(error || "Identifiants invalides")
    }
  }

  return (
    <div className="min-h-screen bg-auth">
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8 text-white">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary">
              <Shield className="h-4 w-4" />
            </span>
            Console d&apos;administration
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Pilotez la plateforme avec précision.
            </h1>
            <p className="text-lg text-white/80">
              Supervisez les organisations, les crédits et la conformité dans un
              espace sécurisé.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-white/80 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              Monitoring des demandes en temps réel.
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              Contrôle d&apos;accès et traçabilité.
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              Audit des organisations.
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              Processus sécurisé et centralisé.
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/90 p-6 shadow-[var(--shadow-md)] backdrop-blur">
            <div className="mb-6 flex items-center gap-2 text-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-sm)]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold">Administration</p>
                <p className="text-xs text-muted-foreground">Accès restreint</p>
              </div>
            </div>
            <Card className="w-full border-0 bg-transparent p-0 shadow-none">
              <CardHeader className="text-left space-y-2 p-0">
                <CardTitle className="text-2xl font-semibold text-foreground">
                  Connexion
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Connectez-vous au panel d&apos;administration.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
