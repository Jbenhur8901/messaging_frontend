import { api, apiJson } from "./api"
import type {
  MessageResult,
  BroadcastResult,
  Broadcast,
  BroadcastMessage,
  Pagination,
  SMSAnalysis,
  SMSEstimate,
  NonGSMCharacter,
} from "@/types"

export const smsService = {
  // Single SMS
  async sendSMS(to: string, body: string, mediaUrl?: string): Promise<MessageResult> {
    const formData = new URLSearchParams()
    formData.append("to", to)
    formData.append("body", body)
    if (mediaUrl) {
      formData.append("media_url", mediaUrl)
    }

    const { data } = await api.post<MessageResult>("/v1/messages", formData)
    return data
  },

  // Broadcasts
  async createBroadcast(
    recipients: string[],
    body: string,
    campaignName?: string,
    mediaUrl?: string,
    messagingServiceSid?: string
  ): Promise<BroadcastResult> {
    const formData = new URLSearchParams()
    formData.append("recipients", recipients.join(","))
    formData.append("body", body)
    if (campaignName) {
      formData.append("campaign_name", campaignName)
    }
    if (mediaUrl) {
      formData.append("media_url", mediaUrl)
    }
    if (messagingServiceSid) {
      formData.append("messaging_service_sid", messagingServiceSid)
    }

    const { data } = await api.post<BroadcastResult>("/v1/broadcasts", formData)
    return data
  },

  async createBroadcastJson(
    recipients: string[],
    body: string,
    campaignName?: string,
    mediaUrl?: string
  ): Promise<BroadcastResult> {
    const { data } = await apiJson.post<BroadcastResult>("/v1/broadcasts/json", {
      recipients,
      body,
      campaign_name: campaignName,
      media_url: mediaUrl,
    })
    return data
  },

  async getBroadcast(broadcastId: string): Promise<Broadcast> {
    const { data } = await api.get<Broadcast>(`/v1/broadcasts/${broadcastId}`)
    return data
  },

  async getBroadcastMessages(
    broadcastId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: BroadcastMessage[]; pagination: Pagination }> {
    const { data } = await api.get(`/v1/broadcasts/${broadcastId}/messages`, {
      params: { limit, offset },
    })
    const rawMessages = data.messages || data.items || []
    const messages = rawMessages.map((msg: any) => ({
      phone: msg.phone || msg.phone_number || msg.to || "",
      status: msg.status,
      segments_count: msg.segments_count ?? msg.segments ?? msg.segments_per_message ?? 0,
      twilio_sid: msg.twilio_sid ?? msg.twilioSid ?? null,
      error: msg.error ?? msg.error_message ?? null,
      sent_at: msg.sent_at ?? msg.sentAt ?? null,
    }))
    const total = data.total ?? data.total_in_page ?? messages.length
    const pagination = data.pagination || { total, limit, offset }
    return { messages, pagination }
  },

  async listBroadcasts(
    limit = 20,
    offset = 0
  ): Promise<{ broadcasts: Broadcast[]; pagination: Pagination }> {
    const { data } = await api.get("/v1/broadcasts", {
      params: { limit, offset },
    })
    return data
  },

  // SMS Tools (some are public)
  async analyzeMessage(body: string): Promise<SMSAnalysis> {
    const formData = new URLSearchParams()
    formData.append("body", body)

    const { data } = await api.post<SMSAnalysis>("/v1/sms/analyze", formData)
    return data
  },

  async estimateCost(body: string, recipientCount: number): Promise<SMSEstimate> {
    const formData = new URLSearchParams()
    formData.append("body", body)
    formData.append("recipient_count", recipientCount.toString())

    const { data } = await api.post<SMSEstimate>("/v1/sms/estimate", formData)
    return data
  },

  async optimizeMessage(body: string): Promise<{
    original: { text: string; analysis: SMSAnalysis }
    can_optimize: boolean
    suggestions: string[]
    non_gsm_characters: NonGSMCharacter[]
  }> {
    const formData = new URLSearchParams()
    formData.append("body", body)

    const { data } = await api.post("/v1/sms/optimize", formData)
    return data
  },

  async findSpecialChars(body: string): Promise<{
    is_gsm_compatible: boolean
    encoding: "GSM-7" | "UCS-2"
    non_gsm_characters: NonGSMCharacter[]
    total_non_gsm: number
  }> {
    const formData = new URLSearchParams()
    formData.append("body", body)

    const { data } = await api.post("/v1/sms/find-special-chars", formData)
    return data
  },

  async getEncodingInfo(): Promise<{
    gsm7: {
      name: string
      single_segment_limit: number
      multi_segment_limit: number
      description: string
    }
    ucs2: {
      name: string
      single_segment_limit: number
      multi_segment_limit: number
      description: string
    }
  }> {
    const { data } = await api.get("/v1/sms/encoding-info")
    return data
  },

  // Message events
  async getMessageEvents(twilioSid: string): Promise<{
    events: Array<{
      status: string
      timestamp: string
      error_code?: string
      error_message?: string
    }>
  }> {
    const { data } = await api.get(`/v1/messages/${twilioSid}/events`)
    return data
  },
}
