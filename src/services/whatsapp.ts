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

  async syncTemplates(force = false): Promise<{ success: boolean; synced: number; message: string }> {
    const formData = force ? new URLSearchParams({ force: "true" }) : undefined
    const { data } = await api.post<{ success: boolean; synced: number; message: string }>(
      "/v1/whatsapp/templates/sync",
      formData
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

  async updateTemplate(
    templateId: string,
    template: {
      name: string
      language: string
      category: string
      components: unknown[]
    }
  ): Promise<{ success: boolean; template: WhatsAppTemplate }> {
    const formData = new URLSearchParams()
    formData.append("name", template.name)
    formData.append("language", template.language)
    formData.append("category", template.category)
    formData.append("components", JSON.stringify(template.components))

    const { data } = await api.put<{ success: boolean; template: WhatsAppTemplate }>(
      `/v1/whatsapp/templates/${templateId}`,
      formData
    )
    return data
  },

  async deleteTemplate(templateName: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete<{ success: boolean; message: string }>(
      `/v1/whatsapp/templates/${encodeURIComponent(templateName)}`
    )
    return data
  },

  // ============ Messages ============

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: Array<{
      type: "header" | "body" | "button"
      sub_type?: string
      index?: string
      parameters: Array<{
        type: "text" | "image" | "video" | "document"
        text?: string
        image?: { link: string }
        video?: { link: string }
        document?: { link: string; filename?: string }
      }>
    }>
  ): Promise<WhatsAppMessageResult> {
    const formData = new URLSearchParams()
    formData.append("to", to)
    formData.append("template_name", templateName)
    formData.append("language_code", languageCode)
    if (components) {
      formData.append("components", JSON.stringify(components))
    }
    const { data } = await api.post<WhatsAppMessageResult>(
      "/v1/whatsapp/messages/template",
      formData
    )
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
    status?: string,
    templateName?: string
  ): Promise<{ messages: WhatsAppMessage[]; pagination: Pagination }> {
    const { data } = await api.get<{ messages: WhatsAppMessage[]; pagination: Pagination }>(
      "/v1/whatsapp/messages",
      {
        params: { limit, offset, status, template_name: templateName },
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
    components?: Array<{
      type: "header" | "body" | "button"
      sub_type?: string
      index?: string
      parameters: Array<{
        type: "text" | "image" | "video" | "document"
        text?: string
        image?: { link: string }
        video?: { link: string }
        document?: { link: string; filename?: string }
      }>
    }>,
    callbackUrl?: string
  ): Promise<WhatsAppBroadcastResult> {
    const formData = new URLSearchParams()
    formData.append("recipients", recipients.join(","))
    formData.append("template_name", templateName)
    formData.append("language_code", language)
    if (campaignName) {
      formData.append("campaign_name", campaignName)
    }
    if (components) {
      formData.append("components", JSON.stringify(components))
    }
    if (callbackUrl) {
      formData.append("callback_url", callbackUrl)
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
    callback_url?: string
    recipients: Array<{
      phone: string
      components: Array<{
        type: "header" | "body" | "button"
        sub_type?: string
        index?: string
        parameters: Array<{
          type: "text" | "image" | "video" | "document"
          text?: string
          image?: { link: string }
          video?: { link: string }
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

  async createBroadcastJson(payload: {
    recipients: string[]
    template_name: string
    language_code: string
    campaign_name?: string
    callback_url?: string
  }): Promise<WhatsAppBroadcastResult> {
    const { data } = await apiJson.post<WhatsAppBroadcastResult>(
      "/v1/whatsapp/broadcasts/json",
      payload
    )
    return data
  },

  async getBroadcasts(
    limit = 20,
    offset = 0,
    status?: string
  ): Promise<{ broadcasts: WhatsAppBroadcast[]; pagination: Pagination }> {
    const { data } = await api.get<{ broadcasts: WhatsAppBroadcast[]; pagination: Pagination }>(
      "/v1/whatsapp/broadcasts",
      {
        params: { limit, offset, status },
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
    offset = 0,
    status?: string
  ): Promise<{ messages: WhatsAppBroadcastMessage[]; pagination: Pagination }> {
    const { data } = await api.get<{
      messages: WhatsAppBroadcastMessage[]
      pagination: Pagination
    }>(`/v1/whatsapp/broadcasts/${broadcastId}/messages`, {
      params: { limit, offset, status },
    })
    return data
  },

  // ============ Stats ============

  async getStats(
    days = 7,
    startDate?: string,
    endDate?: string
  ): Promise<WhatsAppStats> {
    const { data } = await api.get<WhatsAppStats>("/v1/whatsapp/stats", {
      params: { days, start_date: startDate, end_date: endDate },
    })
    return data
  },
}
