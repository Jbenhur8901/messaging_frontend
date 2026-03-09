"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { contactsService, tagsService, customFieldsService, whatsappService, handleApiError } from "@/services"
import type { Contact, Tag, CustomField, ConsentStatus, ConsentHistoryEntry } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react"

const contactSchema = z.object({
  phone_number: z.string().min(1, "Numéro de téléphone requis"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
})

type ContactForm = z.infer<typeof contactSchema>

const extractCustomFields = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") return {}
  if ("custom_fields" in (value as Record<string, unknown>)) {
    const nested = (value as { custom_fields?: unknown }).custom_fields
    if (nested && typeof nested === "object") {
      return nested as Record<string, unknown>
    }
  }
  return value as Record<string, unknown>
}

const stringifyFieldValue = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

const normalizeFieldValue = (field: CustomField, value: string): unknown => {
  if (value.trim() === "") return undefined
  if (field.field_type === "number") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  if (field.field_type === "boolean") {
    if (value === "true") return true
    if (value === "false") return false
    return undefined
  }
  if (field.field_type === "multiselect") {
    const items = value.split(",").map((item) => item.trim()).filter(Boolean)
    return items.length > 0 ? items : undefined
  }
  return value
}

export default function EditContactPage() {
  const router = useRouter()
  const params = useParams()
  const contactId = params?.id as string
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [contact, setContact] = useState<Contact | null>(null)
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null)
  const [consentHistory, setConsentHistory] = useState<ConsentHistoryEntry[]>([])
  const [isConsentLoading, setIsConsentLoading] = useState(false)
  const [consentDialogOpen, setConsentDialogOpen] = useState(false)
  const [consentSource, setConsentSource] = useState("manual")
  const [isConsentSubmitting, setIsConsentSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  })

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [contactData, tagsData, fieldsData] = await Promise.all([
          contactsService.getContact(contactId),
          tagsService.getTags(),
          customFieldsService.getCustomFields(),
        ])
        setContact(contactData)
        setTags(tagsData.tags)
        const activeCustomFields = (fieldsData.custom_fields || []).filter(
          (field) => !field.is_system && field.is_active !== false
        )
        setCustomFields(activeCustomFields)
        setSelectedTags(contactData.tags.map((t) => t.id))
        const existingCustomFields = extractCustomFields(contactData.custom_fields)
        const initialCustomValues: Record<string, string> = {}
        activeCustomFields.forEach((field) => {
          initialCustomValues[field.field_key] = stringifyFieldValue(existingCustomFields[field.field_key])
        })
        setCustomFieldValues(initialCustomValues)
        setValue("phone_number", contactData.phone_number)
        setValue("first_name", contactData.first_name || "")
        setValue("last_name", contactData.last_name || "")
        setValue("email", contactData.email || "")
      } catch (error) {
        const apiError = handleApiError(error)
        toast.error(apiError.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (contactId) {
      loadData()
      loadConsent()
    }
  }, [contactId, setValue])

  const loadConsent = async () => {
    if (!contactId) return
    setIsConsentLoading(true)
    try {
      const [status, history] = await Promise.all([
        whatsappService.getConsentStatus(contactId),
        whatsappService.getConsentHistory(contactId),
      ])
      setConsentStatus(status)
      setConsentHistory(history.history || [])
    } catch {
      // Consent may not be available for all contacts
    } finally {
      setIsConsentLoading(false)
    }
  }

  const handleConsentToggle = async () => {
    if (!contactId) return
    setIsConsentSubmitting(true)
    try {
      if (consentStatus?.opted_in) {
        await whatsappService.optOutContact(contactId, consentSource)
        toast.success("Contact opt-out effectu\u00e9")
      } else {
        await whatsappService.optInContact(contactId, consentSource)
        toast.success("Contact opt-in effectu\u00e9")
      }
      setConsentDialogOpen(false)
      loadConsent()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsConsentSubmitting(false)
    }
  }

  const onSubmit = async (data: ContactForm) => {
    if (!contactId) return
    setIsSaving(true)
    try {
      const existingCustomFields = extractCustomFields(contact?.custom_fields)
      const updatedCustomFields: Record<string, unknown> = { ...existingCustomFields }
      customFields.forEach((field) => {
        const value = normalizeFieldValue(field, customFieldValues[field.field_key] || "")
        if (value === undefined) {
          delete updatedCustomFields[field.field_key]
        } else {
          updatedCustomFields[field.field_key] = value
        }
      })

      await contactsService.updateContact(contactId, {
        phone_number: data.phone_number,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        email: data.email || undefined,
        custom_fields: updatedCustomFields,
        tag_ids: selectedTags,
      })
      toast.success("Contact mis à jour")
      router.push("/contacts")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-40 rounded-xl" />
        <div className="space-y-3 max-w-2xl">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!contact) {
    return null
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/contacts">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Modifier le contact</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Mettez à jour les informations du contact.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 max-w-2xl">
          {/* Informations */}
          <div className="space-y-4">
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Informations</h2>
            <div className="space-y-1.5">
              <Label htmlFor="phone_number" className="text-[13px]">Numéro de téléphone *</Label>
              <Input
                id="phone_number"
                placeholder="+33612345678"
                className="h-9 text-[13px] rounded-lg"
                {...register("phone_number")}
              />
              {errors.phone_number && (
                <p className="text-[12px] text-destructive">
                  {errors.phone_number.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-[13px]">Prénom</Label>
                <Input id="first_name" placeholder="Jean" className="h-9 text-[13px] rounded-lg" {...register("first_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-[13px]">Nom</Label>
                <Input id="last_name" placeholder="Dupont" className="h-9 text-[13px] rounded-lg" {...register("last_name")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px]">Email</Label>
              <Input id="email" type="email" className="h-9 text-[13px] rounded-lg" {...register("email")} />
              {errors.email && (
                <p className="text-[12px] text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer text-[10px] h-6 transition-colors duration-200"
                  style={{
                    backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                    borderColor: tag.color,
                    color: selectedTags.includes(tag.id) ? "#fff" : tag.color,
                  }}
                  onClick={() => {
                    if (selectedTags.includes(tag.id)) {
                      setSelectedTags(selectedTags.filter((id) => id !== tag.id))
                    } else {
                      setSelectedTags([...selectedTags, tag.id])
                    }
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
              {tags.length === 0 && (
                <p className="text-[13px] text-muted-foreground">
                  Aucun tag disponible.{" "}
                  <Link href="/contacts/tags" className="text-primary hover:underline">
                    Créer un tag
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Consentement WhatsApp */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Consentement WhatsApp</h2>
            {isConsentLoading ? (
              <Skeleton className="h-8 w-full rounded-xl" />
            ) : consentStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {consentStatus.opted_in ? (
                      <Badge className="text-[10px] h-5 bg-green-500">
                        <CheckCircle className="h-2.5 w-2.5 mr-1" />
                        Opt-in
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] h-5">
                        <XCircle className="h-2.5 w-2.5 mr-1" />
                        Opt-out
                      </Badge>
                    )}
                    {consentStatus.opted_in && consentStatus.opted_in_at && (
                      <span className="text-[11px] text-muted-foreground">
                        depuis le {new Date(consentStatus.opted_in_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    {!consentStatus.opted_in && consentStatus.opted_out_at && (
                      <span className="text-[11px] text-muted-foreground">
                        depuis le {new Date(consentStatus.opted_out_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                  <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-7 text-[12px] rounded-lg">
                        {consentStatus.opted_in ? "Opt-out" : "Opt-in"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="text-[15px]">
                          {consentStatus.opted_in ? "Retirer le consentement" : "Donner le consentement"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[13px]">Source</Label>
                          <Select value={consentSource} onValueChange={setConsentSource}>
                            <SelectTrigger className="h-9 text-[13px] rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual" className="text-[13px]">Manuel</SelectItem>
                              <SelectItem value="campaign" className="text-[13px]">Campagne</SelectItem>
                              <SelectItem value="web" className="text-[13px]">Web</SelectItem>
                              <SelectItem value="api" className="text-[13px]">API</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleConsentToggle} disabled={isConsentSubmitting} className="w-full h-8 text-[13px] rounded-lg gap-1.5">
                          {isConsentSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Confirmer
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {consentHistory.length > 0 && (
                  <div className="border-t pt-3 space-y-2">
                    <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Historique</h4>
                    {consentHistory.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2 text-[11px]">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${entry.action === "opt_in" ? "bg-green-500" : "bg-red-500"}`} />
                        <div>
                          <span className="font-medium">{entry.action === "opt_in" ? "Opt-in" : "Opt-out"}</span>
                          <span className="text-muted-foreground ml-1">via {entry.source}</span>
                          <div className="text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Aucune donn&eacute;e de consentement disponible
              </p>
            )}
          </div>

          {/* Custom fields */}
          {customFields.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Champs personnalisés</h2>
              {customFields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label className="text-[13px]">{field.label}</Label>
                  {field.field_type === "boolean" ? (
                    <Select
                      value={customFieldValues[field.field_key] ?? ""}
                      onValueChange={(value) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: value }))
                      }
                    >
                      <SelectTrigger className="h-9 text-[13px] rounded-lg">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true" className="text-[13px]">Oui</SelectItem>
                        <SelectItem value="false" className="text-[13px]">Non</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : field.field_type === "select" && field.options && field.options.length > 0 ? (
                    <Select
                      value={customFieldValues[field.field_key] ?? ""}
                      onValueChange={(value) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: value }))
                      }
                    >
                      <SelectTrigger className="h-9 text-[13px] rounded-lg">
                        <SelectValue placeholder={field.placeholder || "Sélectionner"} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option} className="text-[13px]">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="h-9 text-[13px] rounded-lg"
                      type={
                        field.field_type === "number"
                          ? "number"
                          : field.field_type === "date"
                          ? "date"
                          : field.field_type === "email"
                          ? "email"
                          : field.field_type === "url"
                          ? "url"
                          : "text"
                      }
                      placeholder={
                        field.placeholder ||
                        (field.field_type === "multiselect"
                          ? "Valeur1, Valeur2"
                          : undefined)
                      }
                      value={customFieldValues[field.field_key] ?? ""}
                      onChange={(event) =>
                        setCustomFieldValues((prev) => ({
                          ...prev,
                          [field.field_key]: event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Link href="/contacts">
              <Button variant="outline" type="button" className="h-8 text-[13px] rounded-lg">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving} className="h-8 text-[13px] rounded-lg gap-1.5">
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
