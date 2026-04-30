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
  WhatsAppInboxConversation,
  WhatsAppConversationMessage,
  SendTextPayload,
  SendMediaPayload,
  SendLocationPayload,
  MediaUploadResult,
  ScheduledMessage,
  TemplateAnalytics,
  DeliveryRatePoint,
  ReadRatePoint,
  ResponseTimeStats,
  ConversationAnalytics,
  WhatsAppFlow,
  WhatsAppFlowDetail,
  WhatsAppFlowResponse,
  WhatsAppAccount,
  ConsentStatus,
  ConsentHistoryEntry,
  WhatsAppCreditBalance,
  WhatsAppCreditPackage,
  WhatsAppCreditTransaction,
  WhatsAppCreditDashboard,
  WhatsAppCreditNotification,
  PreSendCheck,
  Pagination,
} from "@/types"

const stripBearerPrefix = (value: string): string =>
  value.replace(/^\s*bearer\s*:/i, "").trim()

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
      phone_number_id?: string
      business_account_id?: string
      enabled?: boolean
      ai_enabled?: boolean
      ai_instructions?: string
      ai_model?: string
      ai_timeline?: string
      ai_tools?: string
      ai_vector_store_ids?: string
    }
  ): Promise<{ success: boolean; message: string }> {
    const formData = new URLSearchParams()
    if (config.phone_number_id) formData.append("phone_number_id", config.phone_number_id)
    if (config.business_account_id) formData.append("business_account_id", config.business_account_id)
    if (config.enabled !== undefined) formData.append("enabled", String(config.enabled))
    if (config.ai_enabled !== undefined) formData.append("ai_enabled", String(config.ai_enabled))
    if (config.ai_instructions !== undefined) formData.append("ai_instructions", config.ai_instructions)
    if (config.ai_model !== undefined) formData.append("ai_model", config.ai_model)
    if (config.ai_timeline !== undefined) formData.append("ai_timeline", config.ai_timeline)
    if (config.ai_tools !== undefined) formData.append("ai_tools", config.ai_tools)
    if (config.ai_vector_store_ids !== undefined) formData.append("ai_vector_store_ids", config.ai_vector_store_ids)

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
    const normalizedRecipients = recipients
      .map(stripBearerPrefix)
      .map((recipient) => recipient.trim())
      .filter(Boolean)

    const formData = new URLSearchParams()
    formData.append("recipients", normalizedRecipients.join(","))
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
    const normalizedPayload = {
      ...payload,
      recipients: payload.recipients
        .map((recipient) => ({
          ...recipient,
          phone: stripBearerPrefix(recipient.phone),
        }))
        .filter((recipient) => recipient.phone.trim().length > 0),
    }

    const { data } = await apiJson.post<WhatsAppBroadcastResult>(
      "/v1/whatsapp/broadcasts/personalized",
      normalizedPayload
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
    const normalizedPayload = {
      ...payload,
      recipients: payload.recipients
        .map(stripBearerPrefix)
        .map((recipient) => recipient.trim())
        .filter(Boolean),
    }

    const { data } = await apiJson.post<WhatsAppBroadcastResult>(
      "/v1/whatsapp/broadcasts/json",
      normalizedPayload
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
    const { data } = await api.get("/v1/whatsapp/stats", {
      params: { days, start_date: startDate, end_date: endDate },
    })
    // Handle various response shapes: direct, { stats: ... }, { data: ... }
    const raw = (data as Record<string, unknown>)?.stats ?? (data as Record<string, unknown>)?.data ?? data
    const toNum = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0)
    const r = raw as Record<string, unknown>
    return {
      total_messages: toNum(r.total_messages ?? r.total_sent ?? r.total ?? r.messages_sent),
      delivered: toNum(r.delivered ?? r.total_delivered ?? r.messages_delivered),
      read: toNum(r.read ?? r.total_read ?? r.messages_read),
      failed: toNum(r.failed ?? r.total_failed ?? r.messages_failed),
      delivery_rate: toNum(r.delivery_rate ?? r.delivery_rate_percent),
      read_rate: toNum(r.read_rate ?? r.read_rate_percent),
      period_days: toNum(r.period_days ?? r.period ?? r.days) || days,
    }
  },

  // ============ Conversations Inbox ============

  async getConversations(
    status?: string,
    assignedTo?: string,
    limit = 50,
    offset = 0
  ): Promise<{ conversations: WhatsAppInboxConversation[]; pagination: Pagination }> {
    const { data } = await api.get<{ conversations: WhatsAppInboxConversation[]; pagination: Pagination }>(
      "/v1/whatsapp/conversations",
      { params: { status, assigned_to: assignedTo, limit, offset } }
    )
    return data
  },

  async getConversation(conversationId: string): Promise<WhatsAppInboxConversation> {
    const { data } = await api.get<WhatsAppInboxConversation>(`/v1/whatsapp/conversations/${conversationId}`)
    return data
  },

  async getConversationMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: WhatsAppConversationMessage[]; pagination: Pagination }> {
    const { data } = await api.get<{ messages: WhatsAppConversationMessage[]; pagination: Pagination }>(
      `/v1/whatsapp/conversations/${conversationId}/messages`,
      { params: { limit, offset } }
    )
    return data
  },

  async updateConversation(
    conversationId: string,
    updates: { status?: string; assigned_to?: string }
  ): Promise<WhatsAppInboxConversation> {
    const formData = new URLSearchParams()
    if (updates.status) formData.append("status", updates.status)
    if (updates.assigned_to) formData.append("assigned_to", updates.assigned_to)
    const { data } = await api.put<WhatsAppInboxConversation>(
      `/v1/whatsapp/conversations/${conversationId}`,
      formData
    )
    return data
  },

  async markConversationRead(conversationId: string): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(
      `/v1/whatsapp/conversations/${conversationId}/read`
    )
    return data
  },

  // ============ Freeform Messages ============

  async sendTextMessage(payload: SendTextPayload): Promise<WhatsAppMessageResult> {
    const formData = new URLSearchParams()
    formData.append("to", payload.to)
    formData.append("text", payload.text)
    if (payload.preview_url) formData.append("preview_url", "true")
    if (payload.reply_to_wamid) formData.append("reply_to_wamid", payload.reply_to_wamid)
    const { data } = await api.post<WhatsAppMessageResult>("/v1/whatsapp/messages/text", formData)
    return data
  },

  async sendMediaMessage(payload: SendMediaPayload): Promise<WhatsAppMessageResult> {
    const formData = new URLSearchParams()
    formData.append("to", payload.to)
    formData.append("media_type", payload.media_type)
    if (payload.media_url) formData.append("media_url", payload.media_url)
    if (payload.media_id) formData.append("media_id", payload.media_id)
    if (payload.caption) formData.append("caption", payload.caption)
    if (payload.filename) formData.append("filename", payload.filename)
    const { data } = await api.post<WhatsAppMessageResult>("/v1/whatsapp/messages/media", formData)
    return data
  },

  async sendLocationMessage(payload: SendLocationPayload): Promise<WhatsAppMessageResult> {
    const formData = new URLSearchParams()
    formData.append("to", payload.to)
    formData.append("latitude", payload.latitude)
    formData.append("longitude", payload.longitude)
    if (payload.name) formData.append("name", payload.name)
    if (payload.address) formData.append("address", payload.address)
    const { data } = await api.post<WhatsAppMessageResult>("/v1/whatsapp/messages/location", formData)
    return data
  },

  async markMessageRead(wamid: string): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(`/v1/whatsapp/messages/${wamid}/read`)
    return data
  },

  async uploadMedia(file: File): Promise<MediaUploadResult> {
    const formData = new FormData()
    formData.append("file", file)
    const { data } = await api.post<MediaUploadResult>("/v1/whatsapp/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },

  // ============ Scheduled Messages ============

  async scheduleMessage(payload: {
    to: string
    message_type: "template" | "text"
    scheduled_at: string
    timezone?: string
    template_name?: string
    template_language?: string
    text_body?: string
  }): Promise<{ success: boolean; scheduled_message: ScheduledMessage }> {
    const formData = new URLSearchParams()
    formData.append("to", payload.to)
    formData.append("message_type", payload.message_type)
    formData.append("scheduled_at", payload.scheduled_at)
    if (payload.timezone) formData.append("timezone", payload.timezone)
    if (payload.template_name) formData.append("template_name", payload.template_name)
    if (payload.template_language) formData.append("template_language", payload.template_language)
    if (payload.text_body) formData.append("text_body", payload.text_body)
    const { data } = await api.post<{ success: boolean; scheduled_message: ScheduledMessage }>(
      "/v1/whatsapp/messages/schedule",
      formData
    )
    return data
  },

  async scheduleBroadcast(payload: {
    recipients: string[]
    template_name: string
    template_language: string
    scheduled_at: string
    timezone?: string
    campaign_name?: string
  }): Promise<{ success: boolean; scheduled_message: ScheduledMessage }> {
    const formData = new URLSearchParams()
    formData.append("recipients", payload.recipients.join(","))
    formData.append("template_name", payload.template_name)
    formData.append("template_language", payload.template_language)
    formData.append("scheduled_at", payload.scheduled_at)
    if (payload.timezone) formData.append("timezone", payload.timezone)
    if (payload.campaign_name) formData.append("campaign_name", payload.campaign_name)
    const { data } = await api.post<{ success: boolean; scheduled_message: ScheduledMessage }>(
      "/v1/whatsapp/broadcasts/schedule",
      formData
    )
    return data
  },

  async getScheduledMessages(
    status?: string,
    scheduledType?: string,
    limit = 50,
    offset = 0
  ): Promise<{ scheduled_messages: ScheduledMessage[]; pagination: Pagination }> {
    const { data } = await api.get<{ scheduled_messages: ScheduledMessage[]; pagination: Pagination }>(
      "/v1/whatsapp/scheduled",
      { params: { status, scheduled_type: scheduledType, limit, offset } }
    )
    return data
  },

  async getScheduledMessage(id: string): Promise<ScheduledMessage> {
    const { data } = await api.get<ScheduledMessage>(`/v1/whatsapp/scheduled/${id}`)
    return data
  },

  async cancelScheduledMessage(id: string): Promise<{ success: boolean }> {
    const { data } = await api.delete<{ success: boolean }>(`/v1/whatsapp/scheduled/${id}`)
    return data
  },

  // ============ Analytics ============

  async getTemplateAnalytics(
    startDate: string,
    endDate: string,
    templateId?: string
  ): Promise<{ analytics: TemplateAnalytics[] }> {
    const { data } = await api.get<{ analytics: TemplateAnalytics[] }>(
      "/v1/whatsapp/analytics/templates",
      { params: { start_date: startDate, end_date: endDate, template_id: templateId } }
    )
    return data
  },

  async getTemplateAnalyticsDetail(
    templateId: string,
    startDate: string,
    endDate: string
  ): Promise<TemplateAnalytics> {
    const { data } = await api.get<TemplateAnalytics>(
      `/v1/whatsapp/analytics/templates/${templateId}`,
      { params: { start_date: startDate, end_date: endDate } }
    )
    return data
  },

  async getDeliveryRates(
    startDate: string,
    endDate: string,
    groupBy?: string
  ): Promise<{ data: DeliveryRatePoint[] }> {
    const { data } = await api.get<{ data: DeliveryRatePoint[] }>(
      "/v1/whatsapp/analytics/delivery-rates",
      { params: { start_date: startDate, end_date: endDate, group_by: groupBy } }
    )
    return data
  },

  async getReadRates(
    startDate: string,
    endDate: string,
    groupBy?: string
  ): Promise<{ data: ReadRatePoint[] }> {
    const { data } = await api.get<{ data: ReadRatePoint[] }>(
      "/v1/whatsapp/analytics/read-rates",
      { params: { start_date: startDate, end_date: endDate, group_by: groupBy } }
    )
    return data
  },

  async getResponseTimes(
    startDate: string,
    endDate: string
  ): Promise<ResponseTimeStats> {
    const { data } = await api.get<ResponseTimeStats>(
      "/v1/whatsapp/analytics/response-times",
      { params: { start_date: startDate, end_date: endDate } }
    )
    return data
  },

  async getConversationAnalytics(
    startDate: string,
    endDate: string
  ): Promise<ConversationAnalytics> {
    const { data } = await api.get<ConversationAnalytics>(
      "/v1/whatsapp/analytics/conversations",
      { params: { start_date: startDate, end_date: endDate } }
    )
    return data
  },

  async exportAnalytics(
    reportType: string,
    startDate: string,
    endDate: string
  ): Promise<Blob> {
    const { data } = await api.get<Blob>(
      "/v1/whatsapp/analytics/export",
      { params: { report_type: reportType, start_date: startDate, end_date: endDate }, responseType: "blob" }
    )
    return data
  },

  // ============ Flows ============

  async syncFlows(): Promise<{ success: boolean; synced: number }> {
    const { data } = await api.post<{ success: boolean; synced: number }>("/v1/whatsapp/flows/sync")
    return data
  },

  async getFlows(
    status?: string,
    limit = 50,
    offset = 0
  ): Promise<{ flows: WhatsAppFlow[]; pagination: Pagination }> {
    const { data } = await api.get<{ flows: WhatsAppFlow[]; pagination: Pagination }>(
      "/v1/whatsapp/flows",
      { params: { status, limit, offset } }
    )
    return data
  },

  async createFlow(
    name: string,
    categories: string[]
  ): Promise<{ success: boolean; flow: WhatsAppFlow }> {
    const formData = new URLSearchParams()
    formData.append("name", name)
    formData.append("categories", JSON.stringify(categories))
    const { data } = await api.post<{ success: boolean; flow: WhatsAppFlow }>(
      "/v1/whatsapp/flows",
      formData
    )
    return data
  },

  async getFlow(id: string): Promise<WhatsAppFlowDetail> {
    const { data } = await api.get<WhatsAppFlowDetail>(`/v1/whatsapp/flows/${id}`)
    return data
  },

  async updateFlowJson(id: string, flowJson: object): Promise<{ success: boolean }> {
    const formData = new URLSearchParams()
    formData.append("flow_json", JSON.stringify(flowJson))
    const { data } = await api.put<{ success: boolean }>(`/v1/whatsapp/flows/${id}`, formData)
    return data
  },

  async publishFlow(id: string): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(`/v1/whatsapp/flows/${id}/publish`)
    return data
  },

  async deprecateFlow(id: string): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(`/v1/whatsapp/flows/${id}/deprecate`)
    return data
  },

  async sendFlowMessage(payload: {
    to: string
    flow_id: string
    flow_token: string
    flow_cta: string
    flow_action?: string
  }): Promise<WhatsAppMessageResult> {
    const formData = new URLSearchParams()
    formData.append("to", payload.to)
    formData.append("flow_id", payload.flow_id)
    formData.append("flow_token", payload.flow_token)
    formData.append("flow_cta", payload.flow_cta)
    if (payload.flow_action) formData.append("flow_action", payload.flow_action)
    const { data } = await api.post<WhatsAppMessageResult>("/v1/whatsapp/messages/flow", formData)
    return data
  },

  async getFlowResponses(
    flowId: string,
    limit = 50,
    offset = 0
  ): Promise<{ responses: WhatsAppFlowResponse[]; pagination: Pagination }> {
    const { data } = await api.get<{ responses: WhatsAppFlowResponse[]; pagination: Pagination }>(
      `/v1/whatsapp/flows/${flowId}/responses`,
      { params: { limit, offset } }
    )
    return data
  },

  async getFlowAnalytics(
    flowId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, unknown>> {
    const { data } = await api.get<Record<string, unknown>>(
      `/v1/whatsapp/flows/${flowId}/analytics`,
      { params: { start_date: startDate, end_date: endDate } }
    )
    return data
  },

  // ============ Accounts ============

  async getAccounts(
    status?: string,
    includeSummary?: boolean
  ): Promise<{ accounts: WhatsAppAccount[] }> {
    const { data } = await api.get<{ accounts: WhatsAppAccount[] }>(
      "/v1/whatsapp/accounts",
      { params: { status, include_summary: includeSummary } }
    )
    return data
  },

  async deleteAccount(id: string): Promise<{ success: boolean }> {
    const { data } = await api.delete<{ success: boolean }>(`/v1/whatsapp/accounts/${id}`)
    return data
  },

  async setDefaultAccount(id: string): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(`/v1/whatsapp/accounts/${id}/set-default`)
    return data
  },

  async syncAccount(id: string): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(`/v1/whatsapp/accounts/${id}/sync`)
    return data
  },

  // ============ Consent ============

  async optInContact(
    contactId: string,
    source: string,
    consentText?: string,
    ip?: string
  ): Promise<{ success: boolean }> {
    const formData = new URLSearchParams()
    formData.append("source", source)
    if (consentText) formData.append("consent_text", consentText)
    if (ip) formData.append("ip_address", ip)
    const { data } = await api.post<{ success: boolean }>(
      `/v1/whatsapp/contacts/${contactId}/opt-in`,
      formData
    )
    return data
  },

  async optOutContact(contactId: string, source: string): Promise<{ success: boolean }> {
    const formData = new URLSearchParams()
    formData.append("source", source)
    const { data } = await api.post<{ success: boolean }>(
      `/v1/whatsapp/contacts/${contactId}/opt-out`,
      formData
    )
    return data
  },

  async getConsentStatus(contactId: string): Promise<ConsentStatus> {
    const { data } = await api.get<ConsentStatus>(`/v1/whatsapp/contacts/${contactId}/consent`)
    return data
  },

  async getConsentHistory(
    contactId: string,
    limit = 50,
    offset = 0
  ): Promise<{ history: ConsentHistoryEntry[]; pagination: Pagination }> {
    const { data } = await api.get<{ history: ConsentHistoryEntry[]; pagination: Pagination }>(
      `/v1/whatsapp/contacts/${contactId}/consent/history`,
      { params: { limit, offset } }
    )
    return data
  },

  async bulkConsent(
    contactIds: string[],
    optIn: boolean,
    source: string
  ): Promise<{ success: boolean; processed: number }> {
    const formData = new URLSearchParams()
    formData.append("contact_ids", contactIds.join(","))
    formData.append("opt_in", String(optIn))
    formData.append("source", source)
    const { data } = await api.post<{ success: boolean; processed: number }>(
      "/v1/whatsapp/contacts/bulk-consent",
      formData
    )
    return data
  },

  // ============ WhatsApp Credits ============

  async getWhatsAppBalance(): Promise<WhatsAppCreditBalance> {
    const { data } = await api.get<WhatsAppCreditBalance>("/v1/app/whatsapp/credits/balance")
    return data
  },

  async getPackages(category?: string): Promise<{ packages: WhatsAppCreditPackage[] }> {
    const { data } = await api.get<{ packages: WhatsAppCreditPackage[] }>(
      "/v1/app/whatsapp/credits/packages",
      { params: { category } }
    )
    return data
  },

  async createYabetooRechargeIntent(
    amount: number,
    description?: string
  ): Promise<{ success: boolean; intent_id: string; client_secret: string; amount: number; currency: string; status: string }> {
    const { data } = await api.post("/v1/app/whatsapp/credits/recharge/yabetoo/intent", {
      amount,
      description: description ?? "Recharge wallet WhatsApp",
    })
    return data
  },

  async confirmYabetooPayment(payload: {
    intent_id: string
    first_name: string
    last_name: string
    phone: string
    operator: "mtn" | "airtel"
    receipt_email?: string
  }): Promise<{ success: boolean; intent_id: string; status: string; wallet_credited: boolean; wallet_summary?: Record<string, unknown> }> {
    const { data } = await api.post("/v1/app/whatsapp/credits/recharge/yabetoo/confirm", payload)
    return data
  },

  async createStripeRechargeIntent(
    amountXaf: number,
    description?: string
  ): Promise<{ success: boolean; intent_id: string; client_secret: string; stripe_amount: number; stripe_currency: string; amount_xaf: number; status: string }> {
    const { data } = await api.post("/v1/app/whatsapp/credits/recharge/stripe/intent", {
      amount_xaf: amountXaf,
      description: description ?? "Recharge wallet WhatsApp",
    })
    return data
  },

  async getWhatsAppTransactions(
    type?: string,
    compartment?: string,
    limit = 50,
    offset = 0
  ): Promise<{ transactions: WhatsAppCreditTransaction[]; pagination: Pagination }> {
    const { data } = await api.get<{
      transactions: Array<
        Partial<WhatsAppCreditTransaction> & {
          type?: string
          amount_fcfa?: number
        }
      >
      pagination: Pagination
    }>(
      "/v1/app/whatsapp/credits/transactions",
      { params: { type, compartment, limit, offset } }
    )
    const normalizedTransactions: WhatsAppCreditTransaction[] = (data.transactions || []).map((tx) => {
      const normalizedType = tx.transaction_type || tx.type || "purchase"
      const normalizedAmount =
        typeof tx.amount === "number"
          ? tx.amount
          : typeof tx.amount_fcfa === "number"
            ? tx.amount_fcfa
            : 0

      return {
        id: tx.id || "",
        transaction_type:
          normalizedType === "purchase" ||
          normalizedType === "consumption" ||
          normalizedType === "refund" ||
          normalizedType === "expiration"
            ? normalizedType
            : "purchase",
        compartment: tx.compartment || "",
        amount: normalizedAmount,
        description: tx.description || "",
        created_at: tx.created_at || "",
      }
    })

    return {
      transactions: normalizedTransactions,
      pagination: data.pagination,
    }
  },

  async getWhatsAppUsage(days = 30): Promise<{ period_days: number; total_consumed: number; daily_breakdown: Record<string, number>; by_compartment: Record<string, number> }> {
    const { data } = await api.get<{ period_days: number; total_consumed: number; daily_breakdown: Record<string, number>; by_compartment: Record<string, number> }>(
      "/v1/app/whatsapp/credits/usage",
      { params: { days } }
    )
    return data
  },

  async getWhatsAppCreditsDashboard(days = 30): Promise<WhatsAppCreditDashboard> {
    const { data } = await api.get<WhatsAppCreditDashboard>(
      "/v1/app/whatsapp/credits/dashboard",
      { params: { days } }
    )
    return data
  },

  async checkCredits(
    category: string,
    messageCount: number
  ): Promise<PreSendCheck> {
    const { data } = await api.get<PreSendCheck>(
      "/v1/app/whatsapp/credits/check",
      { params: { category, message_count: messageCount } }
    )
    return data
  },

  async getWhatsAppNotifications(
    unreadOnly?: boolean,
    limit = 50,
    offset = 0
  ): Promise<{ notifications: WhatsAppCreditNotification[]; pagination: Pagination }> {
    const { data } = await api.get<{ notifications: WhatsAppCreditNotification[]; pagination: Pagination }>(
      "/v1/app/whatsapp/credits/notifications",
      { params: { unread_only: unreadOnly, limit, offset } }
    )
    return data
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>(`/v1/app/whatsapp/credits/notifications/${id}/read`)
    return data
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    const { data } = await api.post<{ success: boolean }>("/v1/app/whatsapp/credits/notifications/read-all")
    return data
  },
}
