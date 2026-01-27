import { api } from "./api"
import type { MessagingService, CreateMessagingServiceRequest } from "@/types"

export const messagingServicesService = {
  async list(
    includeInactive = false
  ): Promise<{ services: MessagingService[] }> {
    const { data } = await api.get("/v1/messaging-services", {
      params: { include_inactive: includeInactive },
    })
    return {
      services: data.messaging_services || [],
    }
  },

  async get(serviceId: string): Promise<MessagingService> {
    const { data } = await api.get(`/v1/messaging-services/${serviceId}`)
    return data.messaging_service
  },

  async create(request: CreateMessagingServiceRequest): Promise<{
    success: boolean
    service: MessagingService
    message?: string
  }> {
    const formData = new URLSearchParams()
    formData.append("service_name", request.service_name)
    formData.append("alpha_sender_id", request.alpha_sender_id)
    if (request.usecase) {
      formData.append("usecase", request.usecase)
    }
    if (request.inbound_request_url) {
      formData.append("inbound_request_url", request.inbound_request_url)
    }
    if (request.status_callback_url) {
      formData.append("status_callback_url", request.status_callback_url)
    }
    if (request.is_default !== undefined) {
      formData.append("is_default", request.is_default ? "true" : "false")
    }

    const { data } = await api.post("/v1/messaging-services", formData)
    return {
      success: data.success,
      service: data,
      message: data.message,
    }
  },

  async update(
    serviceId: string,
    request: Partial<CreateMessagingServiceRequest>
  ): Promise<{ success: boolean; service: MessagingService }> {
    const formData = new URLSearchParams()
    if (request.service_name) {
      formData.append("service_name", request.service_name)
    }
    if (request.usecase) {
      formData.append("usecase", request.usecase)
    }
    if (request.inbound_request_url) {
      formData.append("inbound_request_url", request.inbound_request_url)
    }
    if (request.status_callback_url) {
      formData.append("status_callback_url", request.status_callback_url)
    }
    if (request.is_default !== undefined) {
      formData.append("is_default", request.is_default ? "true" : "false")
    }
    if ((request as { is_active?: boolean }).is_active !== undefined) {
      formData.append("is_active", (request as { is_active?: boolean }).is_active ? "true" : "false")
    }

    const { data } = await api.put(`/v1/messaging-services/${serviceId}`, formData)
    return {
      success: data.success,
      service: data.messaging_service || data.service,
    }
  },

  async setDefault(serviceId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/v1/messaging-services/${serviceId}/set-default`)
    return data
  },

  async delete(serviceId: string, keepOnTwilio = false): Promise<{ success: boolean; message?: string }> {
    const { data } = await api.delete(`/v1/messaging-services/${serviceId}`, {
      params: { keep_on_twilio: keepOnTwilio },
    })
    return data
  },
}
