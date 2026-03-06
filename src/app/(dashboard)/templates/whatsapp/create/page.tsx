"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { whatsappService, handleApiError } from "@/services"
import { useOrganizationStore } from "@/stores"
import { cn } from "@/lib/utils"
import { WhatsAppTemplatePreview } from "@/components/whatsapp/whatsapp-template-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Plus, X, FileText as FileTextIcon, Image as ImageIcon } from "lucide-react"

type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
type HeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"

const BODY_VARIABLE_REGEX = /\{\{\s*(\d+)\s*\}\}/g
const ACCEPTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

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
      const result = await whatsappService.uploadMedia(file)
      const headerHandle = result.file_handle || result.media_id
      if (!headerHandle) {
        throw new Error("Aucun identifiant média retourné")
      }
      setHeaderMediaUrl(headerHandle)
      toast.success("Média uploadé")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'upload")
      setHeaderMediaPreviewUrl(null)
      setHeaderMediaFilename("")
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

  const addButton = () => {
    if (!canAddButton()) {
      toast.error("Limite de boutons atteinte")
      return
    }
    setButtons((prev) => [...prev, { type: "QUICK_REPLY", text: "" }])
  }

  const addBodyVariable = () => {
    const next = bodyVariableIndexes.length > 0 ? Math.max(...bodyVariableIndexes) + 1 : 1
    const token = `{{${next}}}`
    setTemplateBody((prev) => `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${token}`.trim())
    setBodyVariableExamples((prev) => ({ ...prev, [String(next)]: prev[String(next)] || "" }))
  }

  const draftTemplate = useMemo(() => {
    return {
      id: "draft",
      name: templateName || "Nouveau template",
      language: templateLanguage || "fr",
      status: "PENDING" as const,
      category: templateCategory as "UTILITY" | "MARKETING" | "AUTHENTICATION",
      components: [
        ...(includeHeader
          ? [
            headerFormat === "TEXT"
              ? { type: "HEADER" as const, format: "TEXT" as const, text: headerText.trim() || "Titre" }
              : {
                  type: "HEADER" as const,
                  format: headerFormat,
                  example: {
                    header_handle: [headerMediaPreviewUrl || headerMediaUrl || "https://example.com/media"],
                    ...(headerFormat === "DOCUMENT" && headerMediaFilename
                      ? { filename: headerMediaFilename }
                      : {}),
                  },
                },
            ]
          : []),
        ...(templateBody.trim() ? [{ type: "BODY" as const, text: templateBody.trim() }] : []),
        ...(includeFooter && footerText.trim()
          ? [{ type: "FOOTER" as const, text: footerText.trim() }]
          : []),
        ...(includeButtons && buttons.length > 0
          ? [
              {
                type: "BUTTONS" as const,
                buttons: buttons.map((btn) => ({
                  type: btn.type,
                  text: btn.text || "Bouton",
                  ...(btn.type === "URL" ? { url: btn.url || "https://example.com" } : {}),
                  ...(btn.type === "PHONE_NUMBER"
                    ? { phone_number: btn.phone_number || "+33123456789" }
                    : {}),
                })),
              },
            ]
          : []),
      ],
    }
  }, [
    buttons,
    footerText,
    headerFormat,
    headerMediaFilename,
    headerMediaPreviewUrl,
    headerMediaUrl,
    headerText,
    includeButtons,
    includeFooter,
    includeHeader,
    templateBody,
    templateCategory,
    templateLanguage,
    templateName,
  ])

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
            <div className="space-y-2">
              <Label htmlFor="templateName">Nom du template</Label>
              <Input
                id="templateName"
                placeholder="order_confirmation"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateLanguage">Langue</Label>
              <Input
                id="templateLanguage"
                placeholder="fr"
                value={templateLanguage}
                onChange={(e) => setTemplateLanguage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={templateCategory} onValueChange={setTemplateCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">Utilitaire</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Header (optionnel)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIncludeHeader((prev) => !prev)
                    if (includeHeader) {
                      setHeaderText("")
                      setHeaderFormat("TEXT")
                      handleHeaderMediaRemove()
                    }
                  }}
                >
                  {includeHeader ? "Retirer" : "Ajouter"}
                </Button>
              </div>
              {includeHeader && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(["TEXT", "IMAGE", "DOCUMENT"] as const).map((fmt) => (
                      <Button
                        key={fmt}
                        type="button"
                        variant={headerFormat === fmt ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setHeaderFormat(fmt)
                          if (fmt === "TEXT") {
                            handleHeaderMediaRemove()
                          } else {
                            setHeaderText("")
                          }
                        }}
                      >
                        {fmt === "TEXT" ? "Texte" : fmt === "IMAGE" ? "Image" : "Document"}
                      </Button>
                    ))}
                  </div>
                  {headerFormat === "TEXT" ? (
                    <Input
                      placeholder="Texte du header"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                    />
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="templateBody">Contenu (BODY)</Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="footerText">Footer (optionnel)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIncludeFooter((prev) => !prev)}
                >
                  {includeFooter ? "Retirer" : "Ajouter"}
                </Button>
              </div>
              {includeFooter && (
                <Input
                  id="footerText"
                  placeholder="Mentions ou infos complémentaires"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Boutons (optionnels)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIncludeButtons((prev) => !prev)
                    if (includeButtons) setButtons([])
                  }}
                >
                  {includeButtons ? "Retirer" : "Ajouter"}
                </Button>
              </div>

              {includeButtons && (
                <div className="space-y-3">
                  {buttons.map((btn, index) => (
                    <div key={index} className="rounded-lg border border-border/40 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Bouton {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setButtons((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          Supprimer
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={btn.type}
                          onValueChange={(value) =>
                            setButtons((prev) =>
                              prev.map((b, i) =>
                                i === index
                                  ? {
                                      ...b,
                                      type: value as ButtonType,
                                      url: value === "URL" ? b.url : undefined,
                                      phone_number: value === "PHONE_NUMBER" ? b.phone_number : undefined,
                                    }
                                  : b
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {getButtonModeExcluding(index) !== "CTA" && (
                              <SelectItem value="QUICK_REPLY">Quick reply</SelectItem>
                            )}
                            {getButtonModeExcluding(index) !== "QUICK_REPLY" && (
                              <SelectItem value="URL">Lien URL</SelectItem>
                            )}
                            {getButtonModeExcluding(index) !== "QUICK_REPLY" && (
                              <SelectItem value="PHONE_NUMBER">Numéro</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Texte</Label>
                        <Input
                          placeholder="Ex: Suivre ma commande"
                          value={btn.text}
                          onChange={(e) =>
                            setButtons((prev) =>
                              prev.map((b, i) => (i === index ? { ...b, text: e.target.value } : b))
                            )
                          }
                        />
                      </div>
                      {btn.type === "URL" && (
                        <div className="space-y-2">
                          <Label>URL</Label>
                          <Input
                            placeholder="https://example.com"
                            value={btn.url || ""}
                            onChange={(e) =>
                              setButtons((prev) =>
                                prev.map((b, i) => (i === index ? { ...b, url: e.target.value } : b))
                              )
                            }
                          />
                        </div>
                      )}
                      {btn.type === "PHONE_NUMBER" && (
                        <div className="space-y-2">
                          <Label>Numéro</Label>
                          <Input
                            placeholder="+33123456789"
                            value={btn.phone_number || ""}
                            onChange={(e) =>
                              setButtons((prev) =>
                                prev.map((b, i) =>
                                  i === index ? { ...b, phone_number: e.target.value } : b
                                )
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addButton}
                    disabled={!canAddButton()}
                  >
                    Ajouter un bouton
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Quick replies: max 3. Boutons URL/Téléphone: max 2 et non mélangeables avec Quick replies.
                  </p>
                </div>
              )}
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

        <Card>
          <CardHeader>
            <CardTitle>Aperçu mobile</CardTitle>
            <CardDescription>Prévisualisation en temps réel.</CardDescription>
          </CardHeader>
          <CardContent>
            {templateBody.trim() ? (
              <div className="mx-auto w-full max-w-[320px] rounded-[36px] border border-border/40 bg-gradient-to-b from-muted/60 to-background p-4">
                <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-muted-foreground/30" />
                <div className="rounded-xl border border-border/40 bg-background p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/20" />
                    <div>
                      <p className="text-xs font-semibold">WhatsApp Business</p>
                      <p className="text-[10px] text-muted-foreground">Aperçu</p>
                    </div>
                  </div>
                  <WhatsAppTemplatePreview template={draftTemplate} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ajoutez un contenu BODY pour afficher l&apos;aperçu.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
