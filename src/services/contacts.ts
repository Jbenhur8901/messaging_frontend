import { api, apiJson } from "./api"
import type { Contact, ContactImportResult, Pagination } from "@/types"
import { clearAllCachedContacts } from "@/lib/contacts-cache"

export const contactsService = {
  async searchContacts(filters: {
    q?: string
    tagIds?: string[]
    tagMatch?: "all" | "any"
    status?: "active" | "blocked" | "deleted" | "all"
    source?: "api" | "csv" | "manual"
    createdAfter?: string
    createdBefore?: string
    sortBy?: "created_at" | "first_name" | "last_name" | "phone_number"
    sortOrder?: "asc" | "desc"
    limit?: number
    offset?: number
  }): Promise<{ contacts: Contact[]; pagination: Pagination }> {
    const params: Record<string, string | number> = {}
    const {
      q,
      tagIds,
      tagMatch,
      status,
      source,
      createdAfter,
      createdBefore,
      sortBy,
      sortOrder,
      limit = 50,
      offset = 0,
    } = filters

    params.limit = limit
    params.offset = offset
    if (q) params.q = q
    if (tagIds && tagIds.length > 0) params.tag_ids = tagIds.join(",")
    if (tagMatch) params.tag_match = tagMatch
    if (status) params.status = status
    if (source) params.source = source
    if (createdAfter) params.created_after = createdAfter
    if (createdBefore) params.created_before = createdBefore
    if (sortBy) params.sort_by = sortBy
    if (sortOrder) params.sort_order = sortOrder

    try {
      const { data } = await api.get("/v1/contacts/search", { params })
      return data
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response
        if (response?.status === 404) {
          const detail = response.data?.detail || ""
          if (detail.includes("Contact non trouvé") || detail.includes("Contact not found")) {
            return {
              contacts: [],
              pagination: {
                total: 0,
                limit,
                offset,
                has_more: false,
              },
            }
          }
        }
      }
      throw error
    }
  },
  async getContacts(
    limit = 50,
    offset = 0,
    search?: string,
    tagIds?: string[]
  ): Promise<{ contacts: Contact[]; pagination: Pagination }> {
    const params: Record<string, string | number> = { limit, offset }
    if (search) {
      params.search = search
    }
    if (tagIds && tagIds.length > 0) {
      params.tag_ids = tagIds.join(",")
    }

    const { data } = await api.get("/v1/contacts", { params })
    return data
  },

  async getContactsByTags(
    tagIds: string[],
    limit = 50,
    offset = 0
  ): Promise<{ contacts: Contact[]; pagination: Pagination }> {
    try {
      const { data } = await api.get("/v1/contacts/by-tags", {
        params: { tag_ids: tagIds.join(","), limit, offset },
      })
      return data
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { status?: number; data?: { detail?: string } } }).response
        if (response?.status === 404) {
          const detail = response.data?.detail || ""
          if (detail.includes("Contact non trouvé") || detail.includes("Contact not found")) {
            return {
              contacts: [],
              pagination: {
                total: 0,
                limit,
                offset,
                has_more: false,
              },
            }
          }
        }
      }
      throw error
    }
  },

  async getContact(contactId: string): Promise<Contact> {
    const { data } = await api.get<Contact>(`/v1/contacts/${contactId}`)
    return data
  },

  async createContact(contact: {
    phone_number: string
    first_name?: string
    last_name?: string
    email?: string
    custom_fields?: Record<string, unknown>
  }): Promise<{ success: boolean; contact: Contact }> {
    const formData = new URLSearchParams()
    formData.append("phone_number", contact.phone_number)
    if (contact.first_name) formData.append("first_name", contact.first_name)
    if (contact.last_name) formData.append("last_name", contact.last_name)
    if (contact.email) formData.append("email", contact.email)
    if (contact.custom_fields) {
      formData.append("custom_fields", JSON.stringify(contact.custom_fields))
    }

    const { data } = await api.post("/v1/contacts", formData)
    clearAllCachedContacts()
    return data
  },

  async updateContact(
    contactId: string,
    updates: {
      phone_number?: string
      first_name?: string
      last_name?: string
      email?: string
      custom_fields?: Record<string, unknown>
      is_active?: boolean
      tag_ids?: string[]
    }
  ): Promise<{ success: boolean; contact: Contact }> {
    const formData = new URLSearchParams()
    if (updates.phone_number) formData.append("phone_number", updates.phone_number)
    if (updates.first_name !== undefined) formData.append("first_name", updates.first_name)
    if (updates.last_name !== undefined) formData.append("last_name", updates.last_name)
    if (updates.email !== undefined) formData.append("email", updates.email)
    if (updates.custom_fields) {
      formData.append("custom_fields", JSON.stringify(updates.custom_fields))
    }
    if (updates.is_active !== undefined) {
      formData.append("is_active", updates.is_active.toString())
    }
    if (updates.tag_ids) {
      formData.append("tag_ids", updates.tag_ids.join(","))
    }

    const { data } = await api.put(`/v1/contacts/${contactId}`, formData)
    clearAllCachedContacts()
    return data
  },

  async deleteContact(contactId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiJson.post("/v1/contacts/bulk/delete", {
      contact_ids: [contactId],
      mode: "hard",
    })
    clearAllCachedContacts()
    return data
  },

  async bulkDelete(
    contactIds: string[],
    mode: "soft" | "hard" = "hard",
    reason?: string
  ): Promise<{ success: boolean; deleted_count: number; mode: string; message?: string }> {
    const { data } = await apiJson.post("/v1/contacts/bulk/delete", {
      contact_ids: contactIds,
      mode,
      reason,
    })
    clearAllCachedContacts()
    return data
  },

  async bulkAddTags(
    contactIds: string[],
    tagIds: string[]
  ): Promise<{ success: boolean; contacts_affected: number; tags_applied: number }> {
    const { data } = await apiJson.post("/v1/contacts/bulk/tags/add", {
      contact_ids: contactIds,
      tag_ids: tagIds,
    })
    clearAllCachedContacts()
    return data
  },

  async bulkRemoveTags(
    contactIds: string[],
    tagIds: string[]
  ): Promise<{ success: boolean; contacts_affected: number; tags_removed: number }> {
    const { data } = await apiJson.post("/v1/contacts/bulk/tags/remove", {
      contact_ids: contactIds,
      tag_ids: tagIds,
    })
    clearAllCachedContacts()
    return data
  },

  async blockContact(contactId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/v1/contacts/${contactId}/block`)
    clearAllCachedContacts()
    return data
  },

  async unblockContact(contactId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/v1/contacts/${contactId}/unblock`)
    clearAllCachedContacts()
    return data
  },

  async importContactsJson(
    contacts: Array<{
      phone_number: string
      first_name?: string
      last_name?: string
      email?: string
      custom_fields?: Record<string, unknown>
    }>,
    tagIds?: string[],
    updateExisting = false
  ): Promise<ContactImportResult> {
    const url = updateExisting
      ? "/v1/contacts/import/json?update_existing=true"
      : "/v1/contacts/import/json"

    const payload = {
      contacts,
      tag_ids: tagIds,
    }

    try {
      const { data } = await apiJson.post<ContactImportResult>(url, payload)
      clearAllCachedContacts()
      return data
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail?.includes("Custom fields invalides")
      ) {
        // Backward/variant compatibility: some backends validate import custom fields from nested payload.
        const fallbackContacts = contacts.map((contact) => {
          if (!contact.custom_fields) return contact
          return {
            ...contact,
            custom_fields: { custom_fields: contact.custom_fields },
          }
        })
        const { data } = await apiJson.post<ContactImportResult>(url, {
          contacts: fallbackContacts,
          tag_ids: tagIds,
        })
        clearAllCachedContacts()
        return data
      }
      throw error
    }
  },

  async importContactsCsv(file: File, tagIds?: string[]): Promise<ContactImportResult> {
    const formData = new FormData()
    formData.append("file", file)
    if (tagIds && tagIds.length > 0) {
      formData.append("tag_ids", tagIds.join(","))
    }

    const { data } = await api.post<ContactImportResult>("/v1/contacts/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    clearAllCachedContacts()
    return data
  },
}
