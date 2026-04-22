"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores"
import { authService, handleApiError } from "@/services"
import { authStorage } from "@/lib/auth-storage"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OTPInput } from "@/components/ui/otp-input"
import { toast } from "sonner"
import { Shield, Loader2, ArrowLeft } from "lucide-react"

const MAX_ATTEMPTS = 5
const COOLDOWN_SECONDS = 30
const SESSION_ATTEMPTS_KEY = "mfa_verify_failed_attempts"
const SESSION_COOLDOWN_KEY = "mfa_verify_cooldown_until"

export default function Verify2FAPage() {
  const router = useRouter()
  const {
    mfaPreAuthToken,
    setRequiresMFAVerification,
    completeMFA,
    isAuthenticated,
    requiresMFAVerification,
    setUser,
  } = useAuthStore()

  const otpRef = useRef<HTMLInputElement>(null)
  const backupCodeRef = useRef<HTMLInputElement>(null)

  const [code, setCode] = useState("")
  const [backupCode, setBackupCode] = useState("")
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [nowTs, setNowTs] = useState(Date.now())

  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)

  const cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil - nowTs) / 1000))
  const isCooldownActive = cooldownRemaining > 0
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - failedAttempts)

  useEffect(() => {
    if (verificationComplete && isAuthenticated && !requiresMFAVerification) {
      router.replace("/dashboard")
    }
  }, [verificationComplete, isAuthenticated, requiresMFAVerification, router])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAttempts = Number(sessionStorage.getItem(SESSION_ATTEMPTS_KEY) || "0")
      const storedCooldown = Number(sessionStorage.getItem(SESSION_COOLDOWN_KEY) || "0")
      if (!Number.isNaN(storedAttempts) && storedAttempts > 0) {
        setFailedAttempts(Math.min(storedAttempts, MAX_ATTEMPTS))
      }
      if (!Number.isNaN(storedCooldown) && storedCooldown > Date.now()) {
        setCooldownUntil(storedCooldown)
      }
    }

    if (!mfaPreAuthToken && typeof window !== "undefined") {
      const storedToken = sessionStorage.getItem("mfa_pre_auth_token")
      if (storedToken) {
        setRequiresMFAVerification(true, storedToken)
        return
      }
    }

    if (!mfaPreAuthToken) {
      router.replace("/auth/login")
      return
    }

    otpRef.current?.focus()
  }, [mfaPreAuthToken, router, setRequiresMFAVerification])

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_ATTEMPTS_KEY, String(failedAttempts))
      sessionStorage.setItem(SESSION_COOLDOWN_KEY, String(cooldownUntil))
    }
  }, [failedAttempts, cooldownUntil])

  useEffect(() => {
    if (!isCooldownActive) return
    const interval = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [isCooldownActive])

  const resetCooldownState = () => {
    setFailedAttempts(0)
    setCooldownUntil(0)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_ATTEMPTS_KEY)
      sessionStorage.removeItem(SESSION_COOLDOWN_KEY)
    }
  }

  const triggerErrorFeedback = () => {
    setHasError(true)
    window.setTimeout(() => setHasError(false), 450)
  }

  const handleVerify = async (completedCode?: string) => {
    const providedCode = useBackupCode
      ? backupCode.trim()
      : (completedCode ?? code)

    const isValidInput = useBackupCode
      ? providedCode.length >= 8
      : providedCode.length === 6

    if (!isValidInput) {
      toast.error(useBackupCode ? "Veuillez entrer un code de récupération valide" : "Veuillez entrer un code à 6 chiffres")
      triggerErrorFeedback()
      return
    }

    if (isCooldownActive) {
      toast.error(`Trop de tentatives. Réessayez dans ${cooldownRemaining}s.`)
      return
    }

    if (!mfaPreAuthToken) {
      toast.error("Session expirée, veuillez vous reconnecter")
      router.replace("/auth/login")
      return
    }

    setIsVerifying(true)
    try {
      const result = await authService.verifyMFA(mfaPreAuthToken, providedCode)
      if (!result.session) {
        throw new Error("Session MFA manquante")
      }

      authStorage.setItem("user", JSON.stringify(result.user))
      setUser(result.user)
      completeMFA()
      setVerificationComplete(true)
      resetCooldownState()
      toast.success("Authentification réussie")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message || "Code invalide")
      triggerErrorFeedback()

      if (useBackupCode) {
        setBackupCode("")
        backupCodeRef.current?.focus()
      } else {
        setCode("")
        otpRef.current?.focus()
      }

      const nextAttempts = failedAttempts + 1
      if (nextAttempts >= MAX_ATTEMPTS) {
        setFailedAttempts(MAX_ATTEMPTS)
        setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000)
      } else {
        setFailedAttempts(nextAttempts)
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCancel = () => {
    setRequiresMFAVerification(false)
    resetCooldownState()
    router.replace("/auth/login")
  }

  return (
    <Card className="w-full border-0 bg-transparent p-0 shadow-none">
      <CardHeader className="space-y-4 p-0 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-[22px] font-bold text-white">
            Vérification en deux étapes
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {useBackupCode
              ? "Entrez un de vos codes de récupération."
              : "Entrez le code de votre application d'authentification."}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 px-0 pb-0 pt-8">
        <div className="space-y-4">
          {useBackupCode ? (
            <Input
              ref={backupCodeRef}
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.trim())}
              placeholder="XXXX-XXXX-XXXX"
              className={`h-12 bg-white/[0.03] border-white/10 text-white text-center text-lg tracking-widest placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all ${hasError ? "animate-shake border-destructive/50" : ""}`}
              disabled={isVerifying || isCooldownActive}
            />
          ) : (
            <div className={`flex justify-center transition-transform ${hasError ? "animate-shake" : ""}`}>
              <OTPInput
                ref={otpRef}
                value={code}
                onChange={setCode}
                onComplete={(fullCode) => {
                  if (!isVerifying && !isCooldownActive) {
                    void handleVerify(fullCode)
                  }
                }}
                hasError={hasError}
                disabled={isVerifying || isCooldownActive}
              />
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode((prev) => !prev)
                setCode("")
                setBackupCode("")
                setHasError(false)
              }}
              className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
              disabled={isVerifying}
            >
              {useBackupCode ? "Utiliser un code OTP" : "Utiliser un code de récupération"}
            </button>
          </div>

          <div className="h-5 flex items-center justify-center">
            {isCooldownActive ? (
              <p className="text-[11px] font-medium text-destructive animate-pulse">
                Trop de tentatives. Réessayez dans {cooldownRemaining}s.
              </p>
            ) : (
              failedAttempts > 0 && (
                <p className="text-[11px] font-medium text-muted-foreground/60">
                  {remainingAttempts} tentative{remainingAttempts > 1 ? "s" : ""} restante{remainingAttempts > 1 ? "s" : ""}
                </p>
              )
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => void handleVerify()}
            disabled={
              isVerifying ||
              isCooldownActive ||
              (useBackupCode ? backupCode.trim().length < 8 : code.length !== 6)
            }
            className="w-full h-11 text-[13px] font-bold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] bg-primary hover:bg-primary/90 text-black shadow-[0_10px_30px_-12px_rgba(255,204,0,0.35)]"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification...
              </>
            ) : (
              "Vérifier"
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleCancel}
            className="w-full h-11 text-[13px] text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl"
            disabled={isVerifying}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la connexion
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
