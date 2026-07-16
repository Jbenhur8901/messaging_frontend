"use client"

import type { WhatsAppConversationMessage } from "@/types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Check, CheckCheck, Clock, AlertCircle, FileText, Music, MapPin, SmilePlus, MessageCircle, Bot, ExternalLink, PhoneCall } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

interface MessageBubbleProps {
  message: WhatsAppConversationMessage
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
  switch (status) {
    case "queued":
      return <Clock className={cn("h-3.5 w-3.5 text-muted-foreground", className)} />
    case "sent":
      return <Check className={cn("h-3.5 w-3.5 text-muted-foreground", className)} />
    case "delivered":
      return <CheckCheck className={cn("h-3.5 w-3.5 text-muted-foreground", className)} />
    case "read":
      return <CheckCheck className={cn("h-3.5 w-3.5 text-blue-500", className)} />
    case "failed":
      return <AlertCircle className={cn("h-3.5 w-3.5 text-red-500", className)} />
    default:
      return null
  }
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Resolve message type from API fields: message_type (inbound) or content_type (outbound) */
function resolveType(message: WhatsAppConversationMessage): string {
  const type = message.type || message.message_type || message.content_type || "unknown"
  return type === "voice" ? "audio" : type
}

/** Extract text content - API sends text_body */
function getMessageText(message: WhatsAppConversationMessage): string {
  if (message.text_body) return message.text_body
  if (message.content) return message.content
  if (message.body) return message.body
  if (typeof message.text === "string") return message.text
  if (message.text && typeof message.text === "object" && message.text.body) return message.text.body
  if (message.caption) return message.caption
  if (message.media_caption) return message.media_caption
  return ""
}

/** Get best available timestamp - inbound uses received_at/timestamp, outbound uses created_at */
function getTimestamp(message: WhatsAppConversationMessage): string {
  return message.created_at || message.timestamp || message.received_at || message.meta_timestamp || ""
}

function getTemplateDefinition(message: WhatsAppConversationMessage): Array<Record<string, any>> {
  const relation = message.whatsapp_templates
  if (Array.isArray(relation)) return relation[0]?.components || []
  return relation?.components || []
}

function getSentComponent(message: WhatsAppConversationMessage, type: string): Record<string, any> | undefined {
  return (message.template_components || []).find(
    (component) => String(component.type || "").toLowerCase() === type.toLowerCase()
  )
}

function resolveTemplateText(text: string, parameters: Array<Record<string, any>> = []): string {
  return text.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, rawIndex: string) => {
    const parameter = parameters[Number(rawIndex) - 1]
    return parameter?.text || parameter?.payload || `{{${rawIndex}}}`
  })
}

function TemplateMessageContent({ message }: { message: WhatsAppConversationMessage }) {
  const definition = getTemplateDefinition(message)
  const header = definition.find((component) => component.type === "HEADER")
  const body = definition.find((component) => component.type === "BODY")
  const footer = definition.find((component) => component.type === "FOOTER")
  const buttons = definition.find((component) => component.type === "BUTTONS")?.buttons || []
  const sentHeader = getSentComponent(message, "header")
  const sentBody = getSentComponent(message, "body")

  if (!definition.length) {
    return (
      <div className="space-y-1">
        <p className="whitespace-pre-wrap text-sm">{getMessageText(message) || "Message template envoyé"}</p>
        <p className="text-[10px] text-muted-foreground">{message.template_name}</p>
      </div>
    )
  }

  const mediaParameter = sentHeader?.parameters?.[0]
  const imageUrl = mediaParameter?.image?.link
  const videoUrl = mediaParameter?.video?.link

  return (
    <div className="min-w-[220px] max-w-[340px] overflow-hidden">
      {imageUrl && <img src={imageUrl} alt="Image du template" loading="lazy" className="mb-2 max-h-52 w-full rounded-lg object-cover" />}
      {videoUrl && <video src={videoUrl} controls playsInline preload="metadata" className="mb-2 max-h-52 w-full rounded-lg bg-black" aria-label="Vidéo du template" />}
      {header?.format === "DOCUMENT" && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-background/35 p-2.5"><FileText className="h-5 w-5" /><span className="truncate text-xs">{mediaParameter?.document?.filename || "Document"}</span></div>
      )}
      {header?.text && <p className="mb-1 text-sm font-semibold">{resolveTemplateText(header.text, sentHeader?.parameters)}</p>}
      {body?.text && <p className="whitespace-pre-wrap text-sm leading-relaxed">{resolveTemplateText(body.text, sentBody?.parameters)}</p>}
      {footer?.text && <p className="mt-1.5 text-[11px] text-muted-foreground">{footer.text}</p>}
      {buttons.length > 0 && (
        <div className="mt-2 divide-y divide-border/40 border-t border-border/40">
          {buttons.map((button: Record<string, any>, index: number) => (
            <div key={`${button.type}-${index}`} className="flex min-h-8 items-center justify-center gap-1.5 px-2 text-xs font-medium text-primary">
              {button.type === "URL" && <ExternalLink className="h-3.5 w-3.5" />}
              {button.type === "PHONE_NUMBER" && <PhoneCall className="h-3.5 w-3.5" />}
              <span>{button.text || "Action"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageContent({ message }: { message: WhatsAppConversationMessage }) {
  const msgType = resolveType(message)
  const text = getMessageText(message)

  switch (msgType) {
    case "text":
      return <p className="text-sm whitespace-pre-wrap break-words">{text || "(vide)"}</p>

    case "template":
      return <TemplateMessageContent message={message} />

    case "image": {
      const imgUrl = message.media_url
      const imgCaption = message.caption || message.media_caption || text
      return (
        <div className="space-y-2">
          {imgUrl && (
            <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg bg-black/20">
              <img src={imgUrl} alt={imgCaption || "Image reçue"} loading="lazy" className="max-h-[360px] w-full min-w-[220px] object-contain" />
            </a>
          )}
          {imgCaption && <p className="text-sm whitespace-pre-wrap">{imgCaption}</p>}
          {!imgUrl && !imgCaption && <p className="text-sm text-muted-foreground italic">Image</p>}
        </div>
      )
    }

    case "video": {
      const videoUrl = message.media_url
      const vidCaption = message.caption || message.media_caption || text
      return (
        <div className="space-y-2">
          {videoUrl ? (
            <video src={videoUrl} controls playsInline preload="metadata" className="max-h-[360px] w-full min-w-[240px] rounded-lg bg-black" aria-label={vidCaption || "Vidéo reçue"} />
          ) : <p className="text-sm italic text-muted-foreground">Vidéo indisponible</p>}
          {vidCaption && <p className="text-sm whitespace-pre-wrap">{vidCaption}</p>}
        </div>
      )
    }

    case "document": {
      const docUrl = message.media_url
      const docName = message.filename || message.media_filename || "Document"
      return (
        <a
          href={docUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("flex items-center gap-2 text-sm", docUrl ? "text-primary hover:underline" : "text-muted-foreground")}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{docName}</span>
        </a>
      )
    }

    case "audio": {
      const audioUrl = message.media_url
      return audioUrl ? (
        <div className="flex min-w-[260px] items-center gap-2 py-1">
          <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
          <audio src={audioUrl} controls preload="metadata" className="h-9 w-full min-w-0" aria-label="Message audio" />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Music className="h-4 w-4" /><span>Audio indisponible</span></div>
      )
    }

    case "sticker":
      return message.media_url
        ? <img src={message.media_url} alt="Sticker" loading="lazy" className="h-36 w-36 object-contain" />
        : <div className="text-sm italic text-muted-foreground">Sticker indisponible</div>

    case "reaction": {
      const emoji = message.reaction_emoji || text
      return (
        <div className="flex items-center gap-1.5 text-sm">
          <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{emoji || "Reaction"}</span>
        </div>
      )
    }

    case "interactive": {
      const interactiveText =
        message.interactive_reply_title ||
        text
      return (
        <div className="flex items-center gap-1.5 text-sm">
          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="whitespace-pre-wrap break-words">{interactiveText || "Message interactif"}</span>
        </div>
      )
    }

    case "location": {
      const lat = message.location_latitude ?? message.latitude
      const lng = message.location_longitude ?? message.longitude
      const locName = message.location_name
      const locAddr = message.location_address
      return (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            {locName && <div className="font-medium">{locName}</div>}
            {locAddr && <div className="text-muted-foreground text-xs">{locAddr}</div>}
            {!locName && !locAddr && lat != null && <div className="text-xs text-muted-foreground">{lat}, {lng}</div>}
          </div>
        </div>
      )
    }

    case "contacts":
      return (
        <p className="text-sm text-muted-foreground italic">
          {text || "Contact partagé"}
        </p>
      )

    default:
      // Show text content if any, otherwise show type name
      if (text) {
        return <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
      }
      return (
        <p className="text-sm text-muted-foreground italic">
          {msgType !== "unknown" ? `Message ${msgType}` : "Message"}
        </p>
      )
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound"
  const isAiReply = isOutbound && message.is_ai_reply === true
  const status = message.status || "sent"

  const ts = getTimestamp(message)

  const tooltipLines: string[] = []
  if (isAiReply) tooltipLines.push("Réponse générée par l'IA")
  if (message.sent_at) tooltipLines.push(`Envoy\u00e9 : ${formatDate(message.sent_at)}`)
  if (message.delivered_at) tooltipLines.push(`Livr\u00e9 : ${formatDate(message.delivered_at)}`)
  if (message.read_at) tooltipLines.push(`Lu : ${formatDate(message.read_at)}`)
  if (message.error_message) tooltipLines.push(`Erreur : ${message.error_message}`)

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "max-w-[82%] rounded-xl px-3 py-2 shadow-sm sm:max-w-[68%]",
                isAiReply
                  ? "rounded-br-sm bg-violet-500/10 ring-1 ring-inset ring-violet-500/20"
                  : isOutbound
                    ? "rounded-br-sm bg-primary/[0.11] ring-1 ring-inset ring-primary/15"
                    : "rounded-bl-sm bg-[#1a1a1a]"
              )}
            >
              {isAiReply && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Bot className="h-3 w-3 text-violet-500" />
                  <span className="text-[10px] font-medium text-violet-500">IA</span>
                </div>
              )}

              <MessageContent message={message} />

              <div className={cn(
                "flex items-center gap-1.5 mt-1",
                isOutbound ? "justify-end" : "justify-start"
              )}>
                <span className="text-[10px] text-muted-foreground/80">
                  {ts ? formatTime(ts) : ""}
                </span>
                {isOutbound && <StatusIcon status={status} />}
              </div>

              {status === "failed" && message.error_message && (
                <div className="flex items-center gap-1 mt-1.5 text-[11px] text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  <span className="truncate">{message.error_message}</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          {tooltipLines.length > 0 && (
            <TooltipContent side={isOutbound ? "left" : "right"} className="text-xs">
              {tooltipLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
