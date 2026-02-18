import { create } from "zustand"
import type { WhatsAppConversationMessage } from "@/types"
import type { Conversation } from "@/types/conversations"
import { mapInboxToConversation } from "@/types/conversations"
import { conversationsService } from "@/services/conversations"
import { whatsappService } from "@/services/whatsapp"

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
    set({
      selectedConversationId: conversationId,
      isLoadingThread: true,
    })

    try {
      const result = await conversationsService.getConversationMessages(conversationId)
      set({ selectedMessages: result.messages || [], isLoadingThread: false })
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
    get().fetchConversations(status)
  },

  refreshMessages: async () => {
    try {
      const { conversationStatus, selectedConversationId } = get()
      const result = await conversationsService.getConversations(
        conversationStatus === "all" ? undefined : conversationStatus
      )
      const conversations = (result.conversations || []).map(mapInboxToConversation)
      set({ conversations })

      if (selectedConversationId) {
        const msgResult = await conversationsService.getConversationMessages(selectedConversationId)
        set({ selectedMessages: msgResult.messages })
      }
    } catch {
      // Silent fail on poll refresh
    }
  },

  closeConversation: async (id: string) => {
    try {
      await conversationsService.updateConversation(id, { status: "closed" })
      get().fetchConversations()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Erreur" })
    }
  },

  archiveConversation: async (id: string) => {
    try {
      await conversationsService.updateConversation(id, { status: "archived" })
      get().fetchConversations()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Erreur" })
    }
  },

  reopenConversation: async (id: string) => {
    try {
      await conversationsService.updateConversation(id, { status: "open" })
      get().fetchConversations()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Erreur" })
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
      await whatsappService.sendTextMessage({ to: conversation.phoneNumber, text })
      // Refresh messages after sending
      const result = await conversationsService.getConversationMessages(selectedConversationId)
      set({ selectedMessages: result.messages || [], isSending: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur d'envoi",
        isSending: false,
      })
    }
  },

  sendMedia: async (payload) => {
    const { selectedConversationId, conversations } = get()
    if (!selectedConversationId) return
    const conversation = conversations.find((c) => c.id === selectedConversationId)
    if (!conversation) return

    set({ isSending: true })
    try {
      await whatsappService.sendMediaMessage({ to: conversation.phoneNumber, ...payload })
      const result = await conversationsService.getConversationMessages(selectedConversationId)
      set({ selectedMessages: result.messages || [], isSending: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur d'envoi",
        isSending: false,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
