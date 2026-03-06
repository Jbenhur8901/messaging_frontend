"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuthStore } from "@/stores"
import { authService, handleApiError } from "@/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  User,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  ListChecks,
} from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuthStore()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }

    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères")
      return
    }

    setIsUpdatingPassword(true)
    try {
      await authService.updatePassword(newPassword)
      toast.success("Mot de passe mis à jour")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Gérez votre compte, la sécurité et vos préférences.
        </p>
      </div>

      <div className="grid gap-5 max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Profil</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Prénom</Label>
              <Input value={user?.first_name || ""} disabled className="h-9 text-[13px] rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Nom</Label>
              <Input value={user?.last_name || ""} disabled className="h-9 text-[13px] rounded-lg" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Email</Label>
            <Input value={user?.email || ""} disabled className="h-9 text-[13px] rounded-lg" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Exportation</h2>
          </div>
          <p className="text-[11px] text-muted-foreground">Suivez l&apos;avancement des jobs d&apos;importation.</p>
          <Link href="/settings/exportation">
            <Button variant="outline" className="h-8 text-[13px] rounded-lg">
              Ouvrir le suivi des jobs
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Mot de passe</h2>
          </div>
          <p className="text-[11px] text-muted-foreground">Modifiez votre mot de passe</p>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-[13px]">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-[13px] rounded-lg pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[13px]">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-[13px] rounded-lg"
            />
          </div>
          <Button
            onClick={handleUpdatePassword}
            disabled={!newPassword || !confirmPassword || isUpdatingPassword}
            className="h-8 text-[13px] rounded-lg gap-1.5"
          >
            {isUpdatingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Mettre à jour le mot de passe
          </Button>
        </div>
      </div>
    </div>
  )
}
