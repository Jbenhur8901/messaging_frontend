"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { contactsService, tagsService, customFieldsService, handleApiError } from "@/services"
import type { Tag, CustomField } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Nouveau contact</h1>
          <p className="text-muted-foreground mt-1">
            Ajoutez un nouveau contact à votre liste.
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
                <p className="text-xs text-muted-foreground">
                  Format attendu: international (ex. +33612345678). Si vous saisissez uniquement
                  des chiffres, le + sera ajouté automatiquement.
                </p>
                {errors.phone_number && (
                  <p className="text-sm text-destructive">
                    {errors.phone_number.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input
                    id="first_name"
                    placeholder="Jean"
                    {...register("first_name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    placeholder="Dupont"
                    {...register("last_name")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean.dupont@exemple.com"
                  {...register("email")}
                />
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
                    className="cursor-pointer transition-colors"
                    style={{
                      backgroundColor: selectedTags.includes(tag.id)
                        ? tag.color
                        : undefined,
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le contact
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
