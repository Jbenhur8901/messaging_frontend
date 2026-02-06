"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Shield, ShieldCheck } from "lucide-react"

export function MFARecommendationDialog() {
  const router = useRouter()
  const { showMFARecommendation, setShowMFARecommendation } = useAuthStore()

  const [isOpen, setIsOpen] = useState(showMFARecommendation)

  useEffect(() => {
    setIsOpen(showMFARecommendation)
  }, [showMFARecommendation])

  const handleClose = () => {
    setIsOpen(false)
    setShowMFARecommendation(false)
  }

  const handleSetupNow = () => {
    handleClose()
    router.push("/settings?setup2fa=true")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl">
              Sécurisez votre compte
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Nous vous recommandons d&apos;activer l&apos;authentification à double facteur (2FA)
            pour protéger votre compte contre les accès non autorisés.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-border/60 bg-muted/60 p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Pourquoi activer le 2FA ?
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Protection supplémentaire même si votre mot de passe est compromis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Empêche les connexions non autorisées à votre compte
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Sécurise vos données et vos campagnes SMS
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Plus tard
          </Button>
          <Button onClick={handleSetupNow} className="w-full sm:w-auto">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Configurer maintenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
