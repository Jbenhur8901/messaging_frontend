"use client"

import { useEffect, useState } from "react"
import { whatsappService, handleApiError } from "@/services"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, HelpCircle, ExternalLink } from "lucide-react"

export default function WhatsAppConfigPage() {
  const { currentOrganization } = useOrganizationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Form state
  const [accessToken, setAccessToken] = useState("")
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [businessAccountId, setBusinessAccountId] = useState("")
  const [isEnabled, setIsEnabled] = useState(true)

  // Test result
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    phone_number?: string
  } | null>(null)

  useEffect(() => {
    loadConfig()
  }, [currentOrganization?.id])

  const loadConfig = async () => {
    if (!currentOrganization?.id) {
      setIsLoading(false)
      return
    }
    try {
      const result = await whatsappService.getConfig(currentOrganization.id)
      setIsConfigured(result.is_configured)
      const config = (result as { config?: unknown }).config ?? result
      if (config) {
        const accessTokenValue =
          (config as { access_token?: string }).access_token ||
          (config as { whatsapp_access_token?: string }).whatsapp_access_token
        const phoneNumberValue =
          (config as { phone_number_id?: string }).phone_number_id ||
          (config as { whatsapp_phone_number_id?: string }).whatsapp_phone_number_id
        const businessAccountValue =
          (config as { business_account_id?: string }).business_account_id ||
          (config as { whatsapp_business_account_id?: string }).whatsapp_business_account_id
        const enabledValue =
          (config as { enabled?: boolean }).enabled ??
          (config as { whatsapp_enabled?: boolean }).whatsapp_enabled

        // Token is masked for security
        setAccessToken(accessTokenValue ? "••••••••••••••••" : "")
        setPhoneNumberId(phoneNumberValue || "")
        setBusinessAccountId(businessAccountValue || "")
        setIsEnabled(enabledValue ?? true)
      }
    } catch (error) {
      console.error("Error loading config:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentOrganization?.id) {
      toast.error("Aucune organisation sélectionnée")
      return
    }
    if (!accessToken.trim() || !phoneNumberId.trim() || !businessAccountId.trim()) {
      toast.error("Tous les champs sont requis")
      return
    }

    // Don't save if token is masked (unchanged)
    if (accessToken === "••••••••••••••••") {
      toast.error("Veuillez entrer un nouveau jeton d'accès")
      return
    }

    setIsSaving(true)
    try {
      const result = await whatsappService.setConfig(currentOrganization.id, {
        access_token: accessToken,
        phone_number_id: phoneNumberId,
        business_account_id: businessAccountId,
        enabled: isEnabled,
      })
      if (result.success) {
        setIsConfigured(true)
        toast.success("Configuration sauvegardée")
        // Mask token after save
        setAccessToken("••••••••••••••••")
        setIsEditing(false)
      } else {
        toast.error(result.message || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!currentOrganization?.id) {
      toast.error("Aucune organisation sélectionnée")
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await whatsappService.testConfig(currentOrganization.id)
      setTestResult(result)
      if (result.success) {
        toast.success("Connexion réussie")
      } else {
        toast.error(result.message || "Échec du test")
      }
    } catch (error) {
      const apiError = handleApiError(error)
      setTestResult({ success: false, message: apiError.message })
      toast.error(apiError.message)
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              WhatsApp
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">Configuration WhatsApp</h1>
              <Badge variant={isConfigured ? "success" : "secondary"}>
                {isConfigured ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Configuré
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    Non configuré
                  </>
                )}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Configurez vos credentials WhatsApp Business API.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Credentials Meta</CardTitle>
            <CardDescription>
              Entrez vos credentials WhatsApp Business API depuis Meta Business Manager
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessToken">Jeton d&apos;accès (Access Token)</Label>
              <div className="relative">
                <Input
                  id="accessToken"
                  type={showToken ? "text" : "password"}
                  placeholder="EAAxxxxxx..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="pr-10"
                  disabled={isConfigured && !isEditing}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowToken(!showToken)}
                  disabled={isConfigured && !isEditing}
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">ID du numéro (Phone Number ID)</Label>
              <Input
                id="phoneNumberId"
                placeholder="123456789012345"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                disabled={isConfigured && !isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessAccountId">ID compte Business (Business Account ID)</Label>
              <Input
                id="businessAccountId"
                placeholder="123456789012345"
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
                disabled={isConfigured && !isEditing}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Activer WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  Désactive temporairement l&apos;envoi WhatsApp pour cette organisation.
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                aria-label="Activer WhatsApp"
                disabled={isConfigured && !isEditing}
              />
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`rounded-lg p-3 ${
                  testResult.success
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {testResult.success ? "Connexion réussie" : "Échec de la connexion"}
                  </span>
                </div>
                {testResult.phone_number && (
                  <p className="text-sm mt-1">
                    Numéro vérifié: {testResult.phone_number}
                  </p>
                )}
                {!testResult.success && (
                  <p className="text-sm mt-1">{testResult.message}</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !isConfigured}
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tester la connexion
              </Button>
              {isConfigured && !isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Modifier
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Comment obtenir ces credentials ?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="border-l-2 border-primary pl-4">
                <h4 className="font-medium">1. Accédez à Meta Business Manager</h4>
                <p className="text-sm text-muted-foreground">
                  Connectez-vous à{" "}
                  <a
                    href="https://business.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    business.facebook.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <div className="border-l-2 border-primary pl-4">
                <h4 className="font-medium">2. Configuration WhatsApp Business</h4>
                <p className="text-sm text-muted-foreground">
                  Allez dans les paramètres de votre compte WhatsApp Business API
                </p>
              </div>

              <div className="border-l-2 border-primary pl-4">
                <h4 className="font-medium">3. Générez un jeton d&apos;accès permanent</h4>
                <p className="text-sm text-muted-foreground">
                  Dans les paramètres de l&apos;API, créez un token avec les permissions{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">whatsapp_business_messaging</code>
                </p>
              </div>

              <div className="border-l-2 border-primary pl-4">
                <h4 className="font-medium">4. Récupérez les IDs</h4>
                <p className="text-sm text-muted-foreground">
                  Le Phone Number ID et Business Account ID sont visibles dans la section
                  &quot;Numéros de téléphone&quot;
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-medium text-sm mb-2">Documentation officielle</h4>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Guide de démarrage WhatsApp Cloud API
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
