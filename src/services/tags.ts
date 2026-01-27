import { api, apiJson } from "./api"
import type { Tag } from "@/types"

export const tagsService = {
  async getTags(): Promise<{ tags: Tag[] }> {
    const { data } = await api.get("/v1/tags")
    return {
      tags: data.tags || data.items || [],
    }
  },

  async getTag(tagId: string): Promise<Tag> {
    const { data } = await api.get<Tag>(`/v1/tags/${tagId}`)
    return data
  },

  async createTag(tag: {
    name: string
    color: string
    description?: string
  }): Promise<{ success: boolean; tag: Tag }> {
    const formData = new URLSearchParams()
    formData.append("name", tag.name)
    formData.append("color", tag.color)
    if (tag.description) formData.append("description", tag.description)

    const { data } = await api.post("/v1/tags", formData)
    return {
      success: data.success ?? true,
      tag: data.tag || data,
    }
  },

  async updateTag(
    tagId: string,
    updates: {
      name?: string
      color?: string
      description?: string
    }
  ): Promise<{ success: boolean; tag: Tag }> {
    const formData = new URLSearchParams()
    if (updates.name) formData.append("name", updates.name)
    if (updates.color) formData.append("color", updates.color)
    if (updates.description !== undefined) formData.append("description", updates.description)

    const { data } = await api.put(`/v1/tags/${tagId}`, formData)
    return {
      success: data.success ?? true,
      tag: data.tag || data,
    }
  },

  async deleteTag(tagId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/v1/tags/${tagId}`)
    return data
  },

  async addContactsToTag(
    tagId: string,
    contactIds: string[]
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await apiJson.post(`/v1/tags/${tagId}/contacts`, contactIds)
    return data
  },

  async removeContactsFromTag(
    tagId: string,
    contactIds: string[]
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await apiJson.delete(`/v1/tags/${tagId}/contacts`, {
      data: contactIds,
    })
    return data
  },
}
