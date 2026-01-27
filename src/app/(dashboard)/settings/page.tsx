"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuthStore } from "@/stores"
import { authService, handleApiError } from "@/services"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  User,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Copy,
  CheckCircle,
} from "lucide-react"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const { user, setUser } = useAuthStore()

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaVerifiedAt, setMfaVerifiedAt] = useState<string | null>(null)
  const [isLoadingMFA, setIsLoadingMFA] = useState(true)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollmentData, setEnrollmentData] = useState<{
    qr_code: string
    secret: string
    provisioning_uri: string
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [disableCode, setDisableCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  // Password form
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const isMFAAvailable = true

  // Load MFA factors on mount
  useEffect(() => {
    const loadMFAStatus = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      if (!token || !isMFAAvailable) {
        setIsLoadingMFA(false)
        return
      }

      try {
        const status = await authService.getMFAStatus()
        setMfaEnabled(status.mfa_enabled)
        setMfaVerifiedAt(status.mfa_verified_at || null)
      } catch (error) {
        // Silently fail - MFA might not be set up or session missing
        console.error("Error loading MFA factors:", error)
        setMfaEnabled(false)
        setMfaVerifiedAt(null)
      } finally {
        setIsLoadingMFA(false)
      }
    }

    loadMFAStatus()
  }, [isMFAAvailable])

  // Auto-open enrollment dialog if coming from recommendation
  useEffect(() => {
    if (searchParams.get("setup2fa") === "true") {
      setShowEnrollDialog(true)
      // Clean URL
      window.history.replaceState({}, "", "/settings")
    }
  }, [searchParams])

  const handleEnrollMFA = async () => {
    setIsEnrolling(true)
    try {
      const result = await authService.setupMFA()
      setEnrollmentData({
        qr_code: result.qr_code,
        secret: result.secret,
        provisioning_uri: result.provisioning_uri,
      })
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
      setShowEnrollDialog(false)
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleVerifyEnrollment = async () => {
    if (!enrollmentData || verificationCode.length !== 6) {
      toast.error("Veuillez entrer un code à 6 chiffres")
      return
    }

    setIsVerifying(true)
    try {
      const result = await authService.verifyMFASetup(verificationCode)
      setBackupCodes(result.backup_codes || [])
      setMfaEnabled(true)

      // Update user state
      if (user) {
        setUser({ ...user, mfa_enabled: true })
      }

      toast.success("Authentification à double facteur activée")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message || "Code invalide")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDisableMFA = async () => {
    if (disableCode.length !== 6) {
      toast.error("Veuillez entrer un code à 6 chiffres")
      return
    }

    try {
      await authService.disableMFA(disableCode)
      setMfaEnabled(false)
      setMfaVerifiedAt(null)

      // Update user state
      if (user) {
        setUser({ ...user, mfa_enabled: false })
      }

      toast.success("Authentification à double facteur désactivée")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setShowDisableDialog(false)
      setDisableCode("")
    }
  }

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copié dans le presse-papiers")
  }

  const hasActiveMFA = mfaEnabled

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez votre compte et vos préférences
        </p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Profil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input value={user?.first_name || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={user?.last_name || ""} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Organisation</Label>
              <Input value={user?.organization_name || ""} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        {isMFAAvailable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Authentification à double facteur</CardTitle>
              </div>
              {hasActiveMFA && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Activé
                </Badge>
              )}
            </div>
            <CardDescription>
              Ajoutez une couche de sécurité supplémentaire à votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMFA ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : hasActiveMFA ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Smartphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Application d'authentification
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {mfaVerifiedAt
                          ? `Vérifié le ${new Date(mfaVerifiedAt).toLocaleDateString("fr-FR")}`
                          : "Vérifié"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisableDialog(true)}
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Désactiver
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <ShieldOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="font-medium mb-2">2FA non configuré</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Protégez votre compte avec une application d&apos;authentification
                </p>
                <Button onClick={() => {
                  setShowEnrollDialog(true)
                  handleEnrollMFA()
                }}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Activer le 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Mot de passe</CardTitle>
            </div>
            <CardDescription>
              Modifiez votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              onClick={handleUpdatePassword}
              disabled={!newPassword || !confirmPassword || isUpdatingPassword}
            >
              {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mettre à jour le mot de passe
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* MFA Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={(open) => {
        if (!open) {
          setShowEnrollDialog(false)
          setEnrollmentData(null)
          setVerificationCode("")
          setBackupCodes([])
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurer l&apos;authentification 2FA</DialogTitle>
            <DialogDescription>
              Scannez le QR code avec votre application d&apos;authentification
            </DialogDescription>
          </DialogHeader>

          {isEnrolling ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : enrollmentData ? (
            <div className="space-y-6 py-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="rounded-lg border bg-white p-4">
                  <img
                    src={enrollmentData.qr_code}
                    alt="QR Code"
                    className="h-48 w-48"
                  />
                </div>
              </div>

              {/* Manual entry */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Ou entrez ce code manuellement :
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                    {enrollmentData.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(enrollmentData.secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Verification code input */}
              <div className="space-y-2">
                <Label htmlFor="verificationCode">
                  Entrez le code de vérification
                </Label>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              {backupCodes.length > 0 && (
                <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Codes de récupération</p>
                      <p className="text-xs text-muted-foreground">
                        Conservez-les en lieu sûr. Ils ne seront affichés qu&apos;une seule fois.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(backupCodes.join("\n"))}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copier
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                    {backupCodes.map((code) => (
                      <div key={code} className="rounded bg-background px-2 py-1 text-center">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEnrollDialog(false)
                setEnrollmentData(null)
                setVerificationCode("")
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleVerifyEnrollment}
              disabled={!enrollmentData || verificationCode.length !== 6 || isVerifying || backupCodes.length > 0}
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vérifier et activer
            </Button>
            {backupCodes.length > 0 && (
              <Button
                onClick={() => {
                  setShowEnrollDialog(false)
                  setEnrollmentData(null)
                  setVerificationCode("")
                  setBackupCodes([])
                }}
              >
                Terminer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable MFA Confirmation */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver l&apos;authentification 2FA ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action réduira la sécurité de votre compte. Vous ne serez plus
              protégé par la double authentification lors de vos connexions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disableCode">Code d&apos;authentification</Label>
            <Input
              id="disableCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableMFA}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
