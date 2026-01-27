import { api } from "./api"
import type { Template, TemplatePreview, Pagination } from "@/types"

export const templatesService = {
  async getTemplates(
    category?: string,
    limit = 20,
    offset = 0
  ): Promise<{ templates: Template[]; pagination: Pagination }> {
    const params: Record<string, string | number> = { limit, offset }
    if (category) {
      params.category = category
    }

    const { data } = await api.get("/v1/templates", { params })
    return {
      templates: data.templates || data.items || [],
      pagination: data.pagination || {
        total: data.count ?? (data.templates || data.items || []).length,
        limit,
        offset,
      },
    }
  },

  async getTemplate(templateId: string): Promise<Template> {
    const { data } = await api.get<Template>(`/v1/templates/${templateId}`)
    return data
  },

  async createTemplate(template: {
    name: string
    body: string
    category?: "transactional" | "marketing" | "notification" | "other"
  }): Promise<{ success: boolean; template: Template }> {
    const formData = new URLSearchParams()
    formData.append("name", template.name)
    formData.append("body", template.body)
    if (template.category) formData.append("category", template.category)

    const { data } = await api.post("/v1/templates", formData)
    return {
      success: data.success ?? true,
      template: data.template || data,
    }
  },

  async updateTemplate(
    templateId: string,
    updates: {
      name?: string
      body?: string
      category?: "transactional" | "marketing" | "notification" | "other"
      is_active?: boolean
    }
  ): Promise<{ success: boolean; template: Template }> {
    const formData = new URLSearchParams()
    if (updates.name) formData.append("name", updates.name)
    if (updates.body) formData.append("body", updates.body)
    if (updates.category) formData.append("category", updates.category)
    if (updates.is_active !== undefined) {
      formData.append("is_active", updates.is_active.toString())
    }

    const { data } = await api.put(`/v1/templates/${templateId}`, formData)
    return {
      success: data.success ?? true,
      template: data.template || data,
    }
  },

  async deleteTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/v1/templates/${templateId}`)
    return data
  },

  async previewTemplate(
    templateId: string,
    variables: Record<string, string>
  ): Promise<TemplatePreview> {
    const formData = new URLSearchParams()
    formData.append("variables", JSON.stringify(variables))

    const { data } = await api.post<TemplatePreview>(
      `/v1/templates/${templateId}/preview`,
      formData
    )
    return data
  },
}
