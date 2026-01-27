"use client"

import { useEffect, useState } from "react"
import { templatesService, handleApiError } from "@/services"
import type { Template } from "@/types"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner"
import { Plus, Edit, Trash, FileText, Copy, Loader2 } from "lucide-react"

const CATEGORIES = [
  { value: "transactional", label: "Transactionnel" },
  { value: "marketing", label: "Marketing" },
  { value: "notification", label: "Notification" },
  { value: "other", label: "Autre" },
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [body, setBody] = useState("")
  const [category, setCategory] = useState<Template["category"]>("transactional")

  const loadTemplates = async () => {
    try {
      const result = await templatesService.getTemplates(undefined, 100, 0)
      setTemplates((result.templates || []).filter(Boolean))
    } catch (error) {
      console.error("Error loading templates:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const resetForm = () => {
    setName("")
    setBody("")
    setCategory("transactional")
    setEditingTemplate(null)
  }

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template)
    setName(template.name)
    setBody(template.body)
    setCategory(template.category)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error("Le nom et le contenu sont requis")
      return
    }

    setIsSaving(true)
    try {
      if (editingTemplate) {
        const result = await templatesService.updateTemplate(editingTemplate.id, {
          name,
          body,
          category,
        })
        if (result.template) {
          setTemplates(
            templates.map((t) => (t.id === editingTemplate.id ? result.template : t))
          )
        }
        toast.success("Template mis à jour")
      } else {
        const result = await templatesService.createTemplate({
          name,
          body,
          category,
        })
        if (result.template) {
          setTemplates([...templates, result.template])
        }
        toast.success("Template créé")
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTemplateId) return

    try {
      await templatesService.deleteTemplate(deleteTemplateId)
      setTemplates(templates.filter((t) => t.id !== deleteTemplateId))
      toast.success("Template supprimé")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setDeleteTemplateId(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copié dans le presse-papiers")
  }

  // Extract variables from body
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g)
    return matches ? [...new Set(matches.map((m) => m.slice(2, -2)))] : []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos modèles de messages SMS
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Modifier le template" : "Nouveau template"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Confirmation commande"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as Template["category"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  placeholder="Bonjour {{prenom}}, votre commande #{{numero}} est confirmée."
                  className="min-h-[120px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez {"{{variable}}"} pour les champs dynamiques
                </p>
              </div>
              {body && extractVariables(body).length > 0 && (
                <div className="space-y-2">
                  <Label>Variables détectées</Label>
                  <div className="flex flex-wrap gap-2">
                    {extractVariables(body).map((v) => (
                      <Badge key={v} variant="secondary">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  resetForm()
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTemplate ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">Aucun template</p>
            <p className="text-muted-foreground mb-4">
              Créez des templates pour accélérer vos campagnes
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <Badge variant="secondary">
                      {CATEGORIES.find((c) => c.value === template.category)?.label}
                    </Badge>
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(template.body)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTemplateId(template.id)}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {template.body}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{template.character_count} car.</span>
                  <span>•</span>
                  <span>{template.segments_count} seg.</span>
                  <span>•</span>
                  <Badge variant={template.encoding === "GSM-7" ? "secondary" : "warning"} className="text-xs">
                    {template.encoding}
                  </Badge>
                </div>
                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.variables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTemplateId}
        onOpenChange={() => setDeleteTemplateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le template ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le template sera définitivement
              supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
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
