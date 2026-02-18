import { whatsappService } from "./whatsapp"
import type { WhatsAppInboxConversation, WhatsAppConversationMessage, SendMediaPayload, Pagination } from "@/types"

export const conversationsService = {
  async getConversations(
    status?: string,
    limit = 50,
    offset = 0
  ): Promise<{ conversations: WhatsAppInboxConversation[]; pagination: Pagination }> {
    return whatsappService.getConversations(status, undefined, limit, offset)
  },

  async getConversationMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: WhatsAppConversationMessage[]; pagination: Pagination }> {
    return whatsappService.getConversationMessages(conversationId, limit, offset)
  },

  async updateConversation(
    id: string,
    updates: { status?: string; assigned_to?: string }
  ): Promise<WhatsAppInboxConversation> {
    return whatsappService.updateConversation(id, updates)
  },

  async markAsRead(id: string): Promise<{ success: boolean }> {
    return whatsappService.markConversationRead(id)
  },

  async sendText(conversationId: string, phoneNumber: string, text: string) {
    return whatsappService.sendTextMessage({ to: phoneNumber, text })
  },

  async sendMedia(phoneNumber: string, payload: Omit<SendMediaPayload, "to">) {
    return whatsappService.sendMediaMessage({ to: phoneNumber, ...payload })
  },
}
