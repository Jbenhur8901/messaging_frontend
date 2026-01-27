"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores"
import { authService, handleApiError } from "@/services"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Shield, Loader2, ArrowLeft } from "lucide-react"

export default function Verify2FAPage() {
  const router = useRouter()
  const {
    mfaPreAuthToken,
    setRequiresMFAVerification,
    completeMFA,
    isAuthenticated,
    requiresMFAVerification,
    setApiKey,
    setUser,
  } = useAuthStore()
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Navigate to dashboard when verification is complete and state is updated
  useEffect(() => {
    console.log("Auth state:", { verificationComplete, isAuthenticated, requiresMFAVerification })
    if (verificationComplete && isAuthenticated && !requiresMFAVerification) {
      console.log("Navigating to dashboard...")
      router.replace("/dashboard")
    }
  }, [verificationComplete, isAuthenticated, requiresMFAVerification, router])

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()

    if (!mfaPreAuthToken && typeof window !== "undefined") {
      const storedToken = sessionStorage.getItem("mfa_pre_auth_token")
      if (storedToken) {
        setRequiresMFAVerification(true, storedToken)
        return
      }
    }

    if (!mfaPreAuthToken) {
      router.replace("/auth/login")
    }
  }, [mfaPreAuthToken, router, setRequiresMFAVerification])

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Veuillez entrer un code à 6 chiffres")
      return
    }

    if (!mfaPreAuthToken) {
      toast.error("Session expirée, veuillez vous reconnecter")
      router.replace("/auth/login")
      return
    }

    setIsVerifying(true)
    try {
      console.log("Verifying MFA challenge...")
      const result = await authService.verifyMFA(mfaPreAuthToken, code)
      if (!result.session) {
        throw new Error("Session MFA manquante")
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(result.user))
      }
      if (result.user?.api_key) {
        const key = result.user.api_key as unknown
        if (typeof key === "string") {
          setApiKey(key)
        } else if (key && typeof key === "object" && typeof (key as { key?: string }).key === "string") {
          setApiKey((key as { key: string }).key)
        }
      }

      if (!result.user.api_key) {
        try {
          const createdKey = await authService.createApiKey("Clé par défaut", "live")
          if (createdKey.success) {
            setApiKey(createdKey.api_key)
            const updatedUser = { ...result.user, api_key: createdKey.api_key, api_key_id: createdKey.key_id }
            setUser(updatedUser)
            if (typeof window !== "undefined") {
              localStorage.setItem("user", JSON.stringify(updatedUser))
            }
          }
        } catch {
          // Ignore API key creation errors here
        }
      }
      console.log("MFA verification successful")

      // Complete authentication
      completeMFA()
      setVerificationComplete(true)
      console.log("State updated")

      toast.success("Authentification réussie")

      // Navigate after a short delay to ensure state is persisted
      setTimeout(() => {
        console.log("Navigating to dashboard via timeout...")
        router.replace("/dashboard")
      }, 100)
    } catch (error) {
      console.error("MFA verification failed:", error)
      const apiError = handleApiError(error)
      toast.error(apiError.message || "Code invalide")
      setCode("")
      inputRef.current?.focus()

    } finally {
      setIsVerifying(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.length === 6) {
      handleVerify()
    }
  }

  const handleCancel = () => {
    setRequiresMFAVerification(false)
    router.replace("/auth/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Vérification en deux étapes</CardTitle>
          <CardDescription>
            Entrez le code de votre application d&apos;authentification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={handleKeyDown}
              className="text-center text-3xl tracking-[0.5em] font-mono h-14"
              disabled={isVerifying}
            />
            <p className="text-xs text-muted-foreground text-center">
              Ouvrez votre application d&apos;authentification et entrez le code affiché
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || isVerifying}
              className="w-full"
              size="lg"
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
              className="w-full"
              disabled={isVerifying}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
