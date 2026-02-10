"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { whatsappService, handleApiError } from "@/services"
import { useOrganizationStore } from "@/stores"
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
import { Loader2, ArrowLeft } from "lucide-react"

type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
type HeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"

export default function WhatsAppTemplateCreatePage() {
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

  const resetCreateForm = () => {
    setTemplateName("")
    setTemplateLanguage("fr")
    setTemplateCategory("UTILITY")
    setTemplateBody("")
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

        setTemplateBody(bodyComponent?.text || "")
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
    components.push({ type: "BODY", text: body })
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
          toast.success("Template créé")
          resetCreateForm()
          postToParent({ type: "whatsapp-template:created" })
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
                    header_handle: [headerMediaUrl || "https://example.com/media"],
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              Templates
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isEditMode ? "Modifier un template WhatsApp" : "Créer un template WhatsApp"}
            </h1>
            <p className="text-muted-foreground">
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
              <div className="rounded-lg border border-border/60 bg-muted/60 p-3 text-xs text-muted-foreground">
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
              <Label htmlFor="templateBody">Contenu (BODY)</Label>
              <Textarea
                id="templateBody"
                placeholder="Bonjour {{1}}, votre commande {{2}} est prête."
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Utilisez des variables comme {"{{1}}"} et {"{{2}}"} si besoin.
              </p>
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
                    <div key={index} className="rounded-lg border border-border/60 p-3 space-y-3">
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
              <div className="mx-auto w-full max-w-[320px] rounded-[36px] border border-border/70 bg-gradient-to-b from-muted/60 to-background p-4 shadow-[var(--shadow-md)]">
                <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-muted-foreground/30" />
                <div className="rounded-xl border border-border/60 bg-background p-3 shadow-[var(--shadow-sm)]">
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
