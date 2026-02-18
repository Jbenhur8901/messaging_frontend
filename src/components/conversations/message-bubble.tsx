"use client"

import type { WhatsAppConversationMessage } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Check, CheckCheck, Clock, AlertCircle, FileText, Music, MapPin } from "lucide-react"
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

function MessageContent({ message }: { message: WhatsAppConversationMessage }) {
  switch (message.type) {
    case "text":
      return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

    case "template":
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {message.template_name}
          </span>
          {message.template_language && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {message.template_language}
            </Badge>
          )}
        </div>
      )

    case "image":
      return (
        <div className="space-y-1">
          {message.media_url && (
            <img
              src={message.media_url}
              alt={message.caption || "Image"}
              className="max-w-[240px] rounded-md"
            />
          )}
          {message.caption && (
            <p className="text-sm whitespace-pre-wrap">{message.caption}</p>
          )}
        </div>
      )

    case "document":
      return (
        <a
          href={message.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{message.filename || "Document"}</span>
        </a>
      )

    case "audio":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Music className="h-4 w-4 shrink-0" />
          <span>Message audio</span>
        </div>
      )

    case "location":
      return (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            {message.location_name && <div className="font-medium">{message.location_name}</div>}
            {message.location_address && (
              <div className="text-muted-foreground text-xs">{message.location_address}</div>
            )}
          </div>
        </div>
      )

    default:
      return (
        <p className="text-sm text-muted-foreground italic">
          {message.content || `Message ${message.type}`}
        </p>
      )
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound"

  const tooltipLines: string[] = []
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
                isOutbound
                  ? "rounded-br-sm bg-primary/10 border-primary/20"
                  : "rounded-bl-sm bg-muted border-border"
              )}
            >
              <MessageContent message={message} />

              <div className={cn(
                "flex items-center gap-1.5 mt-1",
                isOutbound ? "justify-end" : "justify-start"
              )}>
                <span className="text-[11px] text-muted-foreground">
                  {formatTime(message.created_at)}
                </span>
                {isOutbound && <StatusIcon status={message.status} />}
              </div>

              {message.status === "failed" && message.error_message && (
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
