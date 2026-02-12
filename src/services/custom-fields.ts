import { api, apiJson } from "./api"
import type { CustomField } from "@/types"

const normalizeCustomField = (rawField: unknown): CustomField => {
  const field = (rawField || {}) as Record<string, unknown>
  return {
    id: String(field.id ?? field.field_id ?? ""),
    field_key: String(field.field_key ?? field.key ?? field.name ?? ""),
    label: String(field.label ?? field.display_name ?? field.name ?? field.field_key ?? field.key ?? ""),
    field_type: (field.field_type ?? field.type ?? "text") as CustomField["field_type"],
    is_required: Boolean(field.is_required),
    is_active: field.is_active === undefined ? true : Boolean(field.is_active),
    is_system: field.is_system === undefined ? false : Boolean(field.is_system),
    is_global: field.is_global === undefined ? undefined : Boolean(field.is_global),
    placeholder: typeof field.placeholder === "string" ? field.placeholder : undefined,
    options: Array.isArray(field.options) ? field.options.map(String) : undefined,
  }
}

export const customFieldsService = {
  async getCustomFields(): Promise<{ custom_fields: CustomField[] }> {
    const { data } = await api.get("/v1/custom-fields")
    const systemFields = Array.isArray(data.system_fields)
      ? data.system_fields
      : Array.isArray(data.fields_system)
      ? data.fields_system
      : []

    const customFields = Array.isArray(data.custom_fields)
      ? data.custom_fields
      : Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.fields)
      ? data.fields
      : []

    const normalizedSystem = systemFields.map((field: unknown) => ({
      ...normalizeCustomField(field),
      is_system: true,
    }))

    const normalizedCustom = customFields.map((field: unknown) => normalizeCustomField(field))

    return { custom_fields: [...normalizedSystem, ...normalizedCustom] }
  },

  async createCustomField(field: {
    field_key: string
    label: string
    field_type: CustomField["field_type"]
    is_required?: boolean
    is_global?: boolean
    placeholder?: string
    options?: string[]
  }): Promise<{ success: boolean; custom_field: CustomField }> {
    const formData = new URLSearchParams()
    formData.append("field_key", field.field_key)
    formData.append("label", field.label)
    formData.append("field_type", field.field_type)
    if (field.is_required !== undefined) {
      formData.append("is_required", String(field.is_required))
    }
    if (field.is_global !== undefined) {
      formData.append("is_global", String(field.is_global))
    }
    if (field.placeholder) {
      formData.append("placeholder", field.placeholder)
    }
    if (field.options && field.options.length > 0) {
      formData.append("options", JSON.stringify(field.options))
    }
    const { data } = await api.post("/v1/custom-fields", formData)
    return data
  },

  async validateCustomFields(values: Record<string, unknown>): Promise<{
    success: boolean
    valid?: boolean
    errors?: string[] | Record<string, unknown>
    message?: string
  }> {
    const { data } = await apiJson.post("/v1/custom-fields/validate", values)
    return data
  },

  async updateCustomField(
    fieldId: string,
    updates: {
      label?: string
      is_required?: boolean
      is_active?: boolean
      placeholder?: string
      options?: string[]
    }
  ): Promise<{ success: boolean; custom_field: CustomField }> {
    const formData = new URLSearchParams()
    if (updates.label !== undefined) {
      formData.append("label", updates.label)
    }
    if (updates.is_required !== undefined) {
      formData.append("is_required", String(updates.is_required))
    }
    if (updates.is_active !== undefined) {
      formData.append("is_active", String(updates.is_active))
    }
    if (updates.placeholder !== undefined) {
      formData.append("placeholder", updates.placeholder)
    }
    if (updates.options !== undefined) {
      formData.append("options", JSON.stringify(updates.options))
    }
    const { data } = await api.put(`/v1/custom-fields/${fieldId}`, formData)
    return data
  },

  async deleteCustomField(fieldId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/v1/custom-fields/${fieldId}`)
    return data
  },
}
