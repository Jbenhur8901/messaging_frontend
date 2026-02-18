"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { WhatsAppTemplate, WhatsAppTemplateCategory } from "@/types"
import { Search, Check, Megaphone, ShieldCheck, Lock, LayoutTemplate } from "lucide-react"

const CATEGORY_LABELS: Record<WhatsAppTemplateCategory, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilitaire",
  AUTHENTICATION: "Authentification",
}

const CATEGORY_ICONS: Record<WhatsAppTemplateCategory, typeof Megaphone> = {
  MARKETING: Megaphone,
  UTILITY: ShieldCheck,
  AUTHENTICATION: Lock,
}

interface TemplateBrowserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: WhatsAppTemplate[]
  selectedTemplateId: string
  onSelect: (template: WhatsAppTemplate) => void
}

export function TemplateBrowserDialog({
  open,
  onOpenChange,
  templates,
  selectedTemplateId,
  onSelect,
}: TemplateBrowserDialogProps) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<WhatsAppTemplateCategory | "ALL">("ALL")

  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category))
    return Array.from(cats).sort()
  }, [templates])

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return t.name.toLowerCase().includes(q)
      }
      return true
    })
  }, [templates, search, categoryFilter])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-base">Choisir un template</DialogTitle>
          <DialogDescription className="text-[13px]">
            Sélectionnez un template approuvé par Meta pour votre campagne.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-[13px]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCategoryFilter("ALL")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                categoryFilter === "ALL"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              Tous
              <span className={`text-[10px] ${categoryFilter === "ALL" ? "opacity-75" : "opacity-50"}`}>
                {templates.length}
              </span>
            </button>
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat]
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                    categoryFilter === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {CATEGORY_LABELS[cat]}
                  <span className={`text-[10px] ${categoryFilter === cat ? "opacity-75" : "opacity-50"}`}>
                    {templates.filter((t) => t.category === cat).length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-border/40" />

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-6 py-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <LayoutTemplate className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Aucun template trouvé</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((template) => {
                  const isSelected = template.id === selectedTemplateId
                  const CatIcon = CATEGORY_ICONS[template.category]

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        onSelect(template)
                        onOpenChange(false)
                      }}
                      className={`w-full text-left rounded-lg px-3 py-2.5 transition-all flex items-center gap-3 ${
                        isSelected
                          ? "bg-primary/5 ring-1 ring-primary/20"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <CatIcon className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/60"}`} />
                      <span className="text-[13px] font-medium truncate flex-1">{template.name}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{template.language}</span>
                      {isSelected && (
                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
