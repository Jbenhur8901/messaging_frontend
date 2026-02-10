"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TemplateStatusBadge, CategoryBadge } from "./whatsapp-status-badge"
import type { WhatsAppTemplate, WhatsAppTemplateComponent } from "@/types"

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

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        selected ? "ring-2 ring-primary" : "hover:bg-muted/60"
      } ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{template.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {template.language}
              </Badge>
              <TemplateStatusBadge status={template.status} />
              <CategoryBadge category={template.category} />
            </div>
          </div>
          {actions && (
            <div
              className="flex items-center gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border/60 bg-muted/60 p-3 space-y-2">
          {/* Header */}
          {headerComponent && (
            <TemplateComponentPreview component={headerComponent} type="header" />
          )}

          {/* Body */}
          {bodyComponent && (
            <TemplateComponentPreview component={bodyComponent} type="body" />
          )}

          {/* Footer */}
          {footerComponent && (
            <TemplateComponentPreview component={footerComponent} type="footer" />
          )}

          {/* Buttons */}
          {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {buttonsComponent.buttons.map((button, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {button.text}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface TemplateComponentPreviewProps {
  component: WhatsAppTemplateComponent
  type: "header" | "body" | "footer"
}

function TemplateComponentPreview({ component, type }: TemplateComponentPreviewProps) {
  const text = component.text || ""

  const renderHighlightedText = () => {
    if (!text) return null
    const parts = text.split(/(\{\{\d+\}\})/g)
    return parts.map((part, index) => {
      if (/^\{\{\d+\}\}$/.test(part)) {
        return (
          <span
            key={`ph-${index}`}
            className="bg-primary/15 text-primary px-1 rounded font-medium"
          >
            {part}
          </span>
        )
      }
      return <span key={`txt-${index}`}>{part}</span>
    })
  }

  const baseStyles = {
    header: "font-medium text-sm",
    body: "text-sm",
    footer: "text-xs text-muted-foreground",
  }

  if (type === "header" && component.format && component.format !== "TEXT") {
    return (
      <div className={`${baseStyles[type]} flex items-center gap-2`}>
        <Badge variant="outline" className="text-xs">
          {component.format}
        </Badge>
        <span>{renderHighlightedText()}</span>
      </div>
    )
  }

  return (
    <p className={baseStyles[type]}>{renderHighlightedText()}</p>
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
    <div className="rounded-lg border border-border/60 bg-muted/60 p-3 text-sm space-y-2">
      {headerComponent && (
        <div className="text-sm font-medium space-y-2">
          {headerComponent.format && headerComponent.format !== "TEXT" ? (
            <>
              <Badge variant="outline" className="text-xs">
                {headerComponent.format}
              </Badge>
              {headerComponent.format === "IMAGE" && headerMediaUrl && (
                <img
                  src={headerMediaUrl}
                  alt="Header media"
                  className="w-full rounded-md border object-contain max-h-48"
                />
              )}
              {headerComponent.format === "VIDEO" && headerMediaUrl && (
                <video
                  src={headerMediaUrl}
                  className="w-full rounded-md border max-h-48"
                  controls
                />
              )}
              {headerComponent.format === "DOCUMENT" && (
                <div className="rounded-md border border-border/60 bg-background/70 p-2 text-xs text-muted-foreground">
                  {headerFilename || "Document"}
                </div>
              )}
            </>
          ) : (
            <span>{headerComponent.text}</span>
          )}
        </div>
      )}
      {bodyComponent?.text && (
        <p className="line-clamp-3">{bodyComponent.text}</p>
      )}
      {footerComponent?.text && (
        <p className="text-xs text-muted-foreground">{footerComponent.text}</p>
      )}
      {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {buttonsComponent.buttons.map((button, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {button.text}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Badge variant="outline" className="text-xs">
          {template.language}
        </Badge>
        <TemplateStatusBadge status={template.status} />
      </div>
    </div>
  )
}
