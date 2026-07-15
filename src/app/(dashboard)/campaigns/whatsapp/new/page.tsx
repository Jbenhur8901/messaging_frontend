"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { whatsappService, contactsService, tagsService, customFieldsService, segmentsService, handleApiError } from "@/services"
import type { WhatsAppTemplate, Contact, Tag, CustomField } from "@/types"
import type { Segment } from "@/services/segments"
import { uploadMediaToSupabase } from "@/lib/supabase"
import { fetchAllContactsPaged, getCachedContacts, setCachedContacts } from "@/lib/contacts-cache"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  ArrowLeft,
  Loader2,
  Users,
  AlertTriangle,
  Settings,
  Sparkles,
  ChevronRight,
  LayoutTemplate,
  Sliders,
  Check,
  Tags as TagsIcon,
} from "lucide-react"
import type { PreSendCheck, WhatsAppCreditBalance } from "@/types"
import { useDebounce } from "@/hooks"

import { TemplateBrowserDialog } from "@/components/whatsapp/campaign/template-browser-dialog"
import { RecipientSheet } from "@/components/whatsapp/campaign/recipient-sheet"
import { PersonalizationDialog } from "@/components/whatsapp/campaign/personalization-dialog"
import { CampaignSummary } from "@/components/whatsapp/campaign/campaign-summary"
import { HeaderMediaUpload } from "@/components/whatsapp/campaign/header-media-upload"

type RecipientMode = "contacts" | "tags" | "segment"
type SendMode = "standard" | "personalized"
type MissingCustomFieldDetail = {
  field: string
  phones: string[]
}

const RATE_PER_CATEGORY: Record<string, number> = {
  MARKETING: 18,
  UTILITY: 6,
  AUTHENTICATION: 6,
}

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
  const [globalCustomFields, setGlobalCustomFields] = useState<CustomField[]>([])

  // Form state
  const [campaignName, setCampaignName] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("tags")
  const [sendMode, setSendMode] = useState<SendMode>("standard")
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({})
  const [headerMediaUrl, setHeaderMediaUrl] = useState("")
  const [headerFile, setHeaderFile] = useState<File | null>(null)
  const [headerUploading, setHeaderUploading] = useState(false)

  // Dialog/Sheet state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [recipientSheetOpen, setRecipientSheetOpen] = useState(false)
  const [personalizationDialogOpen, setPersonalizationDialogOpen] = useState(false)
  const [missingCustomFieldsDialogOpen, setMissingCustomFieldsDialogOpen] = useState(false)
  const [missingCustomFieldDetails, setMissingCustomFieldDetails] = useState<MissingCustomFieldDetail[]>([])

  // Credit estimation
  const [creditCheck, setCreditCheck] = useState<PreSendCheck | null>(null)
  const [walletBalance, setWalletBalance] = useState<WhatsAppCreditBalance | null>(null)
  const [creditCheckLoading, setCreditCheckLoading] = useState(false)

  const MAX_CONTACTS = Number.MAX_SAFE_INTEGER
  const CONTACTS_PAGE_SIZE = 5000
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsLoadedCount, setContactsLoadedCount] = useState(0)
  const [contactsTotalCount, setContactsTotalCount] = useState<number | null>(null)
  const [contactsLimitReached, setContactsLimitReached] = useState(false)
  const [tagContacts, setTagContacts] = useState<Contact[]>([])
  const [tagContactsKey, setTagContactsKey] = useState<string | null>(null)
  const [tagContactsLoading, setTagContactsLoading] = useState(false)
  const [tagContactsLoadedCount, setTagContactsLoadedCount] = useState(0)
  const [tagContactsTotalCount, setTagContactsTotalCount] = useState<number | null>(null)
  const [tagContactsLimitReached, setTagContactsLimitReached] = useState(false)
  const [recipientsBootstrapDone, setRecipientsBootstrapDone] = useState(false)
  const [segments, setSegments] = useState<Segment[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("")

  useEffect(() => {
    setRecipientsBootstrapDone(false)
    setContacts([])
    setSelectedContactIds([])

    if (!currentOrganization?.id) {
      setIsConfigured(false)
      setIsLoading(false)
      return
    }
    loadInitialData()
  }, [currentOrganization?.id])

  useEffect(() => {
    setVariableMapping({})
    setHeaderMediaUrl("")
    setHeaderFile(null)
  }, [selectedTemplateId])

  const fetchAllContacts = async (
    { forceRefresh = false }: { forceRefresh?: boolean } = {}
  ): Promise<{ contacts: Contact[]; total: number | null; truncated: boolean }> => {
    setContactsLoading(true)
    setContactsLoadedCount(0)
    setContactsTotalCount(null)
    setContactsLimitReached(false)

    try {
      if (!forceRefresh) {
        const cachedContacts = getCachedContacts(currentOrganization?.id)
        if (cachedContacts) {
          setContactsLoadedCount(cachedContacts.length)
          setContactsTotalCount(cachedContacts.length)
          return {
            contacts: cachedContacts,
            total: cachedContacts.length,
            truncated: false,
          }
        }
      }

      const result = await fetchAllContactsPaged({
        fetchPage: (limit, offset) => contactsService.getContacts(limit, offset),
        pageSize: CONTACTS_PAGE_SIZE,
        maxContacts: MAX_CONTACTS,
        onProgress: (loaded, total) => {
          setContactsLoadedCount(loaded)
          setContactsTotalCount(total)
        },
      })

      setCachedContacts(result.contacts, currentOrganization?.id)
      setContactsLimitReached(result.truncated)
      return result
    } finally {
      setContactsLoading(false)
    }
  }

  const fetchContactsByTags = async (
    tagIds: string[]
  ): Promise<{ contacts: Contact[]; total: number | null; truncated: boolean }> => {
    setTagContactsLoading(true)
    setTagContactsLoadedCount(0)
    setTagContactsTotalCount(null)
    setTagContactsLimitReached(false)

    const result = await fetchAllContactsPaged({
      fetchPage: (limit, offset) => contactsService.getContactsByTags(tagIds, limit, offset),
      pageSize: CONTACTS_PAGE_SIZE,
      maxContacts: MAX_CONTACTS,
      onProgress: (loaded, total) => {
        setTagContactsLoadedCount(loaded)
        setTagContactsTotalCount(total)
      }
    })

    setTagContactsLimitReached(result.truncated)
    setTagContactsLoading(false)
    return result
  }

  const loadInitialData = async () => {
    try {
      if (!currentOrganization?.id) return
      const configResult = await whatsappService.getConfig(currentOrganization.id)
      setIsConfigured(configResult.is_configured)

      if (configResult.is_configured) {
        const [templatesResult, tagsResult, customFieldsResult, segmentsResult] = await Promise.all([
          whatsappService.getTemplates(undefined, undefined, 100, 0),
          tagsService.getTags(),
          customFieldsService.getCustomFields(),
          segmentsService.listSegments({ limit: 100 }).catch(() => ({ segments: [] })),
        ])

        setTemplates((templatesResult.templates || []).filter((t) => t.status === "APPROVED"))
        setTags(tagsResult.tags || [])
        setGlobalCustomFields(
          (customFieldsResult.custom_fields || []).filter(
            (field) => !field.is_system && field.is_active !== false
          )
        )
        setSegments(segmentsResult.segments || [])
      }
    } catch (error) {
      setIsConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  const headerComponent = selectedTemplate?.components.find((c) => c.type === "HEADER")
  const headerMediaFormat = headerComponent?.format
  const needsHeaderMedia = headerMediaFormat === "IMAGE" || headerMediaFormat === "VIDEO" || headerMediaFormat === "DOCUMENT"

  const handleHeaderFile = useCallback(async (file: File) => {
    setHeaderFile(file)
    setHeaderUploading(true)
    try {
      const publicUrl = await uploadMediaToSupabase(file)
      setHeaderMediaUrl(publicUrl)
      toast.success("Fichier uploadé")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'upload")
      setHeaderFile(null)
      setHeaderMediaUrl("")
    } finally {
      setHeaderUploading(false)
    }
  }, [])

  const removeHeaderFile = useCallback(() => {
    setHeaderFile(null)
    setHeaderMediaUrl("")
  }, [])

  const selectedTagKey = useMemo(
    () => (selectedTagIds.length > 0 ? [...selectedTagIds].sort().join(",") : ""),
    [selectedTagIds]
  )

  useEffect(() => {
    if (!isConfigured || recipientsBootstrapDone || contactsLoading) return
    fetchAllContacts()
      .then((result) => {
        setContacts(result.contacts)
        setSelectedContactIds(result.contacts.map((c) => c.id))
      })
      .catch(() => {
        setContactsLoading(false)
      })
      .finally(() => {
        setRecipientsBootstrapDone(true)
      })
  }, [isConfigured, recipientsBootstrapDone, contactsLoading])

  // Fetch tag contacts whenever tags change (any send mode)
  useEffect(() => {
    if (!isConfigured) return
    if (recipientMode !== "tags") return
    if (selectedTagIds.length === 0) {
      setTagContacts([])
      setTagContactsKey(null)
      return
    }
    if (selectedTagKey !== tagContactsKey && !tagContactsLoading) {
      setTagContactsKey(selectedTagKey)
      fetchContactsByTags(selectedTagIds)
        .then((result) => setTagContacts(result.contacts))
        .catch(() => {
          setTagContactsLoading(false)
        })
    }
  }, [
    recipientMode,
    selectedTagIds.length,
    selectedTagKey,
    tagContactsKey,
    tagContactsLoading,
    isConfigured,
  ])

  const getContactCustomFields = (contact: Contact): Record<string, unknown> => {
    const fields = contact.custom_fields as unknown
    if (fields && typeof fields === "object" && "custom_fields" in fields) {
      const nested = (fields as { custom_fields?: unknown }).custom_fields
      if (nested && typeof nested === "object") {
        return nested as Record<string, unknown>
      }
    }
    return (fields as Record<string, unknown>) || {}
  }

  const systemVariableOptions = useMemo(
    () => [
      { value: "first_name", label: "Prénom (contact)" },
      { value: "last_name", label: "Nom (contact)" },
      { value: "full_name", label: "Nom complet (contact)" },
      { value: "email", label: "Email (contact)" },
      { value: "phone_number", label: "Téléphone (contact)" },
    ],
    []
  )

  const customVariableOptions = useMemo(() => {
    const sourceContacts =
      sendMode === "personalized" && recipientMode === "tags" ? tagContacts : contacts
    const customKeys = new Set<string>()
    globalCustomFields.forEach((field) => {
      if (field.field_key) customKeys.add(field.field_key)
    })
    sourceContacts.forEach((contact) => {
      const fields = getContactCustomFields(contact)
      Object.keys(fields).forEach((key) => customKeys.add(key))
    })
    return Array.from(customKeys)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ value: `custom:${key}`, label: key }))
  }, [contacts, tagContacts, sendMode, recipientMode, globalCustomFields])

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

    const headerBodyVars = selectedTemplate.components
      .filter((component) => component.type === "BODY" || component.type === "HEADER")
      .flatMap((component) => {
        const fallbackCount =
          component.type === "BODY"
            ? component.example?.body_text?.[0]?.length
            : component.example?.header_text?.length
        return extractIndexes(component.text, fallbackCount).map((index) => ({
          key: `${component.type.toLowerCase()}:${index}`,
          componentType: component.type.toLowerCase() as "header" | "body" | "button",
          index,
          buttonIndex: undefined as number | undefined,
          buttonSubType: undefined as string | undefined,
        }))
      })

    const buttonVars = selectedTemplate.components
      .filter((component) => component.type === "BUTTONS")
      .flatMap((component) =>
        (component.buttons || []).flatMap((button, btnIndex) => {
          if (button.type !== "URL" || !button.url) return []
          const urlParams = extractIndexes(button.url)
          if (urlParams.length === 0) return []
          return urlParams.map((paramIndex) => ({
            key: `button:${btnIndex}:${paramIndex}`,
            componentType: "button" as const,
            index: paramIndex,
            buttonIndex: btnIndex,
            buttonSubType: "url",
          }))
        })
      )

    return [...headerBodyVars, ...buttonVars]
  }, [selectedTemplate])

  // === Credit Estimation ===
  const recipientCount = useMemo(() => {
    switch (recipientMode) {
      case "contacts":
        return selectedContactIds.length
      case "tags":
        return tags
          .filter((t) => selectedTagIds.includes(t.id))
          .reduce((sum, t) => sum + t.contact_count, 0)
      case "segment": {
        const seg = segments.find((s) => s.id === selectedSegmentId)
        return seg?.estimated_count ?? 0
      }
      default:
        return 0
    }
  }, [recipientMode, selectedContactIds.length, selectedTagIds, tags, segments, selectedSegmentId])

  const templateCategory = selectedTemplate?.category || null

  const costEstimation = useMemo(() => {
    if (!templateCategory || recipientCount === 0) return null
    const rate = RATE_PER_CATEGORY[templateCategory] || 0
    const totalCost = recipientCount * rate
    return { rate, totalCost, recipientCount, category: templateCategory }
  }, [templateCategory, recipientCount])

  const debouncedRecipientCount = useDebounce(recipientCount, 500)
  const debouncedTemplateCategory = useDebounce(templateCategory, 300)

  useEffect(() => {
    if (!isConfigured) return
    whatsappService.getWhatsAppBalance()
      .then(setWalletBalance)
      .catch(() => {})
  }, [isConfigured])

  useEffect(() => {
    if (!debouncedTemplateCategory || debouncedRecipientCount === 0) {
      setCreditCheck(null)
      return
    }
    const categoryMap: Record<string, string> = {
      MARKETING: "marketing",
      UTILITY: "utility",
      AUTHENTICATION: "auth",
    }
    const cat = categoryMap[debouncedTemplateCategory]
    if (!cat) return

    setCreditCheckLoading(true)
    whatsappService.checkCredits(cat, debouncedRecipientCount)
      .then((result) => setCreditCheck({
        can_send: result.can_send ?? false,
        category: result.category ?? cat,
        message_count: result.message_count ?? debouncedRecipientCount,
        credits_required: result.credits_required ?? 0,
        credits_available: result.credits_available ?? 0,
        shortage: result.shortage,
      }))
      .catch(() => setCreditCheck(null))
      .finally(() => setCreditCheckLoading(false))
  }, [debouncedTemplateCategory, debouncedRecipientCount])

  const getRecipientContacts = (): Contact[] => {
    if (recipientMode === "contacts") {
      return contacts.filter((c) => selectedContactIds.includes(c.id))
    }
    if (recipientMode === "tags") {
      return tagContacts.length > 0
        ? tagContacts
        : contacts.filter((c) => c.tags.some((t) => selectedTagIds.includes(t.id)))
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
      const value = getContactCustomFields(contact)[key]
      if (value === null || value === undefined) return ""
      if (Array.isArray(value)) return value.join(", ")
      if (typeof value === "object") return JSON.stringify(value)
      return String(value)
    }
    return ""
  }

  const getRecipients = (): string[] => {
    if (recipientMode === "contacts") {
      return contacts
        .filter((c) => selectedContactIds.includes(c.id))
        .map((c) => c.phone_number)
    }
    return []
  }

  const buildHeaderMediaComponent = (): {
    type: "header"
    parameters: Array<{
      type: "text" | "image" | "document" | "video"
      text?: string
      image?: { link: string }
      video?: { link: string }
      document?: { link: string; filename?: string }
    }>
  } | null => {
    if (!needsHeaderMedia || !headerMediaUrl.trim()) return null
    if (headerMediaFormat === "IMAGE") {
      return { type: "header", parameters: [{ type: "image", image: { link: headerMediaUrl.trim() } }] }
    }
    if (headerMediaFormat === "VIDEO") {
      return { type: "header", parameters: [{ type: "video", video: { link: headerMediaUrl.trim() } }] }
    }
    if (headerMediaFormat === "DOCUMENT") {
      return { type: "header", parameters: [{ type: "document", document: { link: headerMediaUrl.trim() } }] }
    }
    return null
  }

  const handleSend = async () => {
    if (!campaignName.trim()) {
      toast.error("Veuillez saisir un nom de campagne")
      return
    }

    if (!selectedTemplate) {
      toast.error("Veuillez sélectionner un template")
      return
    }

    if (recipientCount === 0) {
      toast.error("Veuillez sélectionner au moins un destinataire")
      return
    }

    if (needsHeaderMedia && !headerMediaUrl.trim()) {
      toast.error("Veuillez fournir l'URL du média pour le header du template")
      return
    }

    setIsSending(true)
    try {
      if (sendMode === "personalized") {
        if (recipientMode === "contacts" && contactsLoading) {
          toast.error("Chargement des contacts en cours, veuillez patienter")
          setIsSending(false)
          return
        }
        if (recipientMode === "tags" && tagContactsLoading) {
          toast.error("Chargement des contacts des tags en cours, veuillez patienter")
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

        let recipientContacts = getRecipientContacts()

        if (recipientContacts.length === 0 && recipientMode === "contacts" && selectedContactIds.length > 0) {
          try {
            const allContactsResult = await fetchAllContacts({ forceRefresh: true })
            setContacts(allContactsResult.contacts)
            recipientContacts = allContactsResult.contacts.filter((c) => selectedContactIds.includes(c.id))
          } catch {
            // Ignore here, a clear error is shown below if contacts remain unavailable.
          }
        }

        if (recipientContacts.length === 0 && recipientMode === "tags" && selectedTagIds.length > 0) {
          try {
            const tagResult = await fetchContactsByTags(selectedTagIds)
            setTagContacts(tagResult.contacts)
            recipientContacts = tagResult.contacts
          } catch {
            // Ignore here, a clear error is shown below if contacts remain unavailable.
          }
        }

        if (recipientContacts.length === 0 && recipientCount > 0) {
          toast.error("Aucun contact chargé pour les destinataires sélectionnés")
          setIsSending(false)
          return
        }
        const missingCustomFields = templateVariables.flatMap((variable) => {
          const mapping = variableMapping[variable.key]
          if (!mapping || !mapping.startsWith("custom:")) return []
          const key = mapping.replace("custom:", "")
          const missingContacts = recipientContacts.filter((contact) => {
            const value = getContactCustomFields(contact)[key]
            return value === null || value === undefined || value === ""
          })
          if (missingContacts.length === 0) return []
          const missingPhones = missingContacts
            .map((contact) => contact.phone_number)
            .filter((phone): phone is string => typeof phone === "string" && phone.trim().length > 0)
          return [{ field: key, phones: missingPhones }]
        })
        if (missingCustomFields.length > 0) {
          setMissingCustomFieldDetails(missingCustomFields)
          setMissingCustomFieldsDialogOpen(true)
          setIsSending(false)
          return
        }

        const headerMediaComp = buildHeaderMediaComponent()

        const recipients = recipientContacts.map((contact) => {
          const headerBodyComponents = ["header", "body"].flatMap((componentType) => {
            if (componentType === "header" && headerMediaComp) return []
            const variables = templateVariables.filter((v) => v.componentType === componentType)
            if (variables.length === 0) return []
            const parameters = variables.map((variable) => ({
              type: "text" as const,
              text: resolveFieldValue(contact, variableMapping[variable.key]),
            }))
            return [{ type: componentType as "header" | "body" | "button", parameters }]
          })

          const buttonVariables = templateVariables.filter((v) => v.componentType === "button")
          const buttonsByIndex = new Map<number, typeof buttonVariables>()
          for (const v of buttonVariables) {
            if (v.buttonIndex === undefined) continue
            const existing = buttonsByIndex.get(v.buttonIndex) || []
            existing.push(v)
            buttonsByIndex.set(v.buttonIndex, existing)
          }
          const buttonComponents = Array.from(buttonsByIndex.entries()).map(([btnIndex, vars]) => ({
            type: "button" as const,
            sub_type: vars[0].buttonSubType || "url",
            index: String(btnIndex),
            parameters: vars.map((variable) => ({
              type: "text" as const,
              text: resolveFieldValue(contact, variableMapping[variable.key]),
            })),
          }))

          return {
            phone: contact.phone_number,
            components: [
              ...(headerMediaComp ? [headerMediaComp] : []),
              ...headerBodyComponents,
              ...buttonComponents,
            ],
          }
        })

        const result = await whatsappService.createPersonalizedBroadcast({
          template_name: selectedTemplate.name,
          language_code: selectedTemplate.language,
          campaign_name: campaignName.trim(),
          recipients,
        })

        if (result.success) {
          toast.success(`Campagne créée avec ${recipientCount} destinataires`)
          router.push(`/campaigns/whatsapp/${result.broadcast_id}`)
        } else {
          toast.error("Erreur lors de la création de la campagne")
        }
      } else {
        // Segment mode — resolve server-side
        if (recipientMode === "segment") {
          if (!selectedSegmentId) {
            toast.error("Veuillez sélectionner un segment")
            setIsSending(false)
            return
          }
          const headerMediaComp = buildHeaderMediaComponent()
          const result = await whatsappService.createSegmentBroadcast({
            segment_id: selectedSegmentId,
            template_name: selectedTemplate.name,
            language_code: selectedTemplate.language,
            campaign_name: campaignName.trim(),
            components: headerMediaComp ? [headerMediaComp] : undefined,
          })
          if (result.success) {
            toast.success(`Campagne créée pour ${result.resolved_count} contacts du segment`)
            router.push(`/campaigns/whatsapp/${result.broadcast_id}`)
          } else {
            toast.error("Erreur lors de la création de la campagne")
          }
          return
        }

        let recipients = getRecipients()
        if (recipientMode === "tags") {
          if (selectedTagIds.length === 0) {
            toast.error("Veuillez sélectionner au moins un tag")
            setIsSending(false)
            return
          }
          const tagResult = await fetchContactsByTags(selectedTagIds)
          setTagContacts(tagResult.contacts)
          const uniqueRecipients = new Map<string, string>()
          tagResult.contacts.forEach((contact) => {
            if (contact.id && contact.phone_number) {
              uniqueRecipients.set(contact.id, contact.phone_number)
            }
          })
          recipients = Array.from(uniqueRecipients.values())
        }

        const headerMediaComp = buildHeaderMediaComponent()
        const broadcastComponents = headerMediaComp ? [headerMediaComp] : undefined

        const result = await whatsappService.createBroadcast(
          recipients,
          selectedTemplate.name,
          selectedTemplate.language,
          campaignName.trim(),
          broadcastComponents as typeof broadcastComponents
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

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const canSend =
    !isSending &&
    !tagContactsLoading &&
    !contactsLoading &&
    !!campaignName.trim() &&
    !!selectedTemplate &&
    (recipientMode === "segment" ? !!selectedSegmentId : recipientCount > 0) &&
    (creditCheck === null || creditCheck.can_send)

  const recipientsBootstrapping = !recipientsBootstrapDone && contactsLoading

  // === Render ===

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-52" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (isConfigured === false) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/campaigns/whatsapp">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Nouvelle campagne WhatsApp</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Créez une campagne WhatsApp avec un template approuvé.
            </p>
          </div>
        </div>

        <Card className="border-transparent">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-[15px] font-medium">WhatsApp non configuré</p>
            <p className="text-[13px] text-muted-foreground mb-4 text-center max-w-md">
              Configurez vos credentials WhatsApp Business API pour créer des campagnes
            </p>
            <Link href="/whatsapp/config">
              <Button size="sm" className="h-8 gap-1.5 text-[13px] rounded-lg">
                <Settings className="h-3.5 w-3.5" />
                Configurer WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/campaigns/whatsapp">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Nouvelle campagne WhatsApp</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Choisissez un template, sélectionnez vos destinataires et envoyez.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Left Column - Compact Form */}
        <div className="space-y-4">
          {/* 1. Campaign Name (required) */}
          <Card className="border-transparent">
            <CardContent className="p-4 space-y-2">
              <Label htmlFor="campaignName" className="text-[13px] font-medium">
                Nom de la campagne <span className="text-red-500">*</span>
              </Label>
              <Input
                id="campaignName"
                placeholder="Ex: Promo Février 2026"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="h-9 text-[13px]"
              />
            </CardContent>
          </Card>

          {/* 2. Template Trigger */}
          <Card
            className="border-transparent cursor-pointer transition-colors hover:bg-muted/30"
            onClick={() => setTemplateDialogOpen(true)}
          >
            <CardContent className="p-4">
              {selectedTemplate ? (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <LayoutTemplate className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{selectedTemplate.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{selectedTemplate.language}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[11px] text-muted-foreground capitalize">{selectedTemplate.category.toLowerCase()}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">Choisir un template</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {templates.length} template{templates.length > 1 ? "s" : ""} approuvé{templates.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Header Media (conditional) */}
          {selectedTemplate && needsHeaderMedia && (
            <HeaderMediaUpload
              headerMediaFormat={headerMediaFormat!}
              headerFile={headerFile}
              headerMediaUrl={headerMediaUrl}
              headerUploading={headerUploading}
              onFileSelected={handleHeaderFile}
              onRemove={removeHeaderFile}
            />
          )}

          {/* 4. Recipients */}
          <Card className="border-transparent relative">
            {(tagContactsLoading || contactsLoading) && (
              <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-xl">
                <div className="h-full w-1/3 bg-primary animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full" style={{ animation: "shimmer 1.5s ease-in-out infinite" }} />
                <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
              </div>
            )}
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold tracking-tight">Destinataires</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {recipientsBootstrapping && `Chargement des destinataires... ${contactsLoadedCount}${contactsTotalCount !== null ? ` / ${contactsTotalCount}` : ""}`}
                    {!recipientsBootstrapping && tagContactsLoading && `Chargement des contacts... ${tagContactsLoadedCount}${tagContactsTotalCount !== null ? ` / ${tagContactsTotalCount}` : ""}`}
                    {!recipientsBootstrapping && !tagContactsLoading && recipientMode === "tags" && `~${recipientCount} destinataire(s) estimé(s)`}
                    {!recipientsBootstrapping && contactsLoading && recipientMode === "contacts" && `Chargement... ${contactsLoadedCount}${contactsTotalCount !== null ? ` / ${contactsTotalCount}` : ""}`}
                    {!recipientsBootstrapping && !contactsLoading && recipientMode === "contacts" && `${selectedContactIds.length} contact(s) sélectionné(s)`}
                    {recipientMode === "segment" && selectedSegmentId && `~${recipientCount} contact(s) dans le segment`}
                    {recipientMode === "segment" && !selectedSegmentId && "Choisissez un segment"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={recipientMode === "tags" ? "default" : "ghost"}
                    className="h-7 gap-1.5 text-[11px] rounded-lg"
                    onClick={() => setRecipientMode("tags")}
                    disabled={recipientsBootstrapping || tagContactsLoading || contactsLoading}
                  >
                    <TagsIcon className="h-3.5 w-3.5" />
                    Tags
                  </Button>
                  <Button
                    size="sm"
                    variant={recipientMode === "contacts" ? "default" : "ghost"}
                    className="h-7 gap-1.5 text-[11px] rounded-lg"
                    onClick={() => {
                      setRecipientMode("contacts")
                      setRecipientSheetOpen(true)
                    }}
                    disabled={recipientsBootstrapping || tagContactsLoading || contactsLoading}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Contacts
                  </Button>
                  <Button
                    size="sm"
                    variant={recipientMode === "segment" ? "default" : "ghost"}
                    className="h-7 gap-1.5 text-[11px] rounded-lg"
                    onClick={() => setRecipientMode("segment")}
                    disabled={recipientsBootstrapping || tagContactsLoading || contactsLoading}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2a6 6 0 100 12A6 6 0 008 2z"/><path d="M8 5a3 3 0 100 6A3 3 0 008 5z"/></svg>
                    Segment
                  </Button>
                </div>
              </div>

              {/* Tags — modern pill selector */}
              {recipientMode === "tags" && (
                <div className={`flex flex-wrap gap-2 ${tagContactsLoading || contactsLoading || recipientsBootstrapping ? "opacity-50 pointer-events-none" : ""}`}>
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        disabled={recipientsBootstrapping || tagContactsLoading || contactsLoading}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {tag.name}
                        <span className={`text-[10px] ${isSelected ? "opacity-75" : "opacity-50"}`}>
                          {tag.contact_count}
                        </span>
                      </button>
                    )
                  })}
                  {tags.length === 0 && (
                    <p className="text-[12px] text-muted-foreground">Aucun tag disponible</p>
                  )}
                </div>
              )}

              {/* Segment picker */}
              {recipientMode === "segment" && (
                <div className="space-y-2">
                  {segments.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      Aucun segment disponible.{" "}
                      <a href="/contacts/segments/new" className="underline text-primary">Créer un segment</a>
                    </p>
                  ) : (
                    segments.map((seg) => {
                      const isSelected = selectedSegmentId === seg.id
                      return (
                        <button
                          key={seg.id}
                          type="button"
                          onClick={() => setSelectedSegmentId(isSelected ? "" : seg.id)}
                          className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-left transition-colors ${
                            isSelected
                              ? "bg-primary/10 border border-primary/30"
                              : "bg-muted/40 border border-transparent hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            <span className="text-[13px] font-medium">{seg.name}</span>
                            {seg.description && (
                              <span className="text-[11px] text-muted-foreground hidden sm:block truncate max-w-40">— {seg.description}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {seg.estimated_count != null ? `~${seg.estimated_count.toLocaleString()}` : "—"}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}

              {/* Contacts summary (click to open sheet) */}
              {recipientMode === "contacts" && (
                <button
                  type="button"
                  className="w-full rounded-xl bg-muted/40 px-4 py-3 flex items-center justify-between transition-colors hover:bg-muted/60 disabled:opacity-50 disabled:pointer-events-none"
                  onClick={() => setRecipientSheetOpen(true)}
                  disabled={contactsLoading}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[13px] font-medium">Tous les contacts</span>
                  </div>
                  <span className="text-[12px] text-muted-foreground">
                    {contactsLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      `${selectedContactIds.length} sélectionné(s)`
                    )}
                  </span>
                </button>
              )}
            </CardContent>
          </Card>

          {/* 5. Send Mode toggle + Personalization trigger */}
          <Card className="border-transparent">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold tracking-tight">Mode d&apos;envoi</h2>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={sendMode === "standard" ? "default" : "outline"}
                    className="h-7 text-[11px] rounded-lg"
                    onClick={() => setSendMode("standard")}
                  >
                    Standard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sendMode === "personalized" ? "default" : "outline"}
                    className="h-7 text-[11px] rounded-lg gap-1"
                    onClick={() => setSendMode("personalized")}
                  >
                    <Sparkles className="h-3 w-3" />
                    Personnalisé
                  </Button>
                </div>
              </div>

              {sendMode === "personalized" && selectedTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[12px] rounded-lg gap-1.5"
                  onClick={() => setPersonalizationDialogOpen(true)}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Configurer les variables
                  {templateVariables.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1.5">
                      {templateVariables.filter((v) => !!variableMapping[v.key]).length}/{templateVariables.length}
                    </Badge>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sticky Summary */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <CampaignSummary
            selectedTemplate={selectedTemplate}
            campaignName={campaignName}
            sendMode={sendMode}
            recipientCount={recipientCount}
            costEstimation={costEstimation}
            creditCheck={creditCheck}
            creditCheckLoading={creditCheckLoading}
            contactsLimitReached={contactsLimitReached}
            tagContactsLimitReached={tagContactsLimitReached}
            isSending={isSending}
            canSend={canSend}
            onSend={handleSend}
            onRechargeWallet={() => router.push("/whatsapp/credits")}
          />
        </div>
      </div>

      {/* Dialogs & Sheet */}
      <TemplateBrowserDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onSelect={(template) => setSelectedTemplateId(template.id)}
      />

      <RecipientSheet
        open={recipientSheetOpen}
        onOpenChange={setRecipientSheetOpen}
        contacts={contacts}
        contactsLoading={contactsLoading}
        contactsLoadedCount={contactsLoadedCount}
        contactsTotalCount={contactsTotalCount}
        selectedContactIds={selectedContactIds}
        onToggleContact={(id) => {
          setSelectedContactIds((prev) =>
            prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
          )
        }}
        onSelectAllContacts={() => setSelectedContactIds(contacts.map((c) => c.id))}
        onDeselectAllContacts={() => setSelectedContactIds([])}
      />

      <PersonalizationDialog
        open={personalizationDialogOpen}
        onOpenChange={setPersonalizationDialogOpen}
        templateVariables={templateVariables}
        variableMapping={variableMapping}
        onVariableMappingChange={setVariableMapping}
        systemVariableOptions={systemVariableOptions}
        customVariableOptions={customVariableOptions}
      />

      <Dialog
        open={missingCustomFieldsDialogOpen}
        onOpenChange={setMissingCustomFieldsDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Champs personnalisés manquants</DialogTitle>
            <DialogDescription>
              Certains destinataires n&apos;ont pas les valeurs requises pour personnaliser ce template.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {missingCustomFieldDetails.map((detail) => (
              <div key={detail.field} className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {detail.field} ({detail.phones.length} contact{detail.phones.length > 1 ? "s" : ""})
                </p>
                <div className="space-y-1">
                  {detail.phones.map((phone) => (
                    <div key={`${detail.field}-${phone}`} className="font-mono text-xs text-muted-foreground">
                      {phone}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setMissingCustomFieldsDialogOpen(false)}
              className="h-8 text-[13px] rounded-lg"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
