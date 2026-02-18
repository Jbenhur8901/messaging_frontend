"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { contactsService, tagsService, customFieldsService, whatsappService, handleApiError } from "@/services"
import type { Contact, Tag, CustomField, ConsentStatus, ConsentHistoryEntry } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!contact) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Modifier le contact</h1>
          <p className="text-muted-foreground mt-1">
            Mettez à jour les informations du contact.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Numéro de téléphone *</Label>
                <Input
                  id="phone_number"
                  placeholder="+33612345678"
                  {...register("phone_number")}
                />
                {errors.phone_number && (
                  <p className="text-sm text-destructive">
                    {errors.phone_number.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input id="first_name" placeholder="Jean" {...register("first_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input id="last_name" placeholder="Dupont" {...register("last_name")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                      borderColor: tag.color,
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
                  <p className="text-muted-foreground text-sm">
                    Aucun tag disponible.{" "}
                    <Link href="/contacts/tags" className="text-primary hover:underline">
                      Créer un tag
                    </Link>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Consentement WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle>Consentement WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConsentLoading ? (
                <Skeleton className="h-8 w-full" />
              ) : consentStatus ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {consentStatus.opted_in ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Opt-in
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Opt-out
                        </Badge>
                      )}
                      {consentStatus.opted_in && consentStatus.opted_in_at && (
                        <span className="text-xs text-muted-foreground">
                          depuis le {new Date(consentStatus.opted_in_at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                      {!consentStatus.opted_in && consentStatus.opted_out_at && (
                        <span className="text-xs text-muted-foreground">
                          depuis le {new Date(consentStatus.opted_out_at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                    <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          {consentStatus.opted_in ? "Opt-out" : "Opt-in"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>
                            {consentStatus.opted_in ? "Retirer le consentement" : "Donner le consentement"}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Source</Label>
                            <Select value={consentSource} onValueChange={setConsentSource}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Manuel</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                                <SelectItem value="web">Web</SelectItem>
                                <SelectItem value="api">API</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleConsentToggle} disabled={isConsentSubmitting} className="w-full">
                            {isConsentSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmer
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {consentHistory.length > 0 && (
                    <div className="border-t pt-3 space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Historique</h4>
                      {consentHistory.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2 text-xs">
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
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune donn&eacute;e de consentement disponible
                </p>
              )}
            </CardContent>
          </Card>

          {customFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Champs personnalisés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label>{field.label}</Label>
                    {field.field_type === "boolean" ? (
                      <Select
                        value={customFieldValues[field.field_key] ?? ""}
                        onValueChange={(value) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Oui</SelectItem>
                          <SelectItem value="false">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : field.field_type === "select" && field.options && field.options.length > 0 ? (
                      <Select
                        value={customFieldValues[field.field_key] ?? ""}
                        onValueChange={(value) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || "Sélectionner"} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
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
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Link href="/contacts">
              <Button variant="outline" type="button">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
