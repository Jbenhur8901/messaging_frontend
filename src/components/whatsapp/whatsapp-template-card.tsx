"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TemplateStatusBadge, CategoryBadge } from "./whatsapp-status-badge"
import type { WhatsAppTemplate, WhatsAppTemplateComponent } from "@/types"
import { Image, Video, FileText } from "lucide-react"

interface WhatsAppTemplateCardProps {
  template: WhatsAppTemplate
  onClick?: () => void
  selected?: boolean
  actions?: React.ReactNode
}

export function WhatsAppTemplateCard({ template, onClick, selected, actions }: WhatsAppTemplateCardProps) {
  const headerComponent = template.components.find((c) => c.type === "HEADER")
  const bodyComponent = template.components.find((c) => c.type === "BODY")
  const footerComponent = template.components.find((c) => c.type === "FOOTER")
  const buttonsComponent = template.components.find((c) => c.type === "BUTTONS")

  const mediaFormatIcon = headerComponent?.format && headerComponent.format !== "TEXT"
    ? { IMAGE: Image, VIDEO: Video, DOCUMENT: FileText }[headerComponent.format] || null
    : null

  return (
    <Card
      className={`transition-colors ${
        selected ? "ring-2 ring-primary" : "hover:bg-muted/30"
      } ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header row: name + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{template.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-muted-foreground">{template.language}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground capitalize">{template.category.toLowerCase()}</span>
            </div>
          </div>
          <TemplateStatusBadge status={template.status} />
        </div>

        {/* Media indicator */}
        {mediaFormatIcon && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {(() => { const Icon = mediaFormatIcon; return <Icon className="h-3.5 w-3.5" /> })()}
            <span>{headerComponent!.format}</span>
          </div>
        )}

        {/* Header text */}
        {headerComponent?.text && (
          <p className="text-sm font-medium">
            <HighlightedText text={headerComponent.text} />
          </p>
        )}

        {/* Body */}
        {bodyComponent?.text && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            <HighlightedText text={bodyComponent.text} />
          </p>
        )}

        {/* Footer */}
        {footerComponent?.text && (
          <p className="text-xs text-muted-foreground/70">{footerComponent.text}</p>
        )}

        {/* Buttons */}
        {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {buttonsComponent.buttons.map((button, index) => (
              <span
                key={index}
                className="text-xs text-primary/80 border border-border/40 rounded px-2 py-0.5"
              >
                {button.text}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div
            className="flex items-center justify-end gap-2 pt-2 border-t border-border/30"
            onClick={(event) => event.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\{\{\d+\}\})/g)
  return (
    <>
      {parts.map((part, index) => {
        if (/^\{\{\d+\}\}$/.test(part)) {
          return (
            <span
              key={index}
              className="bg-primary/10 text-primary px-0.5 rounded text-xs font-medium"
            >
              {part}
            </span>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

// Compact preview version for selectors
interface WhatsAppTemplatePreviewProps {
  template: WhatsAppTemplate
}

export function WhatsAppTemplatePreview({ template }: WhatsAppTemplatePreviewProps) {
  const headerComponent = template.components.find((c) => c.type === "HEADER")
  const bodyComponent = template.components.find((c) => c.type === "BODY")
  const footerComponent = template.components.find((c) => c.type === "FOOTER")
  const buttonsComponent = template.components.find((c) => c.type === "BUTTONS")
  const headerMediaUrl = headerComponent?.example?.header_handle?.[0]
  const headerFilename = headerComponent?.example?.filename

  return (
    <div className="rounded-md border border-border/30 p-3 text-sm space-y-2">
      {headerComponent && (
        <div className="text-sm font-medium space-y-2">
          {headerComponent.format && headerComponent.format !== "TEXT" ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {headerComponent.format === "IMAGE" && <Image className="h-3.5 w-3.5" />}
                {headerComponent.format === "VIDEO" && <Video className="h-3.5 w-3.5" />}
                {headerComponent.format === "DOCUMENT" && <FileText className="h-3.5 w-3.5" />}
                <span>{headerComponent.format}</span>
              </div>
              {headerComponent.format === "IMAGE" && headerMediaUrl && (
                <img
                  src={headerMediaUrl}
                  alt="Header media"
                  className="w-full rounded-md object-contain max-h-40"
                />
              )}
              {headerComponent.format === "VIDEO" && headerMediaUrl && (
                <video
                  src={headerMediaUrl}
                  className="w-full rounded-md max-h-40"
                  controls
                />
              )}
              {headerComponent.format === "DOCUMENT" && (
                <p className="text-xs text-muted-foreground">
                  {headerFilename || "Document"}
                </p>
              )}
            </>
          ) : (
            <span>{headerComponent.text}</span>
          )}
        </div>
      )}
      {bodyComponent?.text && (
        <p className="text-muted-foreground line-clamp-3">{bodyComponent.text}</p>
      )}
      {footerComponent?.text && (
        <p className="text-xs text-muted-foreground/70">{footerComponent.text}</p>
      )}
      {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-border/30">
          {buttonsComponent.buttons.map((button, index) => (
            <span
              key={index}
              className="text-xs text-primary/80 border border-border/40 rounded px-2 py-0.5"
            >
              {button.text}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 pt-1.5 border-t border-border/30 text-xs text-muted-foreground">
        <span>{template.language}</span>
        <span className="text-muted-foreground/40">·</span>
        <TemplateStatusBadge status={template.status} />
      </div>
    </div>
  )
}
