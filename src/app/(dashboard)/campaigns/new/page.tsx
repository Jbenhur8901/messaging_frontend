"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { featureFlags } from "@/config/features"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { smsService, contactsService, tagsService, templatesService, messagingServicesService, handleApiError } from "@/services"
import type { Contact, Tag, Template, SMSAnalysis, MessagingService } from "@/types"
import { useCreditsStore } from "@/stores"
import { formatNumber } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Loader2,
  ArrowLeft,
  Users,
  Tags as TagsIcon,
  FileText,
  Send,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"

const campaignSchema = z.object({
  campaignName: z.string().min(1, "Nom de campagne requis"),
  message: z.string().optional(),
})

type CampaignForm = z.infer<typeof campaignSchema>

type SendMode = "standard" | "templated"

export default function NewCampaignPage() {
  const router = useRouter()
  const { balance, fetchBalance } = useCreditsStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Send mode (standard = same message to all, templated = personalized per contact)
  const [sendMode, setSendMode] = useState<SendMode>("standard")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")

  // Selection state
  const [selectionMode, setSelectionMode] = useState<"contacts" | "tags" | "manual">("contacts")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [messagingServices, setMessagingServices] = useState<MessagingService[]>([])
  const [selectedServiceSid, setSelectedServiceSid] = useState<string>("")
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [manualNumbers, setManualNumbers] = useState("")

  // Message analysis
  const [analysis, setAnalysis] = useState<SMSAnalysis | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      campaignName: "",
      message: "",
    },
  })

  const message = watch("message")

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [tagsData, templatesData, servicesData] = await Promise.all([
          tagsService.getTags(),
          templatesService.getTemplates(undefined, 50, 0),
          messagingServicesService.list(),
        ])
        const contactsData = await (async () => {
          const fetchLimit = 200
          let offset = 0
          let hasMore = true
          let all: Contact[] = []

          while (hasMore) {
            const result = await contactsService.getContacts(fetchLimit, offset)
            const pageContacts = result.contacts.filter((contact) => {
              const deletedAt = (contact as Contact & { deleted_at?: string | null; deletedAt?: string | null })
              return !deletedAt.deleted_at && !deletedAt.deletedAt
            })
            all = [...all, ...pageContacts]

            if (typeof result.pagination?.has_more === "boolean") {
              hasMore = result.pagination.has_more
            } else if (typeof result.pagination?.total === "number") {
              hasMore = all.length < result.pagination.total
            } else {
              hasMore = result.contacts.length === fetchLimit
            }

            offset += fetchLimit
            if (result.contacts.length === 0) break
          }

          return all
        })()
        setContacts(contactsData)
        setTags(tagsData.tags)
        setTemplates(templatesData.templates)
        setMessagingServices(servicesData.services || [])
        const defaultService = (servicesData.services || []).find((s) => s.is_default)
        if (defaultService?.service_sid) {
          setSelectedServiceSid(defaultService.service_sid)
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Analyze message (only in standard mode)
  useEffect(() => {
    const analyzeMessage = async () => {
      if (message && message.length > 0) {
        try {
          const result = await smsService.analyzeMessage(message)
          setAnalysis(result)
        } catch (error) {
        }
      } else {
        setAnalysis(null)
      }
    }

    const timeout = setTimeout(analyzeMessage, 300)
    return () => clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    if (!featureFlags.SMS_ENABLED) router.replace("/campaigns/whatsapp/new")
  }, [router])

  if (!featureFlags.SMS_ENABLED) return null

  // Calculate recipients (phone numbers for standard mode)
  const getRecipients = (): string[] => {
    if (selectionMode === "contacts") {
      return contacts
        .filter((c) => selectedContacts.includes(c.id))
        .map((c) => c.phone_number)
    } else if (selectionMode === "tags") {
      const taggedContacts = contacts.filter((c) =>
        c.tags.some((t) => selectedTags.includes(t.id))
      )
      return [...new Set(taggedContacts.map((c) => c.phone_number))]
    } else {
      return manualNumbers
        .split(/[\n,;]/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
    }
  }

  // Get contact IDs for templated mode
  const getContactIds = (): string[] => {
    if (selectionMode === "contacts") {
      return selectedContacts
    } else if (selectionMode === "tags") {
      const taggedContacts = contacts.filter((c) =>
        c.tags.some((t) => selectedTags.includes(t.id))
      )
      return [...new Set(taggedContacts.map((c) => c.id))]
    }
    return []
  }

  const recipients = getRecipients()
  const contactIds = getContactIds()

  // Calculate estimated credits based on mode
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
  const totalCredits = sendMode === "templated"
    ? contactIds.length * (selectedTemplate?.segments_count || 1)
    : recipients.length * (analysis?.segments || 1)
  const hasEnoughCredits = (balance?.credit_available || 0) >= totalCredits

  const onSubmit = async (data: CampaignForm) => {
    // Validate based on send mode
    if (sendMode === "templated") {
      if (contactIds.length === 0) {
        toast.error("Veuillez sélectionner des contacts (le mode personnalisé nécessite des contacts)")
        return
      }
      if (!selectedTemplateId) {
        toast.error("Veuillez sélectionner un template")
        return
      }
      if (selectionMode === "manual") {
        toast.error("Le mode manuel n'est pas disponible avec les templates personnalisés")
        return
      }
    } else {
      if (recipients.length === 0) {
        toast.error("Veuillez sélectionner des destinataires")
        return
      }
      if (!data.message) {
        toast.error("Veuillez saisir un message")
        return
      }
    }

    if (!hasEnoughCredits) {
      toast.error("Crédits insuffisants")
      return
    }

    setIsSending(true)
    try {
      let broadcastId: string

      if (sendMode === "templated") {
        // Use templated broadcast endpoint (personalized per contact)
        const result = await smsService.createBroadcastWithTemplate(
          contactIds,
          selectedTemplateId,
          data.campaignName,
          selectedServiceSid || undefined
        )
        broadcastId = result.broadcast_id
        toast.success("Campagne personnalisée créée avec succès")
      } else {
        // Use standard broadcast endpoint (same message to all)
        const result = await smsService.createBroadcast(
          recipients,
          data.message || "",
          data.campaignName,
          undefined,
          selectedServiceSid || undefined
        )
        broadcastId = result.broadcast_id
        toast.success("Campagne créée avec succès")
      }

      fetchBalance()
      router.push(`/campaigns/${broadcastId}`)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSending(false)
    }
  }

  const applyTemplate = (template: Template) => {
    const selectedContact =
      selectionMode === "contacts" && selectedContacts.length === 1
        ? contacts.find((c) => c.id === selectedContacts[0]) || null
        : null

    if (!selectedContact) {
      setValue("message", template.body)
      toast.info("Variables conservées (sélectionnez 1 contact pour pré-remplir).")
      return
    }

    const variableMap: Record<string, string> = {
      first_name: selectedContact.first_name || "",
      last_name: selectedContact.last_name || "",
      email: selectedContact.email || "",
      phone_number: selectedContact.phone_number || "",
    }

    const hydrated = template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      return variableMap[key] ?? `{{${key}}}`
    })

    setValue("message", hydrated)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Nouvelle campagne</h1>
          <p className="text-muted-foreground mt-1">
            Créez et envoyez une campagne SMS.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Name & Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Nom de la campagne</Label>
                  <Input
                    id="campaignName"
                    placeholder="Ex: Promo janvier 2026"
                    {...register("campaignName")}
                  />
                  {errors.campaignName && (
                    <p className="text-sm text-destructive">
                      {errors.campaignName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Mode d&apos;envoi</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={sendMode === "standard" ? "default" : "outline"}
                      onClick={() => setSendMode("standard")}
                      className="flex-1"
                    >
                      Standard
                    </Button>
                    <Button
                      type="button"
                      variant={sendMode === "templated" ? "default" : "outline"}
                      onClick={() => {
                        setSendMode("templated")
                        if (selectionMode === "manual") {
                          setSelectionMode("contacts")
                        }
                      }}
                      className="flex-1"
                    >
                      Personnalisé
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sendMode === "standard"
                      ? "Même message envoyé à tous les destinataires"
                      : "Message personnalisé pour chaque contact (utilise les données du contact)"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recipients */}
            <Card>
              <CardHeader>
                <CardTitle>Destinataires</CardTitle>
                <CardDescription>
                  Sélectionnez les contacts ou tags pour cette campagne
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectionMode === "contacts" ? "default" : "outline"}
                    onClick={() => setSelectionMode("contacts")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Contacts
                  </Button>
                  <Button
                    type="button"
                    variant={selectionMode === "tags" ? "default" : "outline"}
                    onClick={() => setSelectionMode("tags")}
                  >
                    <TagsIcon className="mr-2 h-4 w-4" />
                    Tags
                  </Button>
                  <Button
                    type="button"
                    variant={selectionMode === "manual" ? "default" : "outline"}
                    onClick={() => setSelectionMode("manual")}
                    disabled={sendMode === "templated"}
                    title={sendMode === "templated" ? "Non disponible en mode personnalisé" : undefined}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Manuel
                  </Button>
                </div>
                {sendMode === "templated" && selectionMode === "manual" && (
                  <p className="text-sm text-destructive">
                    Le mode manuel n&apos;est pas disponible avec les templates personnalisés
                  </p>
                )}

                <Separator />

                {selectionMode === "contacts" && (
                  <ScrollArea className="h-64 rounded-md border border-border/40 bg-background p-4">
                    <div className="space-y-2">
                      {isLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement des contacts...
                        </div>
                      )}
                      {!isLoading && contacts.length > 0 && (
                        <div className="flex items-center space-x-2 pb-2">
                          <Checkbox
                            id="select-all-contacts"
                            checked={
                              contacts.length > 0 &&
                              selectedContacts.length === contacts.length
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedContacts(contacts.map((c) => c.id))
                              } else {
                                setSelectedContacts([])
                              }
                            }}
                          />
                          <label
                            htmlFor="select-all-contacts"
                            className="text-sm cursor-pointer"
                          >
                            Tout sélectionner ({contacts.length})
                          </label>
                        </div>
                      )}
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center space-x-2 rounded-md px-2 py-1 hover:bg-muted/60"
                        >
                          <Checkbox
                            id={contact.id}
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedContacts([...selectedContacts, contact.id])
                              } else {
                                setSelectedContacts(
                                  selectedContacts.filter((id) => id !== contact.id)
                                )
                              }
                            }}
                          />
                          <label
                            htmlFor={contact.id}
                            className="flex-1 text-sm cursor-pointer"
                          >
                            {contact.first_name} {contact.last_name} ({contact.phone_number})
                          </label>
                        </div>
                      ))}
                      {contacts.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Aucun contact
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}

                {selectionMode === "tags" && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer transition-colors"
                        style={{
                          backgroundColor: selectedTags.includes(tag.id)
                            ? tag.color
                            : undefined,
                        }}
                        onClick={() => {
                          if (selectedTags.includes(tag.id)) {
                            setSelectedTags(selectedTags.filter((id) => id !== tag.id))
                          } else {
                            setSelectedTags([...selectedTags, tag.id])
                          }
                        }}
                      >
                        {tag.name} ({tag.contact_count})
                      </Badge>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-muted-foreground">Aucun tag</p>
                    )}
                  </div>
                )}

                {selectionMode === "manual" && (
                  <div className="space-y-2">
                    <Label>Numéros de téléphone</Label>
                    <Textarea
                      placeholder="Entrez les numéros séparés par des virgules ou des retours à la ligne"
                      className="h-40 font-mono text-sm"
                      value={manualNumbers}
                      onChange={(e) => setManualNumbers(e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Message</CardTitle>
                  <CardDescription>
                    {sendMode === "templated"
                      ? "Sélectionnez un template (les variables seront remplacées par les données de chaque contact)"
                      : "Rédigez le contenu de votre SMS"}
                  </CardDescription>
                </div>
                {sendMode === "standard" && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Templates
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Sélectionner un template</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className="cursor-pointer rounded-md border border-border/40 p-3 transition-colors hover:bg-muted/60"
                            onClick={() => applyTemplate(template)}
                          >
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {template.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Service d&apos;envoi</Label>
                  <Select value={selectedServiceSid} onValueChange={setSelectedServiceSid}>
                    <SelectTrigger>
                      <SelectValue placeholder="Service par défaut" />
                    </SelectTrigger>
                    <SelectContent>
                      {messagingServices.map((service) => (
                        <SelectItem key={service.id} value={service.service_sid}>
                          {service.service_name} {service.is_default ? "(Défaut)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sendMode === "standard" ? (
                  <>
                    <Textarea
                      placeholder="Votre message..."
                      className="min-h-[120px]"
                      {...register("message")}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message.message}</p>
                    )}
                    {analysis && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{analysis.characters} caractères</span>
                        <span>{analysis.segments} segment(s)</span>
                        <Badge variant={analysis.encoding === "GSM-7" ? "secondary" : "warning"}>
                          {analysis.encoding}
                        </Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Template</Label>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTemplateId && (
                      <div className="rounded-lg border border-border/40 bg-muted/60 p-4">
                        <p className="text-sm font-medium mb-2">Aperçu du template :</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {templates.find((t) => t.id === selectedTemplateId)?.body}
                        </p>
                        <div className="mt-3 border-t pt-3">
                          <p className="text-xs text-muted-foreground">
                            Variables disponibles : {"{"}{"{"}<span className="font-mono">first_name</span>{"}"}{"}"},
                            {"{"}{"{"}<span className="font-mono">last_name</span>{"}"}{"}"},
                            {"{"}{"{"}<span className="font-mono">email</span>{"}"}{"}"},
                            {"{"}{"{"}<span className="font-mono">phone_number</span>{"}"}{"}"},
                            {"{"}{"{"}<span className="font-mono">full_name</span>{"}"}{"}"}
                            + custom fields
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <Badge variant={sendMode === "templated" ? "default" : "secondary"}>
                    {sendMode === "templated" ? "Personnalisé" : "Standard"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destinataires</span>
                  <span className="font-medium">
                    {formatNumber(sendMode === "templated" ? contactIds.length : recipients.length)}
                  </span>
                </div>
                {sendMode === "standard" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Segments/message</span>
                    <span className="font-medium">{analysis?.segments || 1}</span>
                  </div>
                )}
                {sendMode === "templated" && selectedTemplateId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template</span>
                    <span className="font-medium truncate max-w-[120px]">
                      {templates.find((t) => t.id === selectedTemplateId)?.name || "—"}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédits estimés</span>
                  <span className="font-bold">{formatNumber(totalCredits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédits disponibles</span>
                  <span className={hasEnoughCredits ? "text-emerald-600" : "text-destructive"}>
                    {formatNumber(balance?.credit_available || 0)}
                  </span>
                </div>

                {!hasEnoughCredits && totalCredits > 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <div>
                      <p className="font-medium">Crédits insuffisants</p>
                      <p>Il vous manque {formatNumber(totalCredits - (balance?.credit_available || 0))} crédits.</p>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isSending ||
                    (sendMode === "standard" && recipients.length === 0) ||
                    (sendMode === "templated" && (contactIds.length === 0 || !selectedTemplateId)) ||
                    !hasEnoughCredits
                  }
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer la campagne
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
