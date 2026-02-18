"use client"

import { useEffect, useRef } from "react"
import type { WhatsAppConversationMessage } from "@/types"
import type { Conversation } from "@/types/conversations"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageBubble } from "./message-bubble"
import { MessageComposer } from "./message-composer"
import { ArrowLeft, Phone, MessageSquare, Archive, XCircle, RotateCcw, CheckCheck } from "lucide-react"
import { formatPhoneNumber } from "@/lib/utils"

interface ConversationThreadProps {
  messages: WhatsAppConversationMessage[]
  conversation: Conversation | null
  isLoading: boolean
  isSending: boolean
  onBack?: () => void
  onSendText: (text: string) => Promise<void>
  onSendMedia: (payload: {
    media_type: "image" | "video" | "audio" | "document"
    media_id?: string
    caption?: string
    filename?: string
  }) => Promise<void>
  onClose?: () => void
  onArchive?: () => void
  onReopen?: () => void
  onMarkRead?: () => void
}

function getInitials(conversation: Conversation | null): string {
  if (!conversation?.contactName) return "?"
  const parts = conversation.contactName.split(" ")
  const first = parts[0]?.[0] || ""
  const last = parts[1]?.[0] || ""
  return (first + last).toUpperCase() || "?"
}

function getContactName(conversation: Conversation | null): string {
  if (conversation?.contactName) return conversation.contactName
  if (conversation?.phoneNumber) return formatPhoneNumber(conversation.phoneNumber)
  return ""
}

function formatDateSeparator(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (msgDate.getTime() === today.getTime()) return "Aujourd'hui"
  if (msgDate.getTime() === yesterday.getTime()) return "Hier"
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

function getMessageTimestamp(msg: WhatsAppConversationMessage): string {
  return msg.created_at || msg.timestamp || msg.received_at || msg.meta_timestamp || ""
}

function groupMessagesByDate(messages: WhatsAppConversationMessage[]): Map<string, WhatsAppConversationMessage[]> {
  // Sort chronologically first (oldest → newest)
  const sorted = [...messages].sort((a, b) => {
    const tsA = getMessageTimestamp(a)
    const tsB = getMessageTimestamp(b)
    return new Date(tsA || 0).getTime() - new Date(tsB || 0).getTime()
  })
  const groups = new Map<string, WhatsAppConversationMessage[]>()
  for (const msg of sorted) {
    const ts = getMessageTimestamp(msg)
    const dateKey = ts ? new Date(ts).toLocaleDateString("fr-FR") : "—"
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(msg)
  }
  return groups
}

function ConversationStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    closed: "bg-muted text-muted-foreground",
    archived: "bg-muted/60 text-muted-foreground/70",
  }
  const labels: Record<string, string> = {
    open: "Ouverte",
    closed: "Fermée",
    archived: "Archivée",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {labels[status] || status}
    </span>
  )
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
          <Skeleton className={`h-14 rounded-xl ${i % 3 === 0 ? "w-[60%]" : "w-[45%]"}`} />
        </div>
      ))}
    </div>
  )
}

function EmptyThread() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="rounded-full bg-muted/60 p-4 mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-[15px] font-medium mb-1">Sélectionnez une conversation</h3>
      <p className="text-[13px] text-muted-foreground max-w-xs">
        Choisissez une conversation dans la liste pour afficher les messages
      </p>
    </div>
  )
}

export function ConversationThread({
  messages,
  conversation,
  isLoading,
  isSending,
  onBack,
  onSendText,
  onSendMedia,
  onClose,
  onArchive,
  onReopen,
  onMarkRead,
}: ConversationThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (!conversation) {
    return <EmptyThread />
  }

  const dateGroups = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3 shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-medium">
            {conversation.contactName ? getInitials(conversation) : <Phone className="h-3.5 w-3.5" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[13px] truncate">
            {getContactName(conversation)}
          </div>
          {conversation.contactName && (
            <div className="text-[11px] text-muted-foreground truncate">
              {formatPhoneNumber(conversation.phoneNumber)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ConversationStatusBadge status={conversation.status} />
          {conversation.unreadCount > 0 && onMarkRead && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMarkRead} title="Marquer lu">
              <CheckCheck className="h-3.5 w-3.5" />
            </Button>
          )}
          {conversation.status === "open" && onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fermer">
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {conversation.status === "open" && onArchive && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onArchive} title="Archiver">
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
          {(conversation.status === "closed" || conversation.status === "archived") && onReopen && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReopen} title="Rouvrir">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth" ref={scrollRef}>
        {isLoading ? (
          <ThreadSkeleton />
        ) : (
          <div className="p-4 space-y-4">
            {Array.from(dateGroups.entries()).map(([dateKey, dayMessages]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider">
                    {formatDateSeparator(getMessageTimestamp(dayMessages[0]))}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
                <div className="space-y-2">
                  {dayMessages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <MessageComposer
        onSendText={onSendText}
        onSendMedia={onSendMedia}
        isSending={isSending}
        conversationClosed={conversation.status !== "open"}
      />
    </div>
  )
}
