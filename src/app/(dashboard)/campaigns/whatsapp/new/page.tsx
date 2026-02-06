"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { whatsappService, contactsService, tagsService, handleApiError } from "@/services"
import type { WhatsAppTemplate, Contact, Tag } from "@/types"
import { WhatsAppTemplateSelector } from "@/components/whatsapp/whatsapp-template-selector"
import { WhatsAppTemplateCard } from "@/components/whatsapp/whatsapp-template-card"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Send, Users, Tags as TagsIcon, Phone, AlertTriangle, Settings, Sparkles } from "lucide-react"

type RecipientMode = "contacts" | "tags" | "manual"
type SendMode = "standard" | "personalized"

export default function NewWhatsAppCampaignPage() {
  const router = useRouter()
  const { currentOrganization } = useOrganizationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)

  // Data
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  // Form state
  const [campaignName, setCampaignName] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("contacts")
  const [sendMode, setSendMode] = useState<SendMode>("standard")
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [manualNumbers, setManualNumbers] = useState("")
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({})
  const [customFieldInputs, setCustomFieldInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!currentOrganization?.id) {
      setIsConfigured(false)
      setIsLoading(false)
      return
    }
    loadInitialData()
  }, [currentOrganization?.id])

  useEffect(() => {
    setVariableMapping({})
    setCustomFieldInputs({})
  }, [selectedTemplateId])

  const loadInitialData = async () => {
    try {
      if (!currentOrganization?.id) return
      const configResult = await whatsappService.getConfig(currentOrganization.id)
      setIsConfigured(configResult.is_configured)

      if (configResult.is_configured) {
        const [templatesResult, contactsResult, tagsResult] = await Promise.all([
          whatsappService.getTemplates(undefined, undefined, 100, 0),
          contactsService.getContacts(100, 0),
          tagsService.getTags(),
        ])

        setTemplates((templatesResult.templates || []).filter((t) => t.status === "APPROVED"))
        setContacts(contactsResult.contacts || [])
        setTags(tagsResult.tags || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setIsConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
  const availableFields = useMemo(() => {
    const baseFields = [
      { value: "first_name", label: "Prénom" },
      { value: "last_name", label: "Nom" },
      { value: "full_name", label: "Nom complet" },
      { value: "email", label: "Email" },
      { value: "phone_number", label: "Téléphone" },
    ]
    const customKeys = new Set<string>()
    contacts.forEach((contact) => {
      const fields = contact.custom_fields || {}
      Object.keys(fields).forEach((key) => customKeys.add(key))
    })
    const customFields = Array.from(customKeys)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ value: `custom:${key}`, label: `Champ personnalisé · ${key}` }))
    return [...baseFields, ...customFields]
  }, [contacts])

  const templateVariables = useMemo(() => {
    if (!selectedTemplate) return []
    const extractIndexes = (text?: string, fallbackCount?: number) => {
      if (text) {
        const matches = text.match(/\{\{\d+\}\}/g) || []
        const indexes = matches
          .map((m) => Number(m.replace(/[^\d]/g, "")))
          .filter((n) => !Number.isNaN(n))
        return Array.from(new Set(indexes)).sort((a, b) => a - b)
      }
      if (fallbackCount && fallbackCount > 0) {
        return Array.from({ length: fallbackCount }, (_, i) => i + 1)
      }
      return []
    }

    return selectedTemplate.components
      .filter((component) => component.type === "BODY" || component.type === "HEADER")
      .flatMap((component) => {
        const fallbackCount =
          component.type === "BODY"
            ? component.example?.body_text?.[0]?.length
            : component.example?.header_text?.length
        return extractIndexes(component.text, fallbackCount).map((index) => ({
          key: `${component.type.toLowerCase()}:${index}`,
          componentType: component.type.toLowerCase() as "header" | "body",
          index,
        }))
      })
  }, [selectedTemplate])

  // Parse manual numbers
  const parseManualNumbers = (): string[] => {
    return manualNumbers
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
  }

  // Get recipient count
  const getRecipientCount = (): number => {
    switch (recipientMode) {
      case "contacts":
        return selectedContactIds.length
      case "tags":
        return tags
          .filter((t) => selectedTagIds.includes(t.id))
          .reduce((sum, t) => sum + t.contact_count, 0)
      case "manual":
        return parseManualNumbers().length
      default:
        return 0
    }
  }

  const getRecipientContacts = (): Contact[] => {
    if (recipientMode === "contacts") {
      return contacts.filter((c) => selectedContactIds.includes(c.id))
    }
    if (recipientMode === "tags") {
      return contacts.filter((c) => c.tags.some((t) => selectedTagIds.includes(t.id)))
    }
    return []
  }

  const resolveFieldValue = (contact: Contact, field: string): string => {
    if (!field) return ""
    if (field === "first_name") return contact.first_name || ""
    if (field === "last_name") return contact.last_name || ""
    if (field === "full_name") {
      return `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
    }
    if (field === "email") return contact.email || ""
    if (field === "phone_number") return contact.phone_number || ""
    if (field.startsWith("custom:")) {
      const key = field.replace("custom:", "")
      const value = contact.custom_fields?.[key]
      if (value === null || value === undefined) return ""
      if (Array.isArray(value)) return value.join(", ")
      if (typeof value === "object") return JSON.stringify(value)
      return String(value)
    }
    return ""
  }

  // Get recipients
  const getRecipients = (): string[] => {
    switch (recipientMode) {
      case "contacts":
        return contacts
          .filter((c) => selectedContactIds.includes(c.id))
          .map((c) => c.phone_number)
      case "manual":
        return parseManualNumbers()
      default:
        return []
    }
  }

  const handleSend = async () => {
    if (!selectedTemplate) {
      toast.error("Veuillez sélectionner un template")
      return
    }

    const recipientCount = getRecipientCount()
    if (recipientCount === 0) {
      toast.error("Veuillez sélectionner au moins un destinataire")
      return
    }
    if (recipientCount > 10000) {
      toast.error("Limite dépassée : 10 000 destinataires maximum par requête")
      return
    }

    setIsSending(true)
    try {
      if (sendMode === "personalized") {
        if (recipientMode === "manual") {
          toast.error("Le mode manuel n'est pas disponible en envoi personnalisé")
          setIsSending(false)
          return
        }

        if (templateVariables.length === 0) {
          toast.error("Ce template ne contient pas de variables à personnaliser")
          setIsSending(false)
          return
        }

        const missingMappings = templateVariables.filter((variable) => !variableMapping[variable.key])
        if (missingMappings.length > 0) {
          toast.error("Veuillez mapper toutes les variables avant l'envoi")
          setIsSending(false)
          return
        }

        const recipientContacts = getRecipientContacts()
        const customKeyErrors = templateVariables.flatMap((variable) => {
          const mapping = variableMapping[variable.key]
          if (!mapping || !mapping.startsWith("custom:")) return []
          const key = mapping.replace("custom:", "")
          const missingCount = recipientContacts.filter((contact) => {
            const value = contact.custom_fields?.[key]
            return value === null || value === undefined || value === ""
          }).length
          if (missingCount === 0) return []
          return [`${key} (${missingCount} contact(s) sans valeur)`]
        })
        if (customKeyErrors.length > 0) {
          toast.error(`Champs personnalisés manquants: ${customKeyErrors.join(", ")}`)
          setIsSending(false)
          return
        }

        const recipients = recipientContacts.map((contact) => {
          const components = ["header", "body"].flatMap((componentType) => {
            const variables = templateVariables.filter((v) => v.componentType === componentType)
            if (variables.length === 0) return []
            const parameters = variables.map((variable) => ({
              type: "text" as const,
              text: resolveFieldValue(contact, variableMapping[variable.key]),
            }))
            return [{ type: componentType as "header" | "body", parameters }]
          })

          return {
            phone: contact.phone_number,
            components,
          }
        })

        const result = await whatsappService.createPersonalizedBroadcast({
          template_name: selectedTemplate.name,
          language_code: selectedTemplate.language,
          campaign_name: campaignName || undefined,
          recipients,
        })

        if (result.success) {
          toast.success(`Campagne créée avec ${recipientCount} destinataires`)
          router.push(`/campaigns/whatsapp/${result.broadcast_id}`)
        } else {
          toast.error("Erreur lors de la création de la campagne")
        }
      } else {
        const recipients = getRecipients()
        const result = await whatsappService.createBroadcast(
          recipients,
          selectedTemplate.name,
          selectedTemplate.language,
          campaignName || undefined
        )

        if (result.success) {
          toast.success(`Campagne créée avec ${recipientCount} destinataires`)
          router.push(`/campaigns/whatsapp/${result.broadcast_id}`)
        } else {
          toast.error("Erreur lors de la création de la campagne")
        }
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSending(false)
    }
  }

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    )
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  // Not configured state
  if (isConfigured === false) {
    return (
      <div className="space-y-8">
        <section className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-4">
            <Link href="/campaigns/whatsapp">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                Campagnes
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">Nouvelle campagne WhatsApp</h1>
              <p className="text-muted-foreground">
                Créez une campagne WhatsApp avec un template approuvé.
              </p>
            </div>
          </div>
        </section>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-amber-600 mb-4" />
            <p className="text-lg font-medium">WhatsApp non configuré</p>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Configurez vos credentials WhatsApp Business API pour créer des campagnes
            </p>
            <Link href="/whatsapp/config">
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Configurer WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-4">
          <Link href="/campaigns/whatsapp">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              Campagnes
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Nouvelle campagne WhatsApp</h1>
            <p className="text-muted-foreground">
              Créez une campagne WhatsApp avec un template approuvé.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Campaign Name */}
          <Card>
            <CardHeader>
              <CardTitle>Détails de la campagne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mode d'envoi</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={sendMode === "standard" ? "default" : "outline"}
                    onClick={() => setSendMode("standard")}
                  >
                    Standard
                  </Button>
                  <Button
                    type="button"
                    variant={sendMode === "personalized" ? "default" : "outline"}
                    onClick={() => {
                      setSendMode("personalized")
                      if (recipientMode === "manual") {
                        setRecipientMode("contacts")
                      }
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Personnalisé
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sendMode === "personalized"
                    ? "Chaque destinataire reçoit des paramètres personnalisés (nom, contrat, etc.)."
                    : "Le même contenu est envoyé à tous les destinataires."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaignName">Nom de la campagne (optionnel)</Label>
                <Input
                  id="campaignName"
                  placeholder="Ex: Promotion Janvier 2024"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Template WhatsApp</CardTitle>
              <CardDescription>
                Sélectionnez un template approuvé par Meta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsAppTemplateSelector
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onSelect={(template) => setSelectedTemplateId(template?.id || "")}
              />
              {templates.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Aucun template approuvé disponible.{" "}
                  <Link href="/templates/whatsapp" className="text-primary hover:underline">
                    Synchroniser les templates
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle>Destinataires</CardTitle>
              <CardDescription>
                Sélectionnez les destinataires de votre campagne
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={recipientMode} onValueChange={(v) => setRecipientMode(v as RecipientMode)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="contacts" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contacts
                  </TabsTrigger>
                  <TabsTrigger value="tags" className="flex items-center gap-2">
                    <TagsIcon className="h-4 w-4" />
                    Tags
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Manuel
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="contacts" className="mt-4">
                  {contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun contact disponible
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className={`flex items-center justify-between rounded-lg border border-border/60 p-2 transition-colors ${
                            selectedContactIds.includes(contact.id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/60"
                          }`}
                          onClick={() => toggleContact(contact.id)}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {contact.first_name || contact.last_name
                                ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
                                : contact.phone_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {contact.phone_number}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedContactIds.includes(contact.id)}
                            onChange={() => {}}
                            className="h-4 w-4 accent-primary"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedContactIds.length} contact(s) sélectionné(s)
                  </p>
                </TabsContent>

                <TabsContent value="tags" className="mt-4">
                  {tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun tag disponible
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.name} ({tag.contact_count})
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-4">
                    ~{getRecipientCount()} destinataire(s) estimé(s)
                  </p>
                </TabsContent>

                <TabsContent value="manual" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="manualNumbers">Numéros de téléphone</Label>
                    <Textarea
                      id="manualNumbers"
                      placeholder="+33612345678&#10;+33698765432&#10;..."
                      className="min-h-[120px] font-mono text-sm"
                      value={manualNumbers}
                      onChange={(e) => setManualNumbers(e.target.value)}
                      disabled={sendMode === "personalized"}
                    />
                    <p className="text-xs text-muted-foreground">
                      {sendMode === "personalized"
                        ? "Le mode manuel est désactivé pour l'envoi personnalisé."
                        : "Un numéro par ligne, avec indicatif pays (ex: +33)"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {parseManualNumbers().length} numéro(s) détecté(s)
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {sendMode === "personalized" && selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>Personnalisation des variables</CardTitle>
                <CardDescription>
                  Associez chaque variable du template à un champ de contact.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {templateVariables.length === 0 ? (
                  <div className="rounded-lg border border-border/60 bg-muted/60 p-4 text-sm text-muted-foreground">
                    Ce template ne contient pas de variables ({"{{1}}, {{2}}, ..."}).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templateVariables.map((variable) => (
                      <div key={variable.key} className="grid gap-2 sm:grid-cols-[160px_1fr] sm:items-center">
                        <div className="text-sm font-medium">
                          {variable.componentType.toUpperCase()} · {"{{"}{variable.index}{"}}"}
                        </div>
                        <div className="space-y-2">
                          <Select
                            value={variableMapping[variable.key] || ""}
                            onValueChange={(value) => {
                              setVariableMapping((prev) => ({ ...prev, [variable.key]: value }))
                              if (value !== "custom:__manual__") {
                                setCustomFieldInputs((prev) => ({ ...prev, [variable.key]: "" }))
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un champ" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom:__manual__">
                                Champ personnalisé · Nom libre
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {variableMapping[variable.key] === "custom:__manual__" && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Nom du champ (ex: contrat_id)"
                                value={customFieldInputs[variable.key] || ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim()
                                  setCustomFieldInputs((prev) => ({ ...prev, [variable.key]: val }))
                                  setVariableMapping((prev) => ({
                                    ...prev,
                                    [variable.key]: val ? `custom:${val}` : "custom:__manual__",
                                  }))
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border border-border/60 bg-card p-4 text-xs text-muted-foreground">
                  Limites: 10 000 destinataires par requête · 80 messages/seconde.
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Preview & Summary */}
        <div className="space-y-6">
          {/* Template Preview */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>Aperçu du template</CardTitle>
              </CardHeader>
              <CardContent>
                <WhatsAppTemplateCard template={selectedTemplate} />
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template</span>
                <span className="font-medium">
                  {selectedTemplate?.name || "Non sélectionné"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode d'envoi</span>
                <Badge variant={sendMode === "personalized" ? "default" : "secondary"}>
                  {sendMode === "personalized" ? "Personnalisé" : "Standard"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Langue</span>
                <span className="font-medium">
                  {selectedTemplate?.language || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destinataires</span>
                <span className="font-medium">{getRecipientCount()}</span>
              </div>

              <div className="border-t border-border/60 pt-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSend}
                  disabled={isSending || !selectedTemplate || getRecipientCount() === 0}
                >
                  {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Envoyer la campagne
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
