import { api, apiJson } from "./api"
import type { Contact, ContactImportResult, Pagination } from "@/types"

export const contactsService = {
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
    const { data } = await api.get("/v1/contacts/by-tags", {
      params: { tag_ids: tagIds.join(","), limit, offset },
    })
    return data
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
    return data
  },

  async deleteContact(contactId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/v1/contacts/${contactId}`)
    return data
  },

  async blockContact(contactId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/v1/contacts/${contactId}/block`)
    return data
  },

  async unblockContact(contactId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/v1/contacts/${contactId}/unblock`)
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
    tagIds?: string[]
  ): Promise<ContactImportResult> {
    const { data } = await apiJson.post<ContactImportResult>("/v1/contacts/import/json", {
      contacts,
      tag_ids: tagIds,
    })
    return data
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
    return data
  },
}
