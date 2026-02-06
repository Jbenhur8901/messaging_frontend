"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { customFieldsService, handleApiError } from "@/services"
import type { CustomField } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  ArrowLeft,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Mail,
  Link as LinkIcon,
  Phone,
} from "lucide-react"

const FIELD_TYPES: { value: CustomField["field_type"]; label: string; icon: React.ReactNode }[] = [
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

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedField, setSelectedField] = useState<CustomField | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [fieldKey, setFieldKey] = useState("")
  const [fieldLabel, setFieldLabel] = useState("")
  const [fieldType, setFieldType] = useState<CustomField["field_type"]>("text")
  const [isRequired, setIsRequired] = useState(false)
  const [placeholder, setPlaceholder] = useState("")
  const [options, setOptions] = useState("")

  const loadFields = async () => {
    try {
      const data = await customFieldsService.getCustomFields()
      setFields(data.custom_fields || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
      setFields([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFields()
  }, [])

  const resetForm = () => {
    setFieldKey("")
    setFieldLabel("")
    setFieldType("text")
    setIsRequired(false)
    setPlaceholder("")
    setOptions("")
    setSelectedField(null)
  }

  const handleCreate = async () => {
    if (!fieldKey.trim() || !fieldLabel.trim()) {
      toast.error("La clé et le libellé sont requis")
      return
    }

    setIsSaving(true)
    try {
      const optionsArray = options
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0)

      await customFieldsService.createCustomField({
        field_key: fieldKey.toLowerCase().replace(/\s+/g, "_"),
        label: fieldLabel,
        field_type: fieldType,
        is_required: isRequired,
        placeholder: placeholder || undefined,
        options: optionsArray.length > 0 ? optionsArray : undefined,
      })

      toast.success("Champ personnalisé créé")
      setShowCreateDialog(false)
      resetForm()
      loadFields()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedField) return

    setIsSaving(true)
    try {
      const optionsArray = options
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0)

      await customFieldsService.updateCustomField(selectedField.id, {
        label: fieldLabel,
        is_required: isRequired,
        placeholder: placeholder || undefined,
        options: optionsArray.length > 0 ? optionsArray : undefined,
      })

      toast.success("Champ personnalisé mis à jour")
      setShowEditDialog(false)
      resetForm()
      loadFields()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedField) return

    try {
      await customFieldsService.deleteCustomField(selectedField.id)
      toast.success("Champ personnalisé supprimé")
      setShowDeleteDialog(false)
      resetForm()
      loadFields()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const handleToggleActive = async (field: CustomField) => {
    try {
      await customFieldsService.updateCustomField(field.id, {
        is_active: !field.is_active,
      })
      loadFields()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const openEditDialog = (field: CustomField) => {
    setSelectedField(field)
    setFieldKey(field.field_key)
    setFieldLabel(field.label)
    setFieldType(field.field_type)
    setIsRequired(field.is_required)
    setPlaceholder(field.placeholder || "")
    setOptions(field.options?.join("\n") || "")
    setShowEditDialog(true)
  }

  const getFieldTypeInfo = (type: CustomField["field_type"]) => {
    return FIELD_TYPES.find((t) => t.value === type) || FIELD_TYPES[0]
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Champs personnalisés</h1>
            <p className="text-muted-foreground mt-1">
              Définissez les champs supplémentaires pour vos contacts.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau champ
          </Button>
        </div>
      </div>

      {/* Fields Table */}
      <Card>
        <CardHeader>
          <CardTitle>Champs définis</CardTitle>
          <CardDescription>
            Ces champs seront disponibles lors de la création ou modification de contacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!fields || fields.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 border border-border/60">
                  <Type className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="font-medium mb-2">Aucun champ personnalisé</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Créez des champs pour stocker des informations supplémentaires sur vos contacts
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
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
                {fields.map((field) => {
                  const typeInfo = getFieldTypeInfo(field.field_type)
                  return (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {field.field_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typeInfo.icon}
                          <span>{typeInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {field.is_required ? (
                          <Badge variant="secondary">Oui</Badge>
                        ) : (
                          <span className="text-muted-foreground">Non</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={field.is_active}
                          onCheckedChange={() => handleToggleActive(field)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(field)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedField(field)
                              setShowDeleteDialog(true)
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau champ personnalisé</DialogTitle>
            <DialogDescription>
              Définissez un nouveau champ pour vos contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fieldLabel">Libellé *</Label>
              <Input
                id="fieldLabel"
                placeholder="Ex: Entreprise"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldKey">Clé technique *</Label>
              <Input
                id="fieldKey"
                placeholder="Ex: company"
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              />
              <p className="text-xs text-muted-foreground">
                Utilisée dans les templates : {"{{"}custom.{fieldKey || "company"}{"}}"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type de champ</Label>
              <Select value={fieldType} onValueChange={(v) => setFieldType(v as CustomField["field_type"])}>
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
                <Label htmlFor="options">Options (une par ligne)</Label>
                <textarea
                  id="options"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                placeholder="Texte d'aide..."
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isRequired">Champ requis</Label>
              <Switch
                id="isRequired"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm() }}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le champ</DialogTitle>
            <DialogDescription>
              Modifiez les propriétés du champ personnalisé
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFieldLabel">Libellé *</Label>
              <Input
                id="editFieldLabel"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Clé technique</Label>
              <Input value={fieldKey} disabled />
              <p className="text-xs text-muted-foreground">
                La clé ne peut pas être modifiée
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type de champ</Label>
              <Input value={getFieldTypeInfo(fieldType).label} disabled />
            </div>
            {(fieldType === "select" || fieldType === "multiselect") && (
              <div className="space-y-2">
                <Label htmlFor="editOptions">Options (une par ligne)</Label>
                <textarea
                  id="editOptions"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="editPlaceholder">Placeholder</Label>
              <Input
                id="editPlaceholder"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="editIsRequired">Champ requis</Label>
              <Switch
                id="editIsRequired"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm() }}>
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce champ ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les données de ce champ seront perdues pour tous les contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteDialog(false); resetForm() }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
