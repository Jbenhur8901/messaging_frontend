"use client"

import { useMemo } from "react"
import type { Conversation } from "@/types/conversations"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
    <div className="flex h-full flex-col">
      {/* Search & Filters */}
      <div className="space-y-4 p-4">
        <div className="flex items-end justify-between gap-3">
          <div><h1 className="text-lg font-semibold tracking-tight">Conversations</h1><p className="mt-0.5 text-xs text-muted-foreground">{filteredConversations.length} discussion{filteredConversations.length !== 1 ? "s" : ""}</p></div>
          <span className="text-[11px] text-muted-foreground">Actualisation auto</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou numéro"
            className="h-10 rounded-lg bg-muted/40 pl-10 text-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className={`min-h-8 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors ${
                conversationStatus === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border/60" />

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <ListSkeleton />
        ) : filteredConversations.length === 0 ? (
          <EmptyList hasFilter={!!debouncedSearch || conversationStatus !== "all"} />
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                className={cn(
                  "flex min-h-[72px] w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                  selectedConversationId === conversation.id
                    ? "bg-primary/[0.08]"
                    : "hover:bg-muted/35"
                )}
                onClick={() => onSelect(conversation.id)}
              >
                <div className="relative">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                      {conversation.contactName
                        ? getInitials(conversation)
                        : <Phone className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                      {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "truncate text-sm",
                      conversation.unreadCount > 0 ? "font-semibold" : "font-medium"
                    )}>
                      {getDisplayName(conversation)}
                    </span>
                    <span className={cn("shrink-0 whitespace-nowrap text-[10px]", conversation.unreadCount > 0 ? "text-primary" : "text-muted-foreground")}>
                      {conversation.lastActivityAt && formatRelativeTime(conversation.lastActivityAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {formatPhoneNumber(conversation.phoneNumber)}
                    </span>
                    <span className="text-[10px] capitalize text-muted-foreground/70">{conversation.status === "open" ? "ouverte" : conversation.status === "closed" ? "fermée" : "archivée"}</span>
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
