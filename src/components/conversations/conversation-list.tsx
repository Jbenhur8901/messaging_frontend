"use client"

import { useMemo } from "react"
import type { Conversation } from "@/types/conversations"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks"
import {
  Search,
  Phone,
  MessageSquare,
} from "lucide-react"
import { cn, formatPhoneNumber, formatRelativeTime } from "@/lib/utils"

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversationId: string | null
  searchQuery: string
  isLoading: boolean
  conversationStatus: string
  onSelect: (conversationId: string) => void
  onSearchChange: (query: string) => void
  onStatusChange: (status: "open" | "closed" | "archived" | "all") => void
}

const STATUS_TABS = [
  { value: "all", label: "Toutes" },
  { value: "open", label: "Ouvertes" },
  { value: "closed", label: "Fermées" },
  { value: "archived", label: "Archivées" },
] as const

function getInitials(conversation: Conversation): string {
  if (!conversation.contactName) return "?"
  const parts = conversation.contactName.split(" ")
  const first = parts[0]?.[0] || ""
  const last = parts[1]?.[0] || ""
  return (first + last).toUpperCase() || "?"
}

function getDisplayName(conversation: Conversation): string {
  if (conversation.contactName) return conversation.contactName
  return formatPhoneNumber(conversation.phoneNumber)
}

function ListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[60%]" />
            <Skeleton className="h-3 w-[80%]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyList({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted/60 p-3.5 mb-3">
        <MessageSquare className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <p className="text-[13px] font-medium mb-1">Aucune conversation</p>
      <p className="text-[11px] text-muted-foreground">
        {hasFilter
          ? "Aucun résultat pour votre recherche"
          : "Les conversations apparaîtront ici après réception de messages"}
      </p>
    </div>
  )
}

export function ConversationList({
  conversations,
  selectedConversationId,
  searchQuery,
  isLoading,
  conversationStatus,
  onSelect,
  onSearchChange,
  onStatusChange,
}: ConversationListProps) {
  const debouncedSearch = useDebounce(searchQuery, 300)

  const filteredConversations = useMemo(() => {
    let filtered = conversations

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      filtered = filtered.filter((c) => {
        const name = getDisplayName(c).toLowerCase()
        const phone = c.phoneNumber.toLowerCase()
        return name.includes(q) || phone.includes(q)
      })
    }

    return filtered
  }, [conversations, debouncedSearch])

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contact..."
            className="pl-9 h-8 text-[13px]"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                conversationStatus === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border/40" />

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <ListSkeleton />
        ) : filteredConversations.length === 0 ? (
          <EmptyList hasFilter={!!debouncedSearch || conversationStatus !== "all"} />
        ) : (
          <div className="p-1.5 space-y-0.5">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                  selectedConversationId === conversation.id
                    ? "bg-primary/5"
                    : "hover:bg-muted/40"
                )}
                onClick={() => onSelect(conversation.id)}
              >
                <div className="relative">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-medium">
                      {conversation.contactName
                        ? getInitials(conversation)
                        : <Phone className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white ring-2 ring-background">
                      {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "text-[13px] truncate",
                      conversation.unreadCount > 0 ? "font-semibold" : "font-medium"
                    )}>
                      {getDisplayName(conversation)}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {conversation.lastActivityAt && formatRelativeTime(conversation.lastActivityAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {formatPhoneNumber(conversation.phoneNumber)}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <Badge className="text-[9px] px-1.5 py-0 h-3.5 bg-blue-500 rounded-full">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
