"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuthStore } from "@/stores"
import { authService, handleApiError } from "@/services"
import { authStorage } from "@/lib/auth-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { OTPInput } from "@/components/ui/otp-input"
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
  AlertTriangle,
  KeyRound,
} from "lucide-react"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const { user, setUser } = useAuthStore()

  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaVerifiedAt, setMfaVerifiedAt] = useState<string | null>(null)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState<number | null>(null)
  const [backupCodesLow, setBackupCodesLow] = useState(false)
  const [accountLocked, setAccountLocked] = useState(false)
  const [isLoadingMFA, setIsLoadingMFA] = useState(true)

  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollmentData, setEnrollmentData] = useState<{
    qr_code: string
    secret?: string
    provisioning_uri?: string
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [showEnrollDialog, setShowEnrollDialog] = useState(false)
  const [enrollStep, setEnrollStep] = useState<1 | 2 | 3>(1)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [hasSavedBackupCodes, setHasSavedBackupCodes] = useState(false)
  const [isRegeneratingBackupCodes, setIsRegeneratingBackupCodes] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [regenerateCode, setRegenerateCode] = useState("")

  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [disableStep, setDisableStep] = useState<1 | 2>(1)
  const [disablePassword, setDisablePassword] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [isDisablingMFA, setIsDisablingMFA] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const isMFAAvailable = true

  const resetEnrollmentState = () => {
    setShowEnrollDialog(false)
    setEnrollStep(1)
    setEnrollmentData(null)
    setVerificationCode("")
    setBackupCodes([])
    setHasSavedBackupCodes(false)
    setIsVerifying(false)
  }

  const loadMFAStatus = async () => {
    const token = authStorage.getItem("access_token")
    if (!token || !isMFAAvailable) {
      setIsLoadingMFA(false)
      return
    }

    try {
      const status = await authService.getMFAStatus()
      setMfaEnabled(status.mfa_enabled)
      setMfaVerifiedAt(status.mfa_verified_at || null)
      setBackupCodesRemaining(
        typeof status.backup_codes_remaining === "number" ? status.backup_codes_remaining : null
      )
      setBackupCodesLow(Boolean(status.backup_codes_low))
      setAccountLocked(Boolean(status.account_locked))
    } catch {
      setMfaEnabled(false)
      setMfaVerifiedAt(null)
      setBackupCodesRemaining(null)
      setBackupCodesLow(false)
      setAccountLocked(false)
    } finally {
      setIsLoadingMFA(false)
    }
  }

  useEffect(() => {
    void loadMFAStatus()
  }, [isMFAAvailable])

  useEffect(() => {
    if (searchParams.get("setup2fa") === "true") {
      void openEnrollmentDialog()
      window.history.replaceState({}, "", "/settings")
    }
  }, [searchParams])

  const openEnrollmentDialog = async () => {
    setShowEnrollDialog(true)
    setEnrollStep(1)
    setVerificationCode("")
    setBackupCodes([])
    setHasSavedBackupCodes(false)

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
      resetEnrollmentState()
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleVerifyEnrollment = async (otp?: string) => {
    const code = otp ?? verificationCode
    if (!enrollmentData || code.length !== 6) {
      toast.error("Veuillez entrer un code à 6 chiffres")
      return
    }

    setIsVerifying(true)
    try {
      const result = await authService.verifyMFASetup(code)
      setBackupCodes(result.backup_codes || [])
      setMfaEnabled(true)
      setEnrollStep(3)
      setHasSavedBackupCodes(false)

      if (user) {
        setUser({ ...user, mfa_enabled: true })
      }

      await loadMFAStatus()
      toast.success("Authentification à double facteur activée")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message || "Code invalide")
      setVerificationCode("")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    if (regenerateCode.length !== 6) {
      toast.error("Veuillez entrer un code à 6 chiffres")
      return
    }

    setIsRegeneratingBackupCodes(true)
    try {
      const result = await authService.regenerateBackupCodes(regenerateCode)
      setBackupCodes(result.backup_codes || [])
      setHasSavedBackupCodes(false)
      setEnrollStep(3)
      setShowEnrollDialog(true)
      setShowRegenerateDialog(false)
      setRegenerateCode("")
      await loadMFAStatus()
      toast.success("Nouveaux codes générés")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsRegeneratingBackupCodes(false)
    }
  }

  const handleDisableMFA = async () => {
    if (!disablePassword.trim()) {
      toast.error("Veuillez confirmer votre mot de passe")
      return
    }

    if (disableCode.length !== 6) {
      toast.error("Veuillez entrer un code à 6 chiffres")
      return
    }

    setIsDisablingMFA(true)
    try {
      await authService.disableMFA(disableCode)
      setMfaEnabled(false)
      setMfaVerifiedAt(null)
      setBackupCodesRemaining(null)
      setBackupCodesLow(false)
      setAccountLocked(false)

      if (user) {
        setUser({ ...user, mfa_enabled: false })
      }

      toast.success("Authentification à double facteur désactivée")
      setShowDisableDialog(false)
      setDisableCode("")
      setDisablePassword("")
      setDisableStep(1)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsDisablingMFA(false)
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
          <div className="space-y-1.5">
            <Label className="text-[13px]">Organisation</Label>
            <Input value={user?.organization_name || ""} disabled className="h-9 text-[13px] rounded-lg" />
          </div>
        </div>

        {isMFAAvailable && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Authentification à double facteur
                </h2>
              </div>
              {hasActiveMFA && (
                <Badge variant="success" className="text-[10px] h-5 gap-1">
                  <CheckCircle className="h-2.5 w-2.5" />
                  Activé
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ajoutez une couche de sécurité supplémentaire à votre compte.
            </p>

            {isLoadingMFA ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : hasActiveMFA ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[13px] font-medium">Application d'authentification</p>
                      <p className="text-[11px] text-muted-foreground">
                        {mfaVerifiedAt
                          ? `Vérifié le ${new Date(mfaVerifiedAt).toLocaleDateString("fr-FR")}`
                          : "Vérifié"}
                      </p>
                      {backupCodesRemaining !== null && (
                        <p className="text-[11px] text-muted-foreground">
                          Codes de récupération restants : {backupCodesRemaining}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="h-7 text-[12px] rounded-lg gap-1.5"
                    onClick={() => {
                      setShowDisableDialog(true)
                      setDisableStep(1)
                      setDisableCode("")
                      setDisablePassword("")
                    }}
                  >
                    <ShieldOff className="h-3 w-3" />
                    Désactiver
                  </Button>
                </div>

                {(backupCodesLow || (backupCodesRemaining !== null && backupCodesRemaining <= 2)) && (
                  <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900">
                    Peu de codes de récupération restants. Régénérez-les dès maintenant.
                  </div>
                )}

                {accountLocked && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive">
                    Compte temporairement verrouillé à cause d'échecs MFA récents.
                  </div>
                )}

                <Button
                  variant="outline"
                  className="h-8 text-[13px] rounded-lg gap-1.5"
                  onClick={() => setShowRegenerateDialog(true)}
                  disabled={isRegeneratingBackupCodes}
                >
                  {isRegeneratingBackupCodes ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  Régénérer les codes de récupération
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <ShieldOff className="h-7 w-7 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="text-[13px] font-medium mb-1">2FA non configuré</h3>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Protégez votre compte avec une application d'authentification.
                </p>
                <Button
                  className="h-8 text-[13px] rounded-lg gap-1.5"
                  onClick={() => void openEnrollmentDialog()}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Activer le 2FA
                </Button>
              </div>
            )}
          </div>
        )}

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

      <Dialog
        open={showEnrollDialog}
        onOpenChange={(open) => {
          if (!open && enrollStep === 3 && backupCodes.length > 0 && !hasSavedBackupCodes) {
            toast.error("Confirmez la sauvegarde de vos codes avant de fermer")
            return
          }
          if (!open) {
            resetEnrollmentState()
            return
          }
          setShowEnrollDialog(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Configurer l'authentification 2FA</DialogTitle>
            <DialogDescription className="text-[13px]">
              Étape {enrollStep}/3
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full ${step <= enrollStep ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          {isEnrolling ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5 py-3">
              {enrollStep === 1 && enrollmentData && (
                <>
                  <div className="flex justify-center">
                    <div className="rounded-xl border border-border/40 bg-white p-4">
                      <img src={enrollmentData.qr_code} alt="QR Code" className="h-44 w-44" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Ou entrez ce code manuellement :</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg border border-border/40 bg-muted/60 px-3 py-2 text-[12px] font-mono">
                        {enrollmentData.secret || "Secret masqué par le backend"}
                      </code>
                      {enrollmentData.secret && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => copyToClipboard(enrollmentData.secret as string)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {enrollStep === 2 && (
                <div className="space-y-3">
                  <Label className="text-[13px]">Entrez le code de vérification</Label>
                  <OTPInput
                    value={verificationCode}
                    onChange={setVerificationCode}
                    onComplete={(otp) => {
                      if (!isVerifying) {
                        void handleVerifyEnrollment(otp)
                      }
                    }}
                    disabled={isVerifying}
                  />
                </div>
              )}

              {enrollStep === 3 && (
                <div className="space-y-3 rounded-xl border border-border/40 bg-muted/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-medium">Codes de récupération</p>
                      <p className="text-[11px] text-muted-foreground">
                        Conservez-les en lieu sûr. Ils ne seront affichés qu'une seule fois.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-7 text-[12px] rounded-lg gap-1"
                      onClick={() => copyToClipboard(backupCodes.join("\n"))}
                    >
                      <Copy className="h-3 w-3" />
                      Copier
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[12px] font-mono">
                    {backupCodes.map((code, idx) => (
                      <div key={`${code}-${idx}`} className="rounded-lg border border-border/40 bg-background px-2 py-1.5 text-center">
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="saved-backup-codes"
                      checked={hasSavedBackupCodes}
                      onCheckedChange={(checked) => setHasSavedBackupCodes(checked === true)}
                    />
                    <Label htmlFor="saved-backup-codes" className="text-[12px]">
                      J'ai sauvegardé mes codes de récupération
                    </Label>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {enrollStep === 1 && (
              <>
                <Button variant="outline" className="h-8 text-[13px] rounded-lg" onClick={resetEnrollmentState}>
                  Annuler
                </Button>
                <Button
                  className="h-8 text-[13px] rounded-lg"
                  onClick={() => setEnrollStep(2)}
                  disabled={!enrollmentData}
                >
                  Continuer
                </Button>
              </>
            )}

            {enrollStep === 2 && (
              <>
                <Button variant="outline" className="h-8 text-[13px] rounded-lg" onClick={() => setEnrollStep(1)}>
                  Retour
                </Button>
                <Button
                  className="h-8 text-[13px] rounded-lg"
                  onClick={() => void handleVerifyEnrollment()}
                  disabled={!enrollmentData || verificationCode.length !== 6 || isVerifying}
                >
                  {isVerifying && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Vérifier et activer
                </Button>
              </>
            )}

            {enrollStep === 3 && (
              <Button
                className="h-8 text-[13px] rounded-lg"
                onClick={resetEnrollmentState}
                disabled={!hasSavedBackupCodes}
              >
                Terminer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showRegenerateDialog}
        onOpenChange={(open) => {
          setShowRegenerateDialog(open)
          if (!open) {
            setRegenerateCode("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Régénérer les codes de récupération</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              Entrez un code TOTP valide pour générer de nouveaux codes.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="regenerateCode" className="text-[13px]">Code d'authentification</Label>
            <Input
              id="regenerateCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={regenerateCode}
              onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, ""))}
              className="h-9 text-[13px] rounded-lg"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-[13px] rounded-lg">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleRegenerateBackupCodes()
              }}
              className="h-8 text-[13px] rounded-lg"
            >
              {isRegeneratingBackupCodes && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Régénérer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDisableDialog}
        onOpenChange={(open) => {
          setShowDisableDialog(open)
          if (!open) {
            setDisableStep(1)
            setDisablePassword("")
            setDisableCode("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Désactiver l'authentification 2FA ?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              Cette action réduira la sécurité de votre compte.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <span>Attention: la désactivation du 2FA expose davantage votre compte aux accès non autorisés.</span>
          </div>

          {disableStep === 1 ? (
            <div className="space-y-1.5">
              <Label htmlFor="disablePassword" className="text-[13px]">Mot de passe actuel</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="h-9 text-[13px] rounded-lg"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="disableCode" className="text-[13px]">Code d'authentification</Label>
              <Input
                id="disableCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                className="h-9 text-[13px] rounded-lg"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-[13px] rounded-lg">Annuler</AlertDialogCancel>
            {disableStep === 1 ? (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  if (!disablePassword.trim()) {
                    toast.error("Veuillez entrer votre mot de passe")
                    return
                  }
                  setDisableStep(2)
                }}
                className="h-8 text-[13px] rounded-lg"
              >
                Continuer
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  void handleDisableMFA()
                }}
                className="h-8 text-[13px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDisablingMFA && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Désactiver
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
