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
import { Plus, Edit, Trash, FileText, Copy, Loader2, MessageSquare, Bell, Megaphone, MoreHorizontal, Search, Filter, LayoutGrid, List, Type, Hash, Zap } from "lucide-react"
import { ChannelTabs } from "@/components/channel-tabs"

const CATEGORIES = [
  { value: "transactional", label: "Transactionnel", icon: Zap, color: "text-blue-600 bg-blue-500/10" },
  { value: "marketing", label: "Marketing", icon: Megaphone, color: "text-orange-600 bg-orange-500/10" },
  { value: "notification", label: "Notification", icon: Bell, color: "text-amber-600 bg-amber-500/10" },
  { value: "other", label: "Autre", icon: MoreHorizontal, color: "text-muted-foreground bg-muted" },
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

  const getCategoryInfo = (categoryValue: string) => {
    return CATEGORIES.find((c) => c.value === categoryValue) || CATEGORIES[3]
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates SMS</h1>
          <p className="text-muted-foreground mt-1">
            Créez et gérez vos modèles de messages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ChannelTabs basePath="templates" />
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
                <DialogHeader className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <DialogTitle className="text-xl">
                    {editingTemplate ? "Modifier le template" : "Créer un nouveau template"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Nom du template</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Confirmation commande"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-medium">Catégorie</Label>
                      <Select
                        value={category}
                        onValueChange={(v) => setCategory(v as Template["category"])}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => {
                            const Icon = cat.icon
                            return (
                              <SelectItem key={cat.value} value={cat.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {cat.label}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body" className="text-sm font-medium">Contenu du message</Label>
                    <Textarea
                      id="body"
                      placeholder="Bonjour {{prenom}}, votre commande #{{numero}} est confirmée."
                      className="min-h-[140px] resize-none"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Type className="h-3 w-3" />
                      Utilisez {"{{variable}}"} pour les champs dynamiques
                    </p>
                  </div>
                  {body && extractVariables(body).length > 0 && (
                    <div className="rounded-lg border border-border/60 bg-muted/60 p-4 space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4 text-primary" />
                        Variables détectées
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {extractVariables(body).map((v) => (
                          <Badge key={v} variant="secondary" className="font-mono">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      resetForm()
                    }}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingTemplate ? "Enregistrer" : "Créer le template"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted/60 mb-6">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-xl font-semibold">Aucun template</p>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Créez des templates réutilisables pour accélérer la création de vos campagnes SMS
            </p>
            <Button size="lg" onClick={() => setIsDialogOpen(true)} className="shadow-[var(--shadow-sm)]">
              <Plus className="mr-2 h-5 w-5" />
              Créer mon premier template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const categoryInfo = getCategoryInfo(template.category)
            const CategoryIcon = categoryInfo.icon
            return (
              <Card
                key={template.id}
                className="group relative overflow-hidden transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-primary/20"
              >
                {/* Category color bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${categoryInfo.color.replace('text-', 'bg-').replace(' bg-', ' ').split(' ')[0].replace('bg-', 'bg-')}`}
                  style={{
                    backgroundColor: categoryInfo.color.includes('blue') ? 'rgb(59 130 246 / 0.8)' :
                                     categoryInfo.color.includes('orange') ? 'rgb(249 115 22 / 0.8)' :
                                     categoryInfo.color.includes('amber') ? 'rgb(245 158 11 / 0.8)' :
                                     'rgb(100 116 139 / 0.8)'
                  }}
                />

                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold truncate mb-2">
                        {template.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={`${categoryInfo.color} border-0 font-medium`}
                      >
                        <CategoryIcon className="mr-1.5 h-3 w-3" />
                        {categoryInfo.label}
                      </Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        onClick={() => copyToClipboard(template.body)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTemplateId(template.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Message preview */}
                  <div className="relative">
                    <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
                      <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">
                        {template.body}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Type className="h-3.5 w-3.5" />
                        <span>{template.character_count} car.</span>
                      </div>
                      <div className="h-3 w-px bg-border" />
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{template.segments_count} seg.</span>
                      </div>
                    </div>
                    <Badge
                      variant={template.encoding === "GSM-7" ? "secondary" : "outline"}
                      className={`text-xs font-mono ${template.encoding !== "GSM-7" ? "border-amber-500/50 text-amber-600 bg-amber-500/10" : ""}`}
                    >
                      {template.encoding}
                    </Badge>
                  </div>

                  {/* Variables */}
                  {template.variables.length > 0 && (
                    <div className="pt-2 border-t border-border/60">
                      <div className="flex flex-wrap gap-1.5">
                        {template.variables.map((v) => (
                          <Badge
                            key={v}
                            variant="outline"
                            className="text-xs font-mono bg-primary/5 border-primary/20 text-primary"
                          >
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTemplateId}
        onOpenChange={() => setDeleteTemplateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
              <Trash className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Supprimer ce template ?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Cette action est irréversible. Le template sera définitivement supprimé et ne pourra plus être utilisé dans vos campagnes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash className="mr-2 h-4 w-4" />
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
