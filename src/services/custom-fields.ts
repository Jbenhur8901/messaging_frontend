import { api } from "./api"
import type { CustomField } from "@/types"

export const customFieldsService = {
  async getCustomFields(): Promise<{ custom_fields: CustomField[] }> {
    const { data } = await api.get("/v1/custom-fields")
    return data
  },

  async createCustomField(field: {
    field_key: string
    label: string
    field_type: CustomField["field_type"]
    is_required?: boolean
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
    if (field.placeholder) {
      formData.append("placeholder", field.placeholder)
    }
    if (field.options && field.options.length > 0) {
      formData.append("options", JSON.stringify(field.options))
    }
    const { data } = await api.post("/v1/custom-fields", formData)
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
