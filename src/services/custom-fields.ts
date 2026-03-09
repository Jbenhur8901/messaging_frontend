import { api, apiJson, buildOrgFormData, getStoredActiveOrgId, withOrgQuery } from "./api"
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

const belongsToOrganization = (rawField: unknown, organizationId: string | null): boolean => {
  if (!organizationId) return true
  const field = (rawField || {}) as Record<string, unknown>
  if (field.is_system === true || field.is_global === true) return true
  const fieldOrgId = typeof field.organization_id === "string" ? field.organization_id : null
  if (!fieldOrgId) return true
  return fieldOrgId === organizationId
}

export const customFieldsService = {
  async getCustomFields(): Promise<{ custom_fields: CustomField[] }> {
    const activeOrgId = getStoredActiveOrgId()
    const { data } = await api.get(withOrgQuery("/v1/custom-fields", activeOrgId))
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

    const normalizedCustom = customFields
      .filter((field: unknown) => belongsToOrganization(field, activeOrgId))
      .map((field: unknown) => normalizeCustomField(field))

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
    const formData = buildOrgFormData({
      field_key: field.field_key,
      label: field.label,
      field_type: field.field_type,
      is_required: field.is_required !== undefined ? String(field.is_required) : undefined,
      is_global: field.is_global !== undefined ? String(field.is_global) : undefined,
      placeholder: field.placeholder,
      options: field.options && field.options.length > 0 ? JSON.stringify(field.options) : undefined,
    }, getStoredActiveOrgId())
    const { data } = await api.post("/v1/custom-fields", formData)
    return data
  },

  async validateCustomFields(values: Record<string, unknown>): Promise<{
    success: boolean
    valid?: boolean
    errors?: string[] | Record<string, unknown>
    message?: string
  }> {
    const activeOrgId = getStoredActiveOrgId()
    const payload = activeOrgId ? { org_id: activeOrgId, ...values } : values
    const { data } = await apiJson.post("/v1/custom-fields/validate", payload)
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
    const formData = buildOrgFormData({
      label: updates.label,
      is_required: updates.is_required !== undefined ? String(updates.is_required) : undefined,
      is_active: updates.is_active !== undefined ? String(updates.is_active) : undefined,
      placeholder: updates.placeholder,
      options: updates.options !== undefined ? JSON.stringify(updates.options) : undefined,
    }, getStoredActiveOrgId())
    const { data } = await api.put(withOrgQuery(`/v1/custom-fields/${fieldId}`, getStoredActiveOrgId()), formData)
    return data
  },

  async deleteCustomField(fieldId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(withOrgQuery(`/v1/custom-fields/${fieldId}`, getStoredActiveOrgId()))
    return data
  },
}
