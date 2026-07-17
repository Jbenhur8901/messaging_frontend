import { create } from "zustand"
import type { WhatsAppConversationMessage } from "@/types"
import type { Conversation } from "@/types/conversations"
import { mapInboxToConversation } from "@/types/conversations"
import { conversationsService } from "@/services/conversations"
import { whatsappService } from "@/services/whatsapp"

/** Sort messages chronologically (oldest first) */
function sortMessages(msgs: WhatsAppConversationMessage[]): WhatsAppConversationMessage[] {
  return [...msgs].sort((a, b) => {
    const tsA = a.created_at || a.timestamp || a.received_at || a.meta_timestamp || ""
    const tsB = b.created_at || b.timestamp || b.received_at || b.meta_timestamp || ""
    return new Date(tsA).getTime() - new Date(tsB).getTime()
  })
}

interface ConversationsState {
  conversations: Conversation[]
  selectedConversationId: string | null
  selectedMessages: WhatsAppConversationMessage[]
  isLoading: boolean
  isLoadingThread: boolean
  isSending: boolean
  searchQuery: string
  conversationStatus: "open" | "closed" | "archived" | "all"
  error: string | null

  fetchConversations: (status?: string) => Promise<void>
  selectConversation: (conversationId: string) => Promise<void>
  clearSelection: () => void
  setSearchQuery: (query: string) => void
  setConversationStatus: (status: "open" | "closed" | "archived" | "all") => void
  refreshMessages: () => Promise<void>
  closeConversation: (id: string) => Promise<void>
  archiveConversation: (id: string) => Promise<void>
  reopenConversation: (id: string) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  sendMessage: (text: string) => Promise<void>
  sendMedia: (payload: { media_type: "image" | "video" | "audio" | "document"; media_id?: string; media_url?: string; caption?: string; filename?: string }) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  selectedMessages: [],
  isLoading: false,
  isLoadingThread: false,
  isSending: false,
  searchQuery: "",
  conversationStatus: "open",
  error: null,

  fetchConversations: async (status?: string) => {
    set({ isLoading: true, error: null })
    try {
      const filterStatus = status || get().conversationStatus
      const result = await conversationsService.getConversations(
        filterStatus === "all" ? undefined : filterStatus
      )
      const conversations = (result.conversations || []).map(mapInboxToConversation)
      set({ conversations, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur de chargement des conversations",
        isLoading: false,
      })
    }
  },

  selectConversation: async (conversationId: string) => {
    const shouldMarkAsRead = (get().conversations.find((c) => c.id === conversationId)?.unreadCount || 0) > 0

    set((state) => ({
      selectedConversationId: conversationId,
      isLoadingThread: true,
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation
      ),
    }))

    try {
      const messagesPromise = conversationsService.getConversationMessages(conversationId)
      const readPromise = shouldMarkAsRead
        ? conversationsService.markAsRead(conversationId)
        : Promise.resolve({ success: true })
      const [result, readResult] = await Promise.all([messagesPromise, readPromise])

      if (!readResult.success) {
        void get().fetchConversations().catch(() => {})
      }
      set({ selectedMessages: sortMessages(result.messages || []), isLoadingThread: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur de chargement des messages",
        isLoadingThread: false,
      })
    }
  },

  clearSelection: () =>
    set({
      selectedConversationId: null,
      selectedMessages: [],
    }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setConversationStatus: (status: "open" | "closed" | "archived" | "all") => {
    set({ conversationStatus: status })
    void get().fetchConversations(status)
  },

  refreshMessages: async () => {
    try {
      const { conversationStatus, selectedConversationId } = get()
      const result = await conversationsService.getConversations(
        conversationStatus === "all" ? undefined : conversationStatus
      )
      let conversations = (result.conversations || []).map(mapInboxToConversation)

      const selectedHasUnread = selectedConversationId
        ? (conversations.find((conversation) => conversation.id === selectedConversationId)?.unreadCount || 0) > 0
        : false

      if (selectedConversationId && selectedHasUnread) {
        conversations = conversations.map((conversation) =>
          conversation.id === selectedConversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
        void conversationsService.markAsRead(selectedConversationId).catch(() => {})
      }
      set({ conversations })

      if (selectedConversationId) {
        const msgResult = await conversationsService.getConversationMessages(selectedConversationId)
        set({ selectedMessages: sortMessages(msgResult.messages || []) })
      }
    } catch {
      // Silent fail on poll refresh
    }
  },

  closeConversation: async (id: string) => {
    set({ isLoading: true })
    try {
      await conversationsService.updateConversation(id, { status: "closed" })
      get().fetchConversations()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Erreur", isLoading: false })
    }
  },

  archiveConversation: async (id: string) => {
    set({ isLoading: true })
    try {
      await conversationsService.updateConversation(id, { status: "archived" })
      get().fetchConversations()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Erreur", isLoading: false })
    }
  },

  reopenConversation: async (id: string) => {
    set({ isLoading: true })
    try {
      await conversationsService.updateConversation(id, { status: "open" })
      get().fetchConversations()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Erreur", isLoading: false })
    }
  },

  markAsRead: async (id: string) => {
    try {
      await conversationsService.markAsRead(id)
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, unreadCount: 0 } : c
        ),
      }))
    } catch {
      // Silent fail
    }
  },

  sendMessage: async (text: string) => {
    const { selectedConversationId, conversations } = get()
    if (!selectedConversationId) return
    const conversation = conversations.find((c) => c.id === selectedConversationId)
    if (!conversation) return

    set({ isSending: true })
    try {
      const sendResult = await whatsappService.sendTextMessage({ to: conversation.phoneNumber, text })
      if (!sendResult.success) {
        throw new Error(sendResult.error || "Le message n'a pas pu être envoyé")
      }
      // Refresh messages after sending
      const result = await conversationsService.getConversationMessages(selectedConversationId)
      set({ selectedMessages: sortMessages(result.messages || []), isSending: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur d'envoi"
      set({
        error: message,
        isSending: false,
      })
      throw new Error(message)
    }
  },

  sendMedia: async (payload) => {
    const { selectedConversationId, conversations } = get()
    if (!selectedConversationId) return
    const conversation = conversations.find((c) => c.id === selectedConversationId)
    if (!conversation) return

    set({ isSending: true })
    try {
      const sendResult = await whatsappService.sendMediaMessage({ to: conversation.phoneNumber, ...payload })
      if (!sendResult.success) {
        throw new Error(sendResult.error || "Le média n'a pas pu être envoyé")
      }
      const result = await conversationsService.getConversationMessages(selectedConversationId)
      set({ selectedMessages: sortMessages(result.messages || []), isSending: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur d'envoi"
      set({
        error: message,
        isSending: false,
      })
      throw new Error(message)
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    conversations: [],
    selectedConversationId: null,
    selectedMessages: [],
    isLoading: false,
    isLoadingThread: false,
    isSending: false,
    searchQuery: "",
    conversationStatus: "open",
    error: null,
  }),
}))
