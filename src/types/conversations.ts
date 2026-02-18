import type { WhatsAppInboxConversation } from "@/types"

export interface ConversationContact {
  id: string
  firstName: string | null
  lastName: string | null
  phoneNumber: string
}

export interface Conversation {
  id: string
  phoneNumber: string
  contactName: string | null
  contact: ConversationContact | null
  status: "open" | "closed" | "archived"
  assignedTo?: string | null
  unreadCount: number
  lastMessageAt: string | null
  lastActivityAt: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface ConversationFilters {
  search: string
  conversationStatus: "open" | "closed" | "archived" | "all"
}

export function mapInboxToConversation(inbox: WhatsAppInboxConversation): Conversation {
  return {
    id: inbox.id,
    phoneNumber: inbox.contact_phone || inbox.phone_number || "",
    contactName: inbox.contact_name,
    contact: null,
    status: inbox.status,
    assignedTo: inbox.assigned_to,
    unreadCount: inbox.unread_count ?? 0,
    lastMessageAt: inbox.last_message_at,
    lastActivityAt: inbox.last_message_at || inbox.updated_at,
    messageCount: 0,
    createdAt: inbox.created_at,
    updatedAt: inbox.updated_at,
  }
}
