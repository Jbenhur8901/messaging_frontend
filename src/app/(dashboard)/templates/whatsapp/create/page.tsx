"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { whatsappService, handleApiError } from "@/services"
import { uploadMediaToBackend } from "@/lib/media-upload"
import { useOrganizationStore } from "@/stores"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Plus, X, FileText as FileTextIcon, Image as ImageIcon, ChevronLeft, MoreVertical, Video, Phone, ExternalLink, MessageCircle, CheckCheck, Wifi, Battery, Link2, Reply, PhoneCall, Trash2 } from "lucide-react"

type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
type HeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"

const BODY_VARIABLE_REGEX = /\{\{\s*(\d+)\s*\}\}/g
const ACCEPTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

const normalizeTemplateName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^[^a-z]+/, "")

const extractBodyVariableIndexes = (value: string): number[] => {
  const found = new Set<number>()
  for (const match of value.matchAll(new RegExp(BODY_VARIABLE_REGEX.source, "g"))) {
    const parsed = Number.parseInt(match[1], 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      found.add(parsed)
    }
  }
  return Array.from(found).sort((a, b) => a - b)
}

function HeaderMediaUpload({
  format,
  mediaUrl,
  mediaFilename,
  previewUrl,
  isUploading,
  onUpload,
  onRemove,
}: {
  format: "IMAGE" | "DOCUMENT"
  mediaUrl: string
  mediaFilename: string
  previewUrl: string | null
  isUploading: boolean
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const accept = format === "IMAGE" ? "image/*" : "application/pdf"

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onUpload(files[0])
  }

  const displayUrl = previewUrl || mediaUrl

  if (isUploading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border/40 bg-muted/30 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Upload en cours...</span>
      </div>
    )
  }

  if (displayUrl) {
    return (
      <div className="relative rounded-lg border border-border/40 bg-muted/30 p-3">
        {format === "IMAGE" ? (
          <div className="relative">
            <img
              src={displayUrl}
              alt="Header"
              className="max-h-40 rounded-md object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <FileTextIcon className="h-5 w-5 text-red-600" />
            </div>
            <span className="flex-1 truncate text-sm">{mediaFilename || "document.pdf"}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
        isDragOver
          ? "border-primary/60 bg-primary/5"
          : "border-border/40 bg-muted/30 hover:border-border"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {format === "IMAGE" ? (
        <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
      ) : (
        <FileTextIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
      )}
      <p className="text-sm text-muted-foreground">
        Glissez-déposez ou <span className="text-primary font-medium">parcourez</span>
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {format === "IMAGE" ? "JPG, PNG, WEBP" : "PDF uniquement"}
      </p>
    </div>
  )
}

export default function WhatsAppTemplateCreatePage() {
  const router = useRouter()
  const { currentOrganization } = useOrganizationStore()
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get("embed") === "1"
  const templateId = searchParams.get("id")
  const isEditMode = Boolean(templateId)

  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateLanguage, setTemplateLanguage] = useState("fr")
  const [templateCategory, setTemplateCategory] = useState("UTILITY")
  const [templateBody, setTemplateBody] = useState("")
  const [bodyVariableExamples, setBodyVariableExamples] = useState<Record<string, string>>({})
  const [includeHeader, setIncludeHeader] = useState(false)
  const [headerText, setHeaderText] = useState("")
  const [headerFormat, setHeaderFormat] = useState<HeaderFormat>("TEXT")
  const [headerMediaUrl, setHeaderMediaUrl] = useState("")
  const [headerMediaFilename, setHeaderMediaFilename] = useState("")
  const [headerMediaPreviewUrl, setHeaderMediaPreviewUrl] = useState<string | null>(null)
  const [isUploadingHeader, setIsUploadingHeader] = useState(false)
  const [includeFooter, setIncludeFooter] = useState(false)
  const [footerText, setFooterText] = useState("")
  const [includeButtons, setIncludeButtons] = useState(false)
  const [buttons, setButtons] = useState<
    Array<{ type: ButtonType; text: string; url?: string; phone_number?: string }>
  >([])
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const bodyVariableIndexes = useMemo(() => extractBodyVariableIndexes(templateBody), [templateBody])

  const resetCreateForm = () => {
    setTemplateName("")
    setTemplateLanguage("fr")
    setTemplateCategory("UTILITY")
    setTemplateBody("")
    setBodyVariableExamples({})
    setIncludeHeader(false)
    setHeaderText("")
    setHeaderFormat("TEXT")
    setHeaderMediaUrl("")
    setHeaderMediaFilename("")
    if (headerMediaPreviewUrl) {
      URL.revokeObjectURL(headerMediaPreviewUrl)
    }
    setHeaderMediaPreviewUrl(null)
    setIsUploadingHeader(false)
    setIncludeFooter(false)
    setFooterText("")
    setIncludeButtons(false)
    setButtons([])
    setTrackingEnabled(false)
  }

  const handleHeaderMediaUpload = useCallback(async (file: File) => {
    if (headerFormat === "IMAGE" && !ACCEPTED_IMAGE_MIME_TYPES.has(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG ou WEBP")
      return
    }
    if (headerFormat === "DOCUMENT" && file.type !== "application/pdf") {
      toast.error("Veuillez sélectionner un fichier PDF")
      return
    }

    if (headerMediaPreviewUrl) {
      URL.revokeObjectURL(headerMediaPreviewUrl)
    }
    const localPreview = URL.createObjectURL(file)
    setHeaderMediaPreviewUrl(localPreview)
    setHeaderMediaFilename(file.name)
    setIsUploadingHeader(true)

    try {
      const result = await uploadMediaToBackend(file)
      const fileHandle = result.file_handle?.trim() || ""
      setHeaderMediaUrl(fileHandle)
      if (fileHandle) {
        toast.success("Média uploadé")
      } else {
        toast.message("Média uploadé, mais aucun file_handle template n'a été retourné")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'upload")
      setHeaderMediaPreviewUrl(null)
      setHeaderMediaFilename("")
      setHeaderMediaUrl("")
    } finally {
      setIsUploadingHeader(false)
    }
  }, [headerFormat, headerMediaPreviewUrl])

  const handleHeaderMediaRemove = useCallback(() => {
    if (headerMediaPreviewUrl) {
      URL.revokeObjectURL(headerMediaPreviewUrl)
    }
    setHeaderMediaUrl("")
    setHeaderMediaFilename("")
    setHeaderMediaPreviewUrl(null)
  }, [headerMediaPreviewUrl])

  useEffect(() => {
    return () => {
      if (headerMediaPreviewUrl) URL.revokeObjectURL(headerMediaPreviewUrl)
    }
  }, [headerMediaPreviewUrl])

  const postToParent = (payload: Record<string, unknown>) => {
    if (typeof window === "undefined") return
    if (window.parent) {
      window.parent.postMessage(payload, window.location.origin)
    }
  }

  useEffect(() => {
    if (!templateId) return
    setIsLoadingTemplate(true)
    whatsappService.getTemplate(templateId)
      .then((template) => {
        setTemplateName(template.name || "")
        setTemplateLanguage(template.language || "fr")
        setTemplateCategory(template.category || "UTILITY")

        const headerComponent = template.components.find((c) => c.type === "HEADER")
        const bodyComponent = template.components.find((c) => c.type === "BODY")
        const footerComponent = template.components.find((c) => c.type === "FOOTER")
        const buttonsComponent = template.components.find((c) => c.type === "BUTTONS")

        if (headerComponent) {
          setIncludeHeader(true)
          const format = (headerComponent.format || "TEXT") as HeaderFormat
          setHeaderFormat(format)
          if (format === "TEXT") {
            setHeaderText(headerComponent.text || "")
            setHeaderMediaUrl("")
            setHeaderMediaFilename("")
          } else {
            setHeaderText("")
            setHeaderMediaUrl(headerComponent.example?.header_handle?.[0] || "")
            setHeaderMediaFilename(headerComponent.example?.filename || "")
          }
        } else {
          setIncludeHeader(false)
          setHeaderText("")
          setHeaderMediaUrl("")
          setHeaderMediaFilename("")
        }

        const loadedBody = bodyComponent?.text || ""
        setTemplateBody(loadedBody)
        const loadedBodyVars = extractBodyVariableIndexes(loadedBody)
        const loadedBodyExamples = bodyComponent?.example?.body_text?.[0] || []
        if (loadedBodyVars.length > 0) {
          setBodyVariableExamples(
            loadedBodyVars.reduce<Record<string, string>>((acc, variableNumber, index) => {
              const value = loadedBodyExamples[index]
              acc[String(variableNumber)] = typeof value === "string" ? value : ""
              return acc
            }, {})
          )
        } else {
          setBodyVariableExamples({})
        }
        if (footerComponent?.text) {
          setIncludeFooter(true)
          setFooterText(footerComponent.text)
        } else {
          setIncludeFooter(false)
          setFooterText("")
        }

        if (buttonsComponent?.buttons && buttonsComponent.buttons.length > 0) {
          setIncludeButtons(true)
          setButtons(
            buttonsComponent.buttons.map((btn) => ({
              type: btn.type as ButtonType,
              text: btn.text || "",
              url: btn.url,
              phone_number: btn.phone_number,
            }))
          )
        } else {
          setIncludeButtons(false)
          setButtons([])
        }
      })
      .catch((error) => {
        const apiError = handleApiError(error)
        toast.error(apiError.message)
      })
      .finally(() => {
        setIsLoadingTemplate(false)
      })
  }, [templateId])

  useEffect(() => {
    setBodyVariableExamples((prev) =>
      bodyVariableIndexes.reduce<Record<string, string>>((acc, variableNumber) => {
        const key = String(variableNumber)
        acc[key] = prev[key] || ""
        return acc
      }, {})
    )
  }, [bodyVariableIndexes])

  const handleSaveTemplate = async () => {
    if (!currentOrganization?.id) {
      toast.error("Aucune organisation sélectionnée")
      return
    }

    const name = templateName.trim()
    const language = templateLanguage.trim()
    const body = templateBody.trim()

    if (!name || !language || !body) {
      toast.error("Nom, langue et contenu sont requis")
      return
    }

    const hasNonSequentialVariables = bodyVariableIndexes.some((variableNumber, index) => variableNumber !== index + 1)
    if (hasNonSequentialVariables) {
      toast.error("Les variables BODY doivent être numérotées sans trou: {{1}}, {{2}}, {{3}}...")
      return
    }

    if (bodyVariableIndexes.length > 0) {
      const missingExampleVariable = bodyVariableIndexes.find((variableNumber) => {
        const value = bodyVariableExamples[String(variableNumber)]
        return !value || !value.trim()
      })
      if (missingExampleVariable) {
        toast.error(`Renseignez un exemple pour la variable {{${missingExampleVariable}}}`)
        return
      }
    }

    if (includeHeader && !headerText.trim()) {
      if (headerFormat === "TEXT") {
        toast.error("Le header est activé mais vide")
        return
      }
    }

    if (includeHeader && headerFormat !== "TEXT" && !headerMediaUrl.trim()) {
      if (isUploadingHeader) {
        toast.error("Upload en cours, veuillez patienter")
      } else {
        toast.error("Veuillez uploader un média pour le header")
      }
      return
    }

    if (includeFooter && !footerText.trim()) {
      toast.error("Le footer est activé mais vide")
      return
    }

    if (includeButtons) {
      if (buttons.length === 0) {
        toast.error("Ajoutez au moins un bouton")
        return
      }
      const invalidButton = buttons.find((btn) => {
        if (!btn.text.trim()) return true
        if (btn.type === "URL" && !btn.url?.trim()) return true
        if (btn.type === "PHONE_NUMBER" && !btn.phone_number?.trim()) return true
        return false
      })
      if (invalidButton) {
        toast.error("Tous les boutons doivent être correctement remplis")
        return
      }
    }

    const components: Array<Record<string, unknown>> = []
    if (includeHeader) {
      if (headerFormat === "TEXT") {
        components.push({ type: "HEADER", format: "TEXT", text: headerText.trim() })
      } else {
        const example: Record<string, unknown> = { header_handle: [headerMediaUrl.trim()] }
        if (headerFormat === "DOCUMENT" && headerMediaFilename.trim()) {
          example.filename = headerMediaFilename.trim()
        }
        components.push({
          type: "HEADER",
          format: headerFormat,
          example,
        })
      }
    }
    components.push({
      type: "BODY",
      text: body,
      ...(bodyVariableIndexes.length > 0
        ? {
            example: {
              body_text: [
                bodyVariableIndexes.map((variableNumber) =>
                  bodyVariableExamples[String(variableNumber)].trim()
                ),
              ],
            },
          }
        : {}),
    })
    if (includeFooter) {
      components.push({ type: "FOOTER", text: footerText.trim() })
    }
    if (includeButtons) {
      components.push({
        type: "BUTTONS",
        buttons: buttons.map((btn) => ({
          type: btn.type,
          text: btn.text.trim(),
          ...(btn.type === "URL" ? { url: btn.url?.trim() } : {}),
          ...(btn.type === "PHONE_NUMBER" ? { phone_number: btn.phone_number?.trim() } : {}),
        })),
      })
    }

    setIsSaving(true)
    try {
      const result = isEditMode && templateId
        ? await whatsappService.updateTemplate(templateId, {
            name,
            language,
            category: templateCategory,
            components,
          })
        : await whatsappService.createTemplate({
            name,
            language,
            category: templateCategory,
            components,
            tracking_enabled: trackingEnabled,
            tracking_destination_url: trackingEnabled
              ? buttons.find((button) => button.type === "URL")?.url?.trim()
              : undefined,
          })

      if (result.success) {
        if (isEditMode) {
          toast.success("Template mis à jour")
          postToParent({ type: "whatsapp-template:updated" })
        } else {
          postToParent({ type: "whatsapp-template:created" })
          if (isEmbedded) {
            toast.success("Template créé")
            resetCreateForm()
          } else {
            router.push("/templates/whatsapp?created=1&refresh=1")
          }
        }
      } else {
        toast.error(`Erreur lors de ${isEditMode ? "la mise à jour" : "la création"} du template`)
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }


  const getButtonMode = () => {
    if (buttons.length === 0) return null
    return buttons.some((btn) => btn.type === "QUICK_REPLY") ? "QUICK_REPLY" : "CTA"
  }

  const getButtonModeExcluding = (index: number) => {
    const others = buttons.filter((_, i) => i !== index)
    if (others.length === 0) return null
    return others.some((btn) => btn.type === "QUICK_REPLY") ? "QUICK_REPLY" : "CTA"
  }

  const canAddButton = () => {
    const mode = getButtonMode()
    if (mode === "CTA") return buttons.length < 2
    return buttons.length < 3
  }

  const addButton = (type: ButtonType) => {
    if (!canAddButton()) {
      toast.error("Limite de boutons atteinte")
      return
    }
    const mode = getButtonMode()
    if ((mode === "QUICK_REPLY" && type !== "QUICK_REPLY") || (mode === "CTA" && type === "QUICK_REPLY")) {
      toast.error("Meta ne permet pas de mélanger réponses rapides et boutons d’action")
      return
    }
    setIncludeButtons(true)
    setButtons((prev) => [...prev, { type, text: "" }])
  }

  const addBodyVariable = () => {
    const next = bodyVariableIndexes.length > 0 ? Math.max(...bodyVariableIndexes) + 1 : 1
    const token = `{{${next}}}`
    setTemplateBody((prev) => `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${token}`.trim())
    setBodyVariableExamples((prev) => ({ ...prev, [String(next)]: prev[String(next)] || "" }))
  }

  const previewBody = useMemo(
    () => templateBody.replace(BODY_VARIABLE_REGEX, (_, index: string) => bodyVariableExamples[index]?.trim() || `{{${index}}}`),
    [bodyVariableExamples, templateBody]
  )

  return (
    <div className={isEmbedded ? "p-6" : "space-y-6"}>
      {!isEmbedded && (
        <div className="flex items-center gap-4">
          <Link href="/templates/whatsapp">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">
              {isEditMode ? "Modifier un template WhatsApp" : "Créer un template WhatsApp"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Créez un template complet avec body, footer et boutons optionnels.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Détails du template</CardTitle>
            <CardDescription>
              {isEditMode
                ? "Modifiez les informations nécessaires pour mettre à jour le template."
                : "Remplissez les informations nécessaires pour soumettre le template."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingTemplate && (
              <div className="rounded-lg border border-border/40 bg-muted/60 p-3 text-xs text-muted-foreground">
                Chargement du template...
              </div>
            )}
            <div className="space-y-4 rounded-xl bg-muted/30 p-4">
              <div><p className="text-sm font-medium">Configuration</p><p className="mt-1 text-xs text-muted-foreground">Définissez l’identité utilisée par Meta pour classer et valider le template.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="templateName">Nom du template</Label>
                  <Input
                    id="templateName"
                    placeholder="confirmation_commande"
                    value={templateName}
                    onChange={(event) => setTemplateName(normalizeTemplateName(event.target.value))}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <p className="text-[11px] text-muted-foreground">Minuscules, chiffres et underscores uniquement.</p>
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={templateCategory} onValueChange={setTemplateCategory}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent><SelectItem value="UTILITY">Utilitaire</SelectItem><SelectItem value="MARKETING">Marketing</SelectItem><SelectItem value="AUTHENTICATION">Authentification</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateLanguage">Langue</Label>
                  <Select value={templateLanguage} onValueChange={setTemplateLanguage}>
                    <SelectTrigger id="templateLanguage"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="fr">Français</SelectItem><SelectItem value="en_US">Anglais (US)</SelectItem><SelectItem value="en">Anglais</SelectItem><SelectItem value="es">Espagnol</SelectItem><SelectItem value="pt_BR">Portugais (Brésil)</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl bg-muted/30 p-4">
              <div><p className="text-sm font-medium">Contenu</p><p className="mt-1 text-xs text-muted-foreground">Composez le message tel qu’il sera soumis à Meta.</p></div>
              <div className="space-y-2">
                <Label>En-tête <span className="font-normal text-muted-foreground">· Facultatif</span></Label>
                <Select
                  value={includeHeader ? headerFormat : "NONE"}
                  onValueChange={(value) => {
                    if (value === "NONE") {
                      setIncludeHeader(false); setHeaderText(""); setHeaderFormat("TEXT"); handleHeaderMediaRemove()
                    } else {
                      setIncludeHeader(true); setHeaderFormat(value as HeaderFormat)
                      if (value === "TEXT") handleHeaderMediaRemove(); else setHeaderText("")
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NONE">Aucun</SelectItem><SelectItem value="TEXT">Texte</SelectItem><SelectItem value="IMAGE">Image</SelectItem><SelectItem value="DOCUMENT">Document</SelectItem></SelectContent>
                </Select>
              </div>
              {includeHeader && (
                <div className="space-y-3">
                  {headerFormat === "TEXT" ? (
                    <Input placeholder="Texte de l’en-tête" value={headerText} onChange={(event) => setHeaderText(event.target.value)} />
                  ) : (
                    <HeaderMediaUpload
                      format={headerFormat as "IMAGE" | "DOCUMENT"}
                      mediaUrl={headerMediaUrl}
                      mediaFilename={headerMediaFilename}
                      previewUrl={headerMediaPreviewUrl}
                      isUploading={isUploadingHeader}
                      onUpload={handleHeaderMediaUpload}
                      onRemove={handleHeaderMediaRemove}
                    />
                  )}
                </div>
              )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div><Label htmlFor="templateBody">Corps du message</Label><p className="mt-0.5 text-[11px] text-muted-foreground">Obligatoire</p></div>
                <Button type="button" variant="outline" size="sm" onClick={addBodyVariable}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Ajouter une variable
                </Button>
              </div>
              <Textarea
                id="templateBody"
                placeholder="Bonjour {{1}}, votre commande {{2}} est prête."
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                rows={5}
              />
              <div className="rounded-lg border border-border/40 bg-muted/40 p-3">
                <p className="text-xs font-medium text-foreground">Variables détectées</p>
                {bodyVariableIndexes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bodyVariableIndexes.map((variableNumber) => (
                      <span
                        key={variableNumber}
                        className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                      >
                        {`{{${variableNumber}}}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aucune variable. Utilisez le bouton pour insérer automatiquement {"{{1}}"}, {"{{2}}"}, etc.
                  </p>
                )}
              </div>
              {bodyVariableIndexes.length > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-300/40 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
                    Exemples requis (Meta)
                  </p>
                  {bodyVariableIndexes.map((variableNumber) => (
                    <div key={variableNumber} className="space-y-1">
                      <Label htmlFor={`body-variable-example-${variableNumber}`} className="text-xs">
                        Exemple de valeur pour {`{{${variableNumber}}}`} *
                      </Label>
                      <Input
                        id={`body-variable-example-${variableNumber}`}
                        placeholder={`Exemple pour {{${variableNumber}}}`}
                        value={bodyVariableExamples[String(variableNumber)] || ""}
                        onChange={(e) =>
                          setBodyVariableExamples((prev) => ({
                            ...prev,
                            [String(variableNumber)]: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="footerText">Pied de page <span className="font-normal text-muted-foreground">· Facultatif</span></Label>
              <Input
                id="footerText"
                placeholder="Ex. Répondez STOP pour vous désabonner"
                value={footerText}
                onChange={(event) => {
                  setFooterText(event.target.value)
                  setIncludeFooter(event.target.value.length > 0)
                }}
                maxLength={60}
              />
              <p className="text-right text-[11px] tabular-nums text-muted-foreground">{footerText.length}/60</p>
            </div>
            </div>

            <div className="space-y-4 rounded-xl bg-muted/30 p-4">
              <div>
                <Label className="text-sm">Boutons du message</Label>
                <p className="mt-1 text-xs text-muted-foreground">Choisissez soit des réponses rapides, soit des boutons d’action conformément aux règles Meta.</p>
              </div>

              {buttons.length > 0 && (
                <div className="divide-y divide-border/60 rounded-lg bg-muted/25">
                  {buttons.map((btn, index) => (
                    <div key={index} className="space-y-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                          {btn.type === "URL" ? <Link2 className="h-4 w-4" /> : btn.type === "PHONE_NUMBER" ? <PhoneCall className="h-4 w-4" /> : <Reply className="h-4 w-4" />}
                        </div>
                        <Select
                          value={btn.type}
                          onValueChange={(value) => setButtons((prev) => prev.map((button, buttonIndex) => buttonIndex === index ? { ...button, type: value as ButtonType, url: value === "URL" ? button.url : undefined, phone_number: value === "PHONE_NUMBER" ? button.phone_number : undefined } : button))}
                        >
                          <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {getButtonModeExcluding(index) !== "CTA" && <SelectItem value="QUICK_REPLY">Réponse rapide</SelectItem>}
                            {getButtonModeExcluding(index) !== "QUICK_REPLY" && <SelectItem value="URL">Lien URL</SelectItem>}
                            {getButtonModeExcluding(index) !== "QUICK_REPLY" && <SelectItem value="PHONE_NUMBER">Appeler</SelectItem>}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">Bouton {index + 1}</span>
                        <Button type="button" variant="ghost" size="icon" className="ml-auto h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => setButtons((prev) => prev.filter((_, buttonIndex) => buttonIndex !== index))}>
                          <Trash2 className="h-4 w-4" /><span className="sr-only">Supprimer le bouton</span>
                        </Button>
                      </div>

                      <div className={cn("grid gap-3", btn.type === "QUICK_REPLY" ? "grid-cols-1" : "sm:grid-cols-2")}>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Libellé</Label>
                          <Input placeholder={btn.type === "QUICK_REPLY" ? "Ex. Oui, confirmer" : "Ex. Voir l’offre"} value={btn.text} onChange={(event) => setButtons((prev) => prev.map((button, buttonIndex) => buttonIndex === index ? { ...button, text: event.target.value } : button))} />
                        </div>
                        {btn.type === "URL" && (
                          <div className="space-y-1.5"><Label className="text-xs">Destination</Label><Input type="url" placeholder="https://example.com" value={btn.url || ""} onChange={(event) => setButtons((prev) => prev.map((button, buttonIndex) => buttonIndex === index ? { ...button, url: event.target.value } : button))} /></div>
                        )}
                        {btn.type === "PHONE_NUMBER" && (
                          <div className="space-y-1.5"><Label className="text-xs">Numéro</Label><Input type="tel" placeholder="+242 06 000 00 00" value={btn.phone_number || ""} onChange={(event) => setButtons((prev) => prev.map((button, buttonIndex) => buttonIndex === index ? { ...button, phone_number: event.target.value } : button))} /></div>
                        )}
                      </div>

                      {btn.type === "URL" && index === buttons.findIndex((button) => button.type === "URL") && (
                        <div className="flex items-center justify-between gap-4 rounded-lg bg-background/70 px-3 py-2.5">
                          <div><Label htmlFor="template-click-tracking" className="text-xs">Suivre les clics</Label><p className="mt-0.5 text-[11px] text-muted-foreground">Associer chaque clic au contact avant la redirection.</p></div>
                          <Switch id="template-click-tracking" checked={trackingEnabled} onCheckedChange={setTrackingEnabled} aria-label="Activer le suivi individuel des clics" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-lg bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {getButtonMode() === "QUICK_REPLY" ? "Réponses rapides" : getButtonMode() === "CTA" ? "Appels à l’action" : "Aucun bouton ajouté"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {getButtonMode() === "QUICK_REPLY"
                      ? `${buttons.length}/3 réponses rapides`
                      : getButtonMode() === "CTA"
                        ? `${buttons.length}/2 boutons d’action`
                        : "Meta autorise une seule famille de boutons par template."}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={!canAddButton()}>
                      <Plus className="mr-2 h-3.5 w-3.5" />Ajouter un bouton
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Réponses rapides</DropdownMenuLabel>
                    <DropdownMenuItem disabled={getButtonMode() === "CTA"} onClick={() => addButton("QUICK_REPLY")}>
                      <Reply className="mr-2 h-4 w-4" />Réponse personnalisée
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Appels à l’action</DropdownMenuLabel>
                    <DropdownMenuItem disabled={getButtonMode() === "QUICK_REPLY"} onClick={() => addButton("URL")}>
                      <Link2 className="mr-2 h-4 w-4" />Consulter un site web
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={getButtonMode() === "QUICK_REPLY"} onClick={() => addButton("PHONE_NUMBER")}>
                      <PhoneCall className="mr-2 h-4 w-4" />Appeler un numéro
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  resetCreateForm()
                  postToParent({ type: "whatsapp-template:close" })
                }}
                disabled={isSaving}
              >
                Fermer
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={isSaving || isUploadingHeader || isLoadingTemplate}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Aperçu mobile</CardTitle>
            <CardDescription>Rendu indicatif dans une conversation WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="mx-auto w-full max-w-[326px] rounded-[42px] bg-[#050505] p-[7px] shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
              <div className="relative min-h-[620px] overflow-hidden rounded-[36px] bg-[#0b141a] text-white">
                <div className="relative flex h-11 items-center justify-between px-5 text-[11px] font-semibold">
                  <span>9:41</span>
                  <div className="absolute left-1/2 top-2 h-[26px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
                  <div className="flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5" /><Battery className="h-4 w-4" /></div>
                </div>

                <div className="flex h-14 items-center gap-2 bg-[#202c33] px-2">
                  <ChevronLeft className="h-5 w-5 text-[#00a884]" />
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a3942]">
                    <MessageCircle className="h-5 w-5 text-[#00a884]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{currentOrganization?.name || "Votre entreprise"}</p>
                    <p className="text-[10px] text-[#aebac1]">compte professionnel</p>
                  </div>
                  <Video className="h-[18px] w-[18px] text-[#aebac1]" />
                  <Phone className="h-[17px] w-[17px] text-[#aebac1]" />
                  <MoreVertical className="h-[18px] w-[18px] text-[#aebac1]" />
                </div>

                <div className="relative flex min-h-[510px] flex-col px-3 py-5">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.025),transparent_28%),radial-gradient(circle_at_80%_62%,rgba(255,255,255,0.02),transparent_24%)]" />
                  <div className="relative mx-auto mb-5 rounded-md bg-[#182229] px-3 py-1 text-[9px] font-medium text-[#8696a0]">AUJOURD’HUI</div>

                  {templateBody.trim() ? (
                    <div className="relative ml-auto w-[88%] overflow-hidden rounded-lg rounded-tr-sm bg-[#005c4b] shadow-sm">
                      {includeHeader && headerFormat === "IMAGE" && (headerMediaPreviewUrl || headerMediaUrl) && (
                        <img src={headerMediaPreviewUrl || headerMediaUrl} alt="Aperçu du média" className="h-36 w-full object-cover" />
                      )}
                      {includeHeader && headerFormat === "DOCUMENT" && (
                        <div className="m-1.5 flex items-center gap-3 rounded-md bg-[#0b6655] p-3">
                          <FileTextIcon className="h-8 w-8 text-white/85" />
                          <span className="truncate text-xs">{headerMediaFilename || "Document.pdf"}</span>
                        </div>
                      )}
                      <div className="px-2.5 pb-1.5 pt-2">
                        {includeHeader && headerFormat === "TEXT" && headerText.trim() && <p className="mb-1 text-[13px] font-semibold leading-5">{headerText}</p>}
                        <p className="whitespace-pre-wrap text-[12px] leading-[1.45] text-[#e9edef]">{previewBody}</p>
                        {includeFooter && footerText.trim() && <p className="mt-1.5 text-[10px] text-[#aebac1]">{footerText}</p>}
                        <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-[#aebac1]">
                          <span>09:41</span><CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                        </div>
                      </div>
                      {includeButtons && buttons.length > 0 && (
                        <div className="divide-y divide-white/10 border-t border-white/10">
                          {buttons.map((button, index) => (
                            <div key={`${button.type}-${index}`} className="flex min-h-9 items-center justify-center gap-2 px-2 text-center text-[11px] font-medium text-[#53bdeb]">
                              {button.type === "URL" && <ExternalLink className="h-3.5 w-3.5" />}
                              {button.type === "PHONE_NUMBER" && <Phone className="h-3.5 w-3.5" />}
                              {button.type === "QUICK_REPLY" && <MessageCircle className="h-3.5 w-3.5" />}
                              <span className="truncate">{button.text || "Bouton"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative my-auto rounded-lg bg-[#182229] px-4 py-5 text-center text-xs leading-relaxed text-[#8696a0]">Saisissez le contenu du message pour voir son rendu ici.</div>
                  )}
                </div>

                <div className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/80" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
