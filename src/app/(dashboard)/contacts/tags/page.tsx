"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { tagsService, customFieldsService, handleApiError } from "@/services"
import type { CustomField, Tag } from "@/types"
import { formatNumber } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  Plus,
  Edit,
  Trash,
  Tags,
  Loader2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Mail,
  Link as LinkIcon,
  Phone,
  Pencil,
  Trash2,
  Settings,
} from "lucide-react"

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
]

const FIELD_TYPES: { value: CustomField["field_type"]; label: string; icon: ReactNode }[] = [
  { value: "text", label: "Texte", icon: <Type className="h-3.5 w-3.5" /> },
  { value: "number", label: "Nombre", icon: <Hash className="h-3.5 w-3.5" /> },
  { value: "date", label: "Date", icon: <Calendar className="h-3.5 w-3.5" /> },
  { value: "boolean", label: "Oui/Non", icon: <ToggleLeft className="h-3.5 w-3.5" /> },
  { value: "select", label: "Liste déroulante", icon: <List className="h-3.5 w-3.5" /> },
  { value: "multiselect", label: "Sélection multiple", icon: <List className="h-3.5 w-3.5" /> },
  { value: "email", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
  { value: "url", label: "URL", icon: <LinkIcon className="h-3.5 w-3.5" /> },
  { value: "phone", label: "Téléphone", icon: <Phone className="h-3.5 w-3.5" /> },
]

const FALLBACK_SYSTEM_FIELDS: Array<{
  field_key: string
  label: string
  field_type: CustomField["field_type"]
}> = [
  { field_key: "first_name", label: "Prénom", field_type: "text" },
  { field_key: "last_name", label: "Nom", field_type: "text" },
  { field_key: "email", label: "Email", field_type: "email" },
  { field_key: "phone_number", label: "Téléphone", field_type: "phone" },
]

const normalizeFieldKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")

export default function TagsPage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "fields" ? "fields" : "tags"
  const [activeTab, setActiveTab] = useState(initialTab)

  const [tags, setTags] = useState<Tag[]>([])
  const [fields, setFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isSavingTag, setIsSavingTag] = useState(false)
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  const [tagName, setTagName] = useState("")
  const [tagColor, setTagColor] = useState(COLORS[0])
  const [tagDescription, setTagDescription] = useState("")

  const [showCreateFieldDialog, setShowCreateFieldDialog] = useState(false)
  const [showEditFieldDialog, setShowEditFieldDialog] = useState(false)
  const [showDeleteFieldDialog, setShowDeleteFieldDialog] = useState(false)
  const [selectedField, setSelectedField] = useState<CustomField | null>(null)
  const [isSavingField, setIsSavingField] = useState(false)

  const [fieldKey, setFieldKey] = useState("")
  const [fieldLabel, setFieldLabel] = useState("")
  const [fieldType, setFieldType] = useState<CustomField["field_type"]>("text")
  const [isRequired, setIsRequired] = useState(false)
  const [placeholder, setPlaceholder] = useState("")
  const [options, setOptions] = useState("")

  const loadData = async () => {
    try {
      const [tagsResult, fieldsResult] = await Promise.all([
        tagsService.getTags(),
        customFieldsService.getCustomFields(),
      ])
      setTags((tagsResult.tags || []).filter(Boolean))
      setFields((fieldsResult.custom_fields || []).filter(Boolean))
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
      setTags([])
      setFields([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const systemFields = useMemo(() => {
    const apiSystemFields = fields.filter((field) => field.is_system)
    if (apiSystemFields.length > 0) {
      return apiSystemFields
    }

    return FALLBACK_SYSTEM_FIELDS.map((field, index) => ({
      id: `system-${index}`,
      field_key: field.field_key,
      label: field.label,
      field_type: field.field_type,
      is_required: false,
      is_active: true,
      is_system: true,
    }))
  }, [fields])

  const customFields = useMemo(
    () => fields.filter((field) => !field.is_system),
    [fields]
  )

  const resetTagForm = () => {
    setTagName("")
    setTagColor(COLORS[0])
    setTagDescription("")
    setEditingTag(null)
  }

  const openEditTagDialog = (tag: Tag) => {
    setEditingTag(tag)
    setTagName(tag.name)
    setTagColor(tag.color)
    setTagDescription(tag.description || "")
    setIsTagDialogOpen(true)
  }

  const handleSaveTag = async () => {
    if (!tagName.trim()) {
      toast.error("Le nom est requis")
      return
    }

    setIsSavingTag(true)
    try {
      if (editingTag) {
        const result = await tagsService.updateTag(editingTag.id, {
          name: tagName,
          color: tagColor,
          description: tagDescription,
        })
        if (result.tag) {
          setTags(tags.map((tag) => (tag.id === editingTag.id ? result.tag : tag)))
        }
        toast.success("Tag mis à jour")
      } else {
        const result = await tagsService.createTag({
          name: tagName,
          color: tagColor,
          description: tagDescription,
        })
        if (result.tag) {
          setTags([...tags, result.tag])
        }
        toast.success("Tag créé")
      }
      setIsTagDialogOpen(false)
      resetTagForm()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSavingTag(false)
    }
  }

  const handleDeleteTag = async () => {
    if (!deleteTagId) return

    try {
      await tagsService.deleteTag(deleteTagId)
      setTags(tags.filter((tag) => tag.id !== deleteTagId))
      toast.success("Tag supprimé")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setDeleteTagId(null)
    }
  }

  const resetFieldForm = () => {
    setFieldKey("")
    setFieldLabel("")
    setFieldType("text")
    setIsRequired(false)
    setPlaceholder("")
    setOptions("")
    setSelectedField(null)
  }

  const getFieldTypeInfo = (type: CustomField["field_type"]) => {
    return FIELD_TYPES.find((entry) => entry.value === type) || FIELD_TYPES[0]
  }

  const handleCreateField = async () => {
    const computedFieldKey = normalizeFieldKey(fieldLabel)
    if (!computedFieldKey || !fieldLabel.trim()) {
      toast.error("Le libellé est requis")
      return
    }

    setIsSavingField(true)
    try {
      const optionsArray = options
        .split("\n")
        .map((option) => option.trim())
        .filter((option) => option.length > 0)

      const result = await customFieldsService.createCustomField({
        field_key: computedFieldKey,
        label: fieldLabel,
        field_type: fieldType,
        is_required: isRequired,
        is_global: true,
        placeholder: placeholder || undefined,
        options: optionsArray.length > 0 ? optionsArray : undefined,
      })

      if (result.custom_field) {
        setFields([...fields, result.custom_field])
      } else {
        await loadData()
      }

      toast.success("Champ personnalisé créé")
      setShowCreateFieldDialog(false)
      resetFieldForm()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSavingField(false)
    }
  }

  const openEditFieldDialog = (field: CustomField) => {
    setSelectedField(field)
    setFieldKey(field.field_key)
    setFieldLabel(field.label)
    setFieldType(field.field_type)
    setIsRequired(field.is_required)
    setPlaceholder(field.placeholder || "")
    setOptions(field.options?.join("\n") || "")
    setShowEditFieldDialog(true)
  }

  const handleEditField = async () => {
    if (!selectedField) return

    setIsSavingField(true)
    try {
      const optionsArray = options
        .split("\n")
        .map((option) => option.trim())
        .filter((option) => option.length > 0)

      const result = await customFieldsService.updateCustomField(selectedField.id, {
        label: fieldLabel,
        is_required: isRequired,
        placeholder: placeholder || undefined,
        options: optionsArray.length > 0 ? optionsArray : undefined,
      })

      if (result.custom_field) {
        setFields(
          fields.map((field) =>
            field.id === selectedField.id ? { ...field, ...result.custom_field } : field
          )
        )
      } else {
        await loadData()
      }

      toast.success("Champ personnalisé mis à jour")
      setShowEditFieldDialog(false)
      resetFieldForm()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSavingField(false)
    }
  }

  const handleDeleteField = async () => {
    if (!selectedField) return

    try {
      await customFieldsService.deleteCustomField(selectedField.id)
      setFields(fields.filter((field) => field.id !== selectedField.id))
      toast.success("Champ personnalisé supprimé")
      setShowDeleteFieldDialog(false)
      resetFieldForm()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const handleToggleFieldActive = async (field: CustomField) => {
    try {
      const result = await customFieldsService.updateCustomField(field.id, {
        is_active: !field.is_active,
      })

      if (result.custom_field) {
        setFields(
          fields.map((entry) =>
            entry.id === field.id ? { ...entry, ...result.custom_field } : entry
          )
        )
      } else {
        setFields(
          fields.map((entry) =>
            entry.id === field.id ? { ...entry, is_active: !field.is_active } : entry
          )
        )
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Paramétrage</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Gérez les tags et les champs de contact globaux.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="tags" className="text-[13px] px-4">Tags</TabsTrigger>
          <TabsTrigger value="fields" className="text-[13px] px-4">Champs</TabsTrigger>
        </TabsList>

        {/* ── Tags tab ── */}
        <TabsContent value="tags" className="space-y-5 mt-5">
          <div className="flex justify-end">
            <Dialog
              open={isTagDialogOpen}
              onOpenChange={(open) => {
                setIsTagDialogOpen(open)
                if (!open) resetTagForm()
              }}
            >
              <DialogTrigger asChild>
                <Button className="h-8 text-[13px] rounded-lg gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Nouveau tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-[15px]">{editingTag ? "Modifier le tag" : "Nouveau tag"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tag-name" className="text-[13px]">Nom</Label>
                    <Input
                      id="tag-name"
                      placeholder="Ex: VIP"
                      value={tagName}
                      onChange={(event) => setTagName(event.target.value)}
                      className="h-9 text-[13px] rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Couleur</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((currentColor) => (
                        <button
                          key={currentColor}
                          type="button"
                          className={`h-7 w-7 rounded-full transition-transform ${
                            tagColor === currentColor ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                          }`}
                          style={{ backgroundColor: currentColor }}
                          onClick={() => setTagColor(currentColor)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tag-description" className="text-[13px]">Description (optionnel)</Label>
                    <Input
                      id="tag-description"
                      placeholder="Description du tag"
                      value={tagDescription}
                      onChange={(event) => setTagDescription(event.target.value)}
                      className="h-9 text-[13px] rounded-lg"
                    />
                  </div>
                  <div className="pt-1">
                    <Label className="text-[13px]">Aperçu</Label>
                    <div className="mt-1.5">
                      <Badge className="text-[10px]" style={{ backgroundColor: tagColor }}>
                        {tagName || "Tag"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="h-8 text-[13px] rounded-lg"
                    onClick={() => {
                      setIsTagDialogOpen(false)
                      resetTagForm()
                    }}
                  >
                    Annuler
                  </Button>
                  <Button className="h-8 text-[13px] rounded-lg" onClick={handleSaveTag} disabled={isSavingTag}>
                    {isSavingTag && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {editingTag ? "Enregistrer" : "Créer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="space-y-1">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Tags className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-[13px] font-medium">Aucun tag</p>
              <p className="text-[13px] text-muted-foreground mb-4">Créez des tags pour organiser vos contacts</p>
              <Button className="h-8 text-[13px] rounded-lg gap-1.5" onClick={() => setIsTagDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Nouveau tag
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {tags.map((tag, i) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-accent/50 transition-colors duration-200"
                  style={stagger(i)}
                >
                  {/* Badge */}
                  <Badge className="text-[10px] h-5 shrink-0" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </Badge>

                  {/* Count */}
                  <span className="text-[13px] font-medium shrink-0">
                    {formatNumber(typeof tag.contact_count === "number" ? tag.contact_count : 0)}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">contacts</span>

                  {/* Description */}
                  {tag.description && (
                    <span className="text-[11px] text-muted-foreground truncate hidden sm:block">
                      — {tag.description}
                    </span>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTagDialog(tag)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTagId(tag.id)}>
                      <Trash className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Fields tab ── */}
        <TabsContent value="fields" className="space-y-5 mt-5">
          {/* System fields */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Champs système</h2>
            </div>
            <p className="text-[11px] text-muted-foreground px-1">
              Champs standards fournis par le backend.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[13px]">Libellé</TableHead>
                  <TableHead className="text-[13px]">Clé</TableHead>
                  <TableHead className="text-[13px]">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemFields.map((field) => {
                  const typeInfo = getFieldTypeInfo(field.field_type)
                  return (
                    <TableRow key={field.id}>
                      <TableCell className="text-[13px] font-medium">{field.label}</TableCell>
                      <TableCell>
                        <code className="text-[11px] bg-muted px-2 py-0.5 rounded">{field.field_key}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-[13px]">
                          {typeInfo.icon}
                          <span>{typeInfo.label}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Custom fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Champs personnalisés</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Champs créés ici, partagés globalement pour tous les contacts.
                </p>
              </div>
              <Button className="h-8 text-[13px] rounded-lg gap-1.5" onClick={() => setShowCreateFieldDialog(true)}>
                <Plus className="h-3.5 w-3.5" />
                Nouveau champ
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-1">
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : customFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-[13px] font-medium mb-1">Aucun champ personnalisé</p>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Créez des champs pour stocker des informations additionnelles.
                </p>
                <Button className="h-8 text-[13px] rounded-lg gap-1.5" onClick={() => setShowCreateFieldDialog(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Créer un champ
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[13px]">Libellé</TableHead>
                    <TableHead className="text-[13px]">Clé</TableHead>
                    <TableHead className="text-[13px]">Type</TableHead>
                    <TableHead className="text-[13px]">Requis</TableHead>
                    <TableHead className="text-[13px]">Actif</TableHead>
                    <TableHead className="text-right text-[13px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customFields.map((field) => {
                    const typeInfo = getFieldTypeInfo(field.field_type)
                    return (
                      <TableRow key={field.id}>
                        <TableCell className="text-[13px] font-medium">{field.label}</TableCell>
                        <TableCell>
                          <code className="text-[11px] bg-muted px-2 py-0.5 rounded">{field.field_key}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-[13px]">
                            {typeInfo.icon}
                            <span>{typeInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px]">{field.is_required ? <Badge variant="secondary" className="text-[10px] h-5">Oui</Badge> : "Non"}</TableCell>
                        <TableCell>
                          <Switch
                            checked={field.is_active}
                            onCheckedChange={() => handleToggleFieldActive(field)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditFieldDialog(field)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSelectedField(field)
                                setShowDeleteFieldDialog(true)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete tag dialog */}
      <AlertDialog open={!!deleteTagId} onOpenChange={() => setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Supprimer le tag ?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              Cette action est irréversible. Le tag sera retiré de tous les contacts associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-[13px] rounded-lg">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              className="h-8 text-[13px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create field dialog */}
      <Dialog open={showCreateFieldDialog} onOpenChange={setShowCreateFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[15px]">Nouveau champ personnalisé</DialogTitle>
            <DialogDescription className="text-[13px]">Définissez un nouveau champ pour vos contacts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="field-label" className="text-[13px]">Libellé *</Label>
              <Input
                id="field-label"
                placeholder="Ex: Entreprise"
                value={fieldLabel}
                onChange={(event) => setFieldLabel(event.target.value)}
                className="h-9 text-[13px] rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Clé technique</Label>
              <Input value={normalizeFieldKey(fieldLabel) || "auto"} disabled className="h-9 text-[13px] rounded-lg" />
              <p className="text-[11px] text-muted-foreground">
                Utilisée dans les templates : {"{{"}custom.{normalizeFieldKey(fieldLabel) || "company"}{"}}"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Type de champ</Label>
              <Select value={fieldType} onValueChange={(value) => setFieldType(value as CustomField["field_type"])}>
                <SelectTrigger className="h-9 text-[13px] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-[13px]">
                      <div className="flex items-center gap-1.5">
                        {type.icon}
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(fieldType === "select" || fieldType === "multiselect") && (
              <div className="space-y-1.5">
                <Label htmlFor="field-options" className="text-[13px]">Options (une par ligne)</Label>
                <textarea
                  id="field-options"
                  className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-[13px]"
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  value={options}
                  onChange={(event) => setOptions(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="field-placeholder" className="text-[13px]">Placeholder</Label>
              <Input
                id="field-placeholder"
                placeholder="Texte d'aide..."
                value={placeholder}
                onChange={(event) => setPlaceholder(event.target.value)}
                className="h-9 text-[13px] rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="field-required" className="text-[13px]">Champ requis</Label>
              <Switch id="field-required" checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-8 text-[13px] rounded-lg"
              onClick={() => {
                setShowCreateFieldDialog(false)
                resetFieldForm()
              }}
            >
              Annuler
            </Button>
            <Button className="h-8 text-[13px] rounded-lg" onClick={handleCreateField} disabled={isSavingField}>
              {isSavingField && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit field dialog */}
      <Dialog open={showEditFieldDialog} onOpenChange={setShowEditFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[15px]">Modifier le champ</DialogTitle>
            <DialogDescription className="text-[13px]">Modifiez les propriétés du champ personnalisé</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-field-label" className="text-[13px]">Libellé *</Label>
              <Input
                id="edit-field-label"
                value={fieldLabel}
                onChange={(event) => setFieldLabel(event.target.value)}
                className="h-9 text-[13px] rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Clé technique</Label>
              <Input value={fieldKey} disabled className="h-9 text-[13px] rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Type de champ</Label>
              <Input value={getFieldTypeInfo(fieldType).label} disabled className="h-9 text-[13px] rounded-lg" />
            </div>
            {(fieldType === "select" || fieldType === "multiselect") && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-field-options" className="text-[13px]">Options (une par ligne)</Label>
                <textarea
                  id="edit-field-options"
                  className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-[13px]"
                  value={options}
                  onChange={(event) => setOptions(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-field-placeholder" className="text-[13px]">Placeholder</Label>
              <Input
                id="edit-field-placeholder"
                value={placeholder}
                onChange={(event) => setPlaceholder(event.target.value)}
                className="h-9 text-[13px] rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-field-required" className="text-[13px]">Champ requis</Label>
              <Switch id="edit-field-required" checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-8 text-[13px] rounded-lg"
              onClick={() => {
                setShowEditFieldDialog(false)
                resetFieldForm()
              }}
            >
              Annuler
            </Button>
            <Button className="h-8 text-[13px] rounded-lg" onClick={handleEditField} disabled={isSavingField}>
              {isSavingField && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete field dialog */}
      <AlertDialog open={showDeleteFieldDialog} onOpenChange={setShowDeleteFieldDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Supprimer ce champ ?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              Cette action est irréversible. Les données de ce champ seront perdues pour tous les contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-8 text-[13px] rounded-lg"
              onClick={() => {
                setShowDeleteFieldDialog(false)
                resetFieldForm()
              }}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteField}
              className="h-8 text-[13px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
