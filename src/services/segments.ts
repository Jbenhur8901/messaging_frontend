import { api } from "./api"

// ── Types ──────────────────────────────────────────────────────────────────

export type RuleOperator = "eq" | "neq" | "gte" | "lte" | "between" | "in" | "contains"
export type GroupOperator = "and" | "or"

export type TagIncludeRule = { type: "tag_include"; tag_id: string }
export type TagExcludeRule = { type: "tag_exclude"; tag_id: string }
export type FieldRule = {
  type: "field"
  field: string
  op: RuleOperator
  value: string | number | boolean | string[] | number[]
}
export type CustomFieldRule = {
  type: "custom_field"
  custom_field_key: string
  op: RuleOperator
  value: string | number
}

export type SegmentRule = TagIncludeRule | TagExcludeRule | FieldRule | CustomFieldRule

export interface RuleGroup {
  operator: GroupOperator
  rules: SegmentRule[]
}

export interface SegmentCriteria {
  operator: GroupOperator
  groups: RuleGroup[]
}

export interface Segment {
  id: string
  name: string
  description?: string
  criteria: SegmentCriteria
  estimated_count?: number
  count_refreshed_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SegmentContact {
  id: string
  first_name?: string
  last_name?: string
  phone_number: string
  email?: string
  is_active: boolean
  is_blocked: boolean
  created_at: string
}

export interface PreviewResult {
  ok: boolean
  count: number
  sample_contacts: { id: string; first_name?: string; last_name?: string; phone_number: string }[]
  error?: string
}

// ── Service ────────────────────────────────────────────────────────────────

export const segmentsService = {
  async listSegments(params?: { search?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.limit != null) query.set("limit", String(params.limit))
    if (params?.offset != null) query.set("offset", String(params.offset))
    const qs = query.toString()
    const { data } = await api.get(`/v1/segments${qs ? `?${qs}` : ""}`)
    return data as { segments: Segment[]; pagination: { total: number; limit: number; offset: number; has_more: boolean } }
  },

  async getSegment(id: string) {
    const { data } = await api.get(`/v1/segments/${id}`)
    return data as Segment
  },

  async createSegment(payload: { name: string; description?: string; criteria: SegmentCriteria }) {
    const { data } = await api.post("/v1/segments", payload)
    return data as { ok: boolean; segment: Segment }
  },

  async updateSegment(id: string, payload: { name?: string; description?: string; criteria?: SegmentCriteria }) {
    const { data } = await api.put(`/v1/segments/${id}`, payload)
    return data as { ok: boolean; segment: Segment }
  },

  async deleteSegment(id: string) {
    const { data } = await api.delete(`/v1/segments/${id}`)
    return data as { ok: boolean }
  },

  async previewCount(criteria: SegmentCriteria) {
    const { data } = await api.post("/v1/segments/preview", { criteria })
    return data as PreviewResult
  },

  async refreshCount(id: string) {
    const { data } = await api.get(`/v1/segments/${id}/count`)
    return data as { ok: boolean; count: number; refreshed_at: string }
  },

  async listSegmentContacts(id: string, params?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams()
    if (params?.limit != null) query.set("limit", String(params.limit))
    if (params?.offset != null) query.set("offset", String(params.offset))
    const qs = query.toString()
    const { data } = await api.get(`/v1/segments/${id}/contacts${qs ? `?${qs}` : ""}`)
    return data as { contacts: SegmentContact[]; pagination: { total: number; limit: number; offset: number; has_more: boolean } }
  },
}
