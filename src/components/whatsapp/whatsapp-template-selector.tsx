"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { WhatsAppTemplatePreview } from "./whatsapp-template-card"
import { TemplateStatusBadge, CategoryBadge } from "./whatsapp-status-badge"
import type { WhatsAppTemplate } from "@/types"

interface WhatsAppTemplateSelectorProps {
  templates: WhatsAppTemplate[]
  selectedTemplateId?: string
  onSelect: (template: WhatsAppTemplate | null) => void
  disabled?: boolean
  showPreview?: boolean
}

export function WhatsAppTemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  disabled,
  showPreview = true,
}: WhatsAppTemplateSelectorProps) {
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // Group templates by name (different languages)
  const templatesByName = templates.reduce<Record<string, WhatsAppTemplate[]>>((acc, template) => {
    if (!acc[template.name]) {
      acc[template.name] = []
    }
    acc[template.name].push(template)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      <Select
        value={selectedTemplateId}
        onValueChange={(value) => {
          const template = templates.find((t) => t.id === value) || null
          onSelect(template)
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner un template">
            {selectedTemplate && (
              <div className="flex items-center gap-2">
                <span>{selectedTemplate.name}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedTemplate.language}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {templates.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun template disponible
            </div>
          ) : (
            templates
              .filter((t) => t.status === "APPROVED")
              .map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <span>{template.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {template.language}
                    </Badge>
                    <CategoryBadge category={template.category} />
                  </div>
                </SelectItem>
              ))
          )}
        </SelectContent>
      </Select>

      {showPreview && selectedTemplate && (
        <WhatsAppTemplatePreview template={selectedTemplate} />
      )}
    </div>
  )
}

// Language selector for templates with multiple languages
interface WhatsAppLanguageSelectorProps {
  templateName: string
  templates: WhatsAppTemplate[]
  selectedLanguage?: string
  onSelect: (language: string) => void
  disabled?: boolean
}

export function WhatsAppLanguageSelector({
  templateName,
  templates,
  selectedLanguage,
  onSelect,
  disabled,
}: WhatsAppLanguageSelectorProps) {
  const languageTemplates = templates.filter((t) => t.name === templateName && t.status === "APPROVED")
  const languages = languageTemplates.map((t) => t.language)

  if (languages.length <= 1) {
    return null
  }

  return (
    <Select
      value={selectedLanguage}
      onValueChange={onSelect}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Sélectionner une langue" />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {lang}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
