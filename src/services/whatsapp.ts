import { api, apiJson } from "./api"
import type {
  WhatsAppConfig,
  WhatsAppTemplate,
  WhatsAppMessage,
  WhatsAppMessageEvent,
  WhatsAppBroadcast,
  WhatsAppBroadcastMessage,
  WhatsAppStats,
  WhatsAppBroadcastResult,
  WhatsAppMessageResult,
  Pagination,
} from "@/types"

export const whatsappService = {
  // ============ Configuration ============

  async getConfig(
    organizationId: string
  ): Promise<{ config: WhatsAppConfig | null; is_configured: boolean }> {
    const { data } = await api.get<{ config: WhatsAppConfig | null; is_configured: boolean }>(
      `/v1/organizations/${organizationId}/whatsapp`
    )
    return data
  },

  async setConfig(
    organizationId: string,
    config: {
      access_token: string
      phone_number_id: string
      business_account_id: string
      enabled: boolean
    }
  ): Promise<{ success: boolean; message: string }> {
    const formData = new URLSearchParams()
    formData.append("access_token", config.access_token)
    formData.append("phone_number_id", config.phone_number_id)
    formData.append("business_account_id", config.business_account_id)
    formData.append("enabled", String(config.enabled))

    const { data } = await api.put<{ success: boolean; message: string }>(
      `/v1/organizations/${organizationId}/whatsapp`,
      formData
    )
    return data
  },

  async testConfig(
    organizationId: string
  ): Promise<{ success: boolean; message: string; phone_number?: string }> {
    const { data } = await api.post<{ success: boolean; message: string; phone_number?: string }>(
      `/v1/organizations/${organizationId}/whatsapp/test`
    )
    return data
  },

  // ============ Templates ============

  async syncTemplates(): Promise<{ success: boolean; synced: number; message: string }> {
    const { data } = await api.post<{ success: boolean; synced: number; message: string }>(
      "/v1/whatsapp/templates/sync"
    )
    return data
  },

  async getTemplates(
    status?: string,
    category?: string,
    limit = 50,
    offset = 0
  ): Promise<{ templates: WhatsAppTemplate[]; pagination: Pagination }> {
    const { data } = await api.get<{ templates: WhatsAppTemplate[]; pagination: Pagination }>(
      "/v1/whatsapp/templates",
      {
        params: { status, category, limit, offset },
      }
    )
    return data
  },

  async getTemplate(templateId: string): Promise<WhatsAppTemplate> {
    const { data } = await api.get<WhatsAppTemplate>(`/v1/whatsapp/templates/${templateId}`)
    return data
  },

  async createTemplate(template: {
    name: string
    language: string
    category: string
    components: unknown[]
  }): Promise<{ success: boolean; template: WhatsAppTemplate }> {
    const formData = new URLSearchParams()
    formData.append("name", template.name)
    formData.append("language", template.language)
    formData.append("category", template.category)
    formData.append("components", JSON.stringify(template.components))

    const { data } = await api.post<{ success: boolean; template: WhatsAppTemplate }>(
      "/v1/whatsapp/templates",
      formData
    )
    return data
  },

  async deleteTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete<{ success: boolean; message: string }>(
      `/v1/whatsapp/templates/${templateId}`
    )
    return data
  },

  // ============ Messages ============

  async sendTemplateMessage(
    to: string,
    templateName: string,
    language: string,
    parameters?: Record<string, unknown[]>
  ): Promise<WhatsAppMessageResult> {
    const { data } = await apiJson.post<WhatsAppMessageResult>("/v1/whatsapp/messages", {
      to,
      template_name: templateName,
      language,
      parameters,
    })
    return data
  },

  async getMessage(messageId: string): Promise<WhatsAppMessage> {
    const { data } = await api.get<WhatsAppMessage>(`/v1/whatsapp/messages/${messageId}`)
    return data
  },

  async getMessageEvents(messageId: string): Promise<{ events: WhatsAppMessageEvent[] }> {
    const { data } = await api.get<{ events: WhatsAppMessageEvent[] }>(
      `/v1/whatsapp/messages/${messageId}/events`
    )
    return data
  },

  async getMessages(
    limit = 50,
    offset = 0,
    status?: string
  ): Promise<{ messages: WhatsAppMessage[]; pagination: Pagination }> {
    const { data } = await api.get<{ messages: WhatsAppMessage[]; pagination: Pagination }>(
      "/v1/whatsapp/messages",
      {
        params: { limit, offset, status },
      }
    )
    return data
  },

  // ============ Broadcasts ============

  async createBroadcast(
    recipients: string[],
    templateName: string,
    language: string,
    campaignName?: string,
    parameters?: Record<string, unknown[]>
  ): Promise<WhatsAppBroadcastResult> {
    const formData = new URLSearchParams()
    formData.append("recipients", recipients.join(","))
    formData.append("template_name", templateName)
    formData.append("language_code", language)
    if (campaignName) {
      formData.append("campaign_name", campaignName)
    }
    if (parameters) {
      formData.append("components", JSON.stringify(parameters))
    }
    const { data } = await api.post<WhatsAppBroadcastResult>(
      "/v1/whatsapp/broadcasts",
      formData
    )
    return data
  },

  async createPersonalizedBroadcast(payload: {
    template_name: string
    language_code: string
    campaign_name?: string
    recipients: Array<{
      phone: string
      components: Array<{
        type: "header" | "body" | "button"
        parameters: Array<{
          type: "text" | "image" | "document"
          text?: string
          image?: { link: string }
          document?: { link: string; filename?: string }
        }>
      }>
    }>
  }): Promise<WhatsAppBroadcastResult> {
    const { data } = await apiJson.post<WhatsAppBroadcastResult>(
      "/v1/whatsapp/broadcasts/personalized",
      payload
    )
    return data
  },

  async getBroadcasts(
    limit = 20,
    offset = 0
  ): Promise<{ broadcasts: WhatsAppBroadcast[]; pagination: Pagination }> {
    const { data } = await api.get<{ broadcasts: WhatsAppBroadcast[]; pagination: Pagination }>(
      "/v1/whatsapp/broadcasts",
      {
        params: { limit, offset },
      }
    )
    return data
  },

  async getBroadcast(broadcastId: string): Promise<WhatsAppBroadcast> {
    const { data } = await api.get<WhatsAppBroadcast>(`/v1/whatsapp/broadcasts/${broadcastId}`)
    return data
  },

  async getBroadcastMessages(
    broadcastId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: WhatsAppBroadcastMessage[]; pagination: Pagination }> {
    const { data } = await api.get<{
      messages: WhatsAppBroadcastMessage[]
      pagination: Pagination
    }>(`/v1/whatsapp/broadcasts/${broadcastId}/messages`, {
      params: { limit, offset },
    })
    return data
  },

  // ============ Stats ============

  async getStats(days = 7): Promise<WhatsAppStats> {
    const { data } = await api.get<WhatsAppStats>("/v1/whatsapp/stats", {
      params: { days },
    })
    return data
  },
}
