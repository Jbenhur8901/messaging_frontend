"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { tagsService, customFieldsService, handleApiError } from "@/services"
import type { CustomField, Tag } from "@/types"
import { formatNumber } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
]

const FIELD_TYPES: { value: CustomField["field_type"]; label: string; icon: ReactNode }[] = [
  { value: "text", label: "Texte", icon: <Type className="h-4 w-4" /> },
  { value: "number", label: "Nombre", icon: <Hash className="h-4 w-4" /> },
  { value: "date", label: "Date", icon: <Calendar className="h-4 w-4" /> },
  { value: "boolean", label: "Oui/Non", icon: <ToggleLeft className="h-4 w-4" /> },
  { value: "select", label: "Liste déroulante", icon: <List className="h-4 w-4" /> },
  { value: "multiselect", label: "Sélection multiple", icon: <List className="h-4 w-4" /> },
  { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { value: "url", label: "URL", icon: <LinkIcon className="h-4 w-4" /> },
  { value: "phone", label: "Téléphone", icon: <Phone className="h-4 w-4" /> },
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Paramétrage</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les tags et les champs de contact globaux.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="fields">Champs</TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="space-y-6">
          <div className="flex justify-end">
            <Dialog
              open={isTagDialogOpen}
              onOpenChange={(open) => {
                setIsTagDialogOpen(open)
                if (!open) resetTagForm()
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTag ? "Modifier le tag" : "Nouveau tag"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="tag-name">Nom</Label>
                    <Input
                      id="tag-name"
                      placeholder="Ex: VIP"
                      value={tagName}
                      onChange={(event) => setTagName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Couleur</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((currentColor) => (
                        <button
                          key={currentColor}
                          type="button"
                          className={`h-8 w-8 rounded-full transition-transform ${
                            tagColor === currentColor ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                          }`}
                          style={{ backgroundColor: currentColor }}
                          onClick={() => setTagColor(currentColor)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tag-description">Description (optionnel)</Label>
                    <Input
                      id="tag-description"
                      placeholder="Description du tag"
                      value={tagDescription}
                      onChange={(event) => setTagDescription(event.target.value)}
                    />
                  </div>
                  <div className="pt-2">
                    <Label>Aperçu</Label>
                    <div className="mt-2">
                      <Badge style={{ backgroundColor: tagColor }}>
                        {tagName || "Tag"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsTagDialogOpen(false)
                      resetTagForm()
                    }}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleSaveTag} disabled={isSavingTag}>
                    {isSavingTag && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingTag ? "Enregistrer" : "Créer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <Card key={index}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tags.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Tags className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">Aucun tag</p>
                <p className="text-muted-foreground mb-4">Créez des tags pour organiser vos contacts</p>
                <Button onClick={() => setIsTagDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau tag
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tags.map((tag) => (
                <Card key={tag.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Badge style={{ backgroundColor: tag.color }}>{tag.name}</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditTagDialog(tag)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTagId(tag.id)}>
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {formatNumber(typeof tag.contact_count === "number" ? tag.contact_count : 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">contacts</p>
                    {tag.description && <p className="text-sm text-muted-foreground mt-2">{tag.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fields" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Champs système</CardTitle>
              </div>
              <CardDescription>
                Champs standards fournis par le backend.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Clé</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemFields.map((field) => {
                    const typeInfo = getFieldTypeInfo(field.field_type)
                    return (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.label}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{field.field_key}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {typeInfo.icon}
                            <span>{typeInfo.label}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Champs personnalisés</CardTitle>
                <CardDescription>
                  Champs créés ici, partagés globalement pour tous les contacts.
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateFieldDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau champ
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : customFields.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-medium mb-2">Aucun champ personnalisé</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Créez des champs pour stocker des informations additionnelles.
                  </p>
                  <Button onClick={() => setShowCreateFieldDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un champ
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Clé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Requis</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customFields.map((field) => {
                      const typeInfo = getFieldTypeInfo(field.field_type)
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{field.label}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{field.field_key}</code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {typeInfo.icon}
                              <span>{typeInfo.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>{field.is_required ? <Badge variant="secondary">Oui</Badge> : "Non"}</TableCell>
                          <TableCell>
                            <Switch
                              checked={field.is_active}
                              onCheckedChange={() => handleToggleFieldActive(field)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditFieldDialog(field)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedField(field)
                                  setShowDeleteFieldDialog(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTagId} onOpenChange={() => setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le tag ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le tag sera retiré de tous les contacts associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCreateFieldDialog} onOpenChange={setShowCreateFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau champ personnalisé</DialogTitle>
            <DialogDescription>Définissez un nouveau champ pour vos contacts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="field-label">Libellé *</Label>
              <Input
                id="field-label"
                placeholder="Ex: Entreprise"
                value={fieldLabel}
                onChange={(event) => setFieldLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Clé technique</Label>
              <Input value={normalizeFieldKey(fieldLabel) || "auto"} disabled />
              <p className="text-xs text-muted-foreground">
                Utilisée dans les templates : {"{{"}custom.{normalizeFieldKey(fieldLabel) || "company"}{"}}"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type de champ</Label>
              <Select value={fieldType} onValueChange={(value) => setFieldType(value as CustomField["field_type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {type.icon}
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(fieldType === "select" || fieldType === "multiselect") && (
              <div className="space-y-2">
                <Label htmlFor="field-options">Options (une par ligne)</Label>
                <textarea
                  id="field-options"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  value={options}
                  onChange={(event) => setOptions(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                placeholder="Texte d'aide..."
                value={placeholder}
                onChange={(event) => setPlaceholder(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="field-required">Champ requis</Label>
              <Switch id="field-required" checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateFieldDialog(false)
                resetFieldForm()
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleCreateField} disabled={isSavingField}>
              {isSavingField && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditFieldDialog} onOpenChange={setShowEditFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le champ</DialogTitle>
            <DialogDescription>Modifiez les propriétés du champ personnalisé</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-field-label">Libellé *</Label>
              <Input
                id="edit-field-label"
                value={fieldLabel}
                onChange={(event) => setFieldLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Clé technique</Label>
              <Input value={fieldKey} disabled />
            </div>
            <div className="space-y-2">
              <Label>Type de champ</Label>
              <Input value={getFieldTypeInfo(fieldType).label} disabled />
            </div>
            {(fieldType === "select" || fieldType === "multiselect") && (
              <div className="space-y-2">
                <Label htmlFor="edit-field-options">Options (une par ligne)</Label>
                <textarea
                  id="edit-field-options"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={options}
                  onChange={(event) => setOptions(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-field-placeholder">Placeholder</Label>
              <Input
                id="edit-field-placeholder"
                value={placeholder}
                onChange={(event) => setPlaceholder(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-field-required">Champ requis</Label>
              <Switch id="edit-field-required" checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditFieldDialog(false)
                resetFieldForm()
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleEditField} disabled={isSavingField}>
              {isSavingField && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteFieldDialog} onOpenChange={setShowDeleteFieldDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce champ ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les données de ce champ seront perdues pour tous les contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteFieldDialog(false)
                resetFieldForm()
              }}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteField}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
