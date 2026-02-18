"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { contactsService, tagsService, customFieldsService, handleApiError } from "@/services"
import type { Tag, CustomField } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ArrowLeft } from "lucide-react"

const normalizePhoneNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith("+")) return trimmed
  if (trimmed.startsWith("00") && trimmed.length > 2) {
    const rest = trimmed.slice(2)
    return /^\d+$/.test(rest) ? `+${rest}` : trimmed
  }
  return /^\d+$/.test(trimmed) ? `+${trimmed}` : trimmed
}

const contactSchema = z.object({
  phone_number: z.string().min(1, "Numéro de téléphone requis"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
})

type ContactForm = z.infer<typeof contactSchema>

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

export default function NewContactPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tagsResult, fieldsResult] = await Promise.all([
          tagsService.getTags(),
          customFieldsService.getCustomFields(),
        ])
        setTags(tagsResult.tags)
        setCustomFields(
          (fieldsResult.custom_fields || []).filter(
            (field) => !field.is_system && field.is_active !== false
          )
        )
      } catch (error) {
      }
    }
    loadData()
  }, [])

  const onSubmit = async (data: ContactForm) => {
    setIsLoading(true)
    try {
      const customFieldsPayload: Record<string, unknown> = {}
      customFields.forEach((field) => {
        const value = normalizeFieldValue(field, customFieldValues[field.field_key] || "")
        if (value !== undefined) {
          customFieldsPayload[field.field_key] = value
        }
      })

      const result = await contactsService.createContact({
        phone_number: normalizePhoneNumber(data.phone_number),
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        email: data.email || undefined,
        custom_fields: Object.keys(customFieldsPayload).length > 0 ? customFieldsPayload : undefined,
      })

      // Add tags if selected
      if (selectedTags.length > 0 && result.contact) {
        await Promise.all(
          selectedTags.map((tagId) =>
            tagsService.addContactsToTag(tagId, [result.contact.id])
          )
        )
      }

      toast.success("Contact créé avec succès")
      router.push("/contacts")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
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
          <h1 className="text-xl font-semibold tracking-tight">Nouveau contact</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Ajoutez un nouveau contact à votre liste.
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
              <p className="text-[11px] text-muted-foreground">
                Format attendu: international (ex. +33612345678). Si vous saisissez uniquement
                des chiffres, le + sera ajouté automatiquement.
              </p>
              {errors.phone_number && (
                <p className="text-[12px] text-destructive">
                  {errors.phone_number.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-[13px]">Prénom</Label>
                <Input
                  id="first_name"
                  placeholder="Jean"
                  className="h-9 text-[13px] rounded-lg"
                  {...register("first_name")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-[13px]">Nom</Label>
                <Input
                  id="last_name"
                  placeholder="Dupont"
                  className="h-9 text-[13px] rounded-lg"
                  {...register("last_name")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean.dupont@exemple.com"
                className="h-9 text-[13px] rounded-lg"
                {...register("email")}
              />
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
                    backgroundColor: selectedTags.includes(tag.id)
                      ? tag.color
                      : undefined,
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
            <Button type="submit" disabled={isLoading} className="h-8 text-[13px] rounded-lg gap-1.5">
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Créer le contact
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
