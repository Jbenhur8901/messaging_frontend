"use client"

import type { WhatsAppConversationMessage } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Check, CheckCheck, Clock, AlertCircle, FileText, Music, MapPin, SmilePlus, MessageCircle, Bot } from "lucide-react"
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
  return message.type || message.message_type || message.content_type || "unknown"
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

function MessageContent({ message }: { message: WhatsAppConversationMessage }) {
  const msgType = resolveType(message)
  const text = getMessageText(message)

  switch (msgType) {
    case "text":
      return <p className="text-sm whitespace-pre-wrap break-words">{text || "(vide)"}</p>

    case "template":
      return (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {message.template_name || "Template"}
            </span>
            {message.template_language && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {message.template_language}
              </Badge>
            )}
          </div>
          {text && <p className="text-sm whitespace-pre-wrap mt-1">{text}</p>}
        </div>
      )

    case "image": {
      const imgUrl = message.media_url
      const imgCaption = message.caption || message.media_caption || text
      return (
        <div className="space-y-1">
          {imgUrl && (
            <img
              src={imgUrl}
              alt={imgCaption || "Image"}
              className="max-w-[240px] rounded-md"
            />
          )}
          {imgCaption && <p className="text-sm whitespace-pre-wrap">{imgCaption}</p>}
          {!imgUrl && !imgCaption && <p className="text-sm text-muted-foreground italic">Image</p>}
        </div>
      )
    }

    case "video": {
      const vidCaption = message.caption || message.media_caption || text
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Video</span>
          </div>
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

    case "audio":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Music className="h-4 w-4 shrink-0" />
          <span>Message audio</span>
        </div>
      )

    case "sticker":
      return (
        <div className="text-sm text-muted-foreground italic">
          Sticker
        </div>
      )

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
                "max-w-[75%] rounded-lg px-3 py-2 border",
                isAiReply
                  ? "rounded-br-sm bg-violet-500/10 border-violet-500/20"
                  : isOutbound
                    ? "rounded-br-sm bg-primary/10 border-primary/20"
                    : "rounded-bl-sm bg-muted border-border"
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
                <span className="text-[11px] text-muted-foreground">
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
