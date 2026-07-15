import { api } from "./api"

// ── Types ──────────────────────────────────────────────────────────────────

export type TriggerType = "tag_added" | "no_reply" | "scheduled"
export type StepType = "wait" | "send_message" | "add_tag" | "remove_tag" | "end"
export type EnrollmentStatus = "active" | "waiting" | "completed" | "exited" | "failed"

export interface AutomationStep {
  id?: string
  step_order?: number
  step_type: StepType
  step_config: Record<string, unknown>
}

export interface Automation {
  id: string
  name: string
  description?: string
  is_active: boolean
  trigger_type: TriggerType
  trigger_config: Record<string, unknown>
  segment_id?: string
  allow_reentry: boolean
  reentry_days?: number
  total_enrolled: number
  total_completed: number
  total_exited: number
  steps?: AutomationStep[]
  created_at: string
  updated_at: string
}

export interface AutomationEnrollment {
  id: string
  contact_id: string
  automation_id: string
  status: EnrollmentStatus
  current_step_order: number
  next_step_at?: string
  enrolled_via: string
  enrolled_at: string
  completed_at?: string
  error_count: number
  last_error?: string
  contacts?: { first_name?: string; last_name?: string; phone_number: string }
}

// ── Service ────────────────────────────────────────────────────────────────

export const automationsService = {
  async listAutomations(params?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams()
    if (params?.limit != null) query.set("limit", String(params.limit))
    if (params?.offset != null) query.set("offset", String(params.offset))
    const qs = query.toString()
    const { data } = await api.get(`/v1/automations${qs ? `?${qs}` : ""}`)
    return data as { automations: Automation[]; pagination: { total: number; limit: number; offset: number; has_more: boolean } }
  },

  async getAutomation(id: string) {
    const { data } = await api.get(`/v1/automations/${id}`)
    return data as Automation
  },

  async createAutomation(payload: {
    name: string
    description?: string
    trigger_type: TriggerType
    trigger_config: Record<string, unknown>
    steps: Omit<AutomationStep, "id" | "step_order">[]
    segment_id?: string
    allow_reentry?: boolean
    reentry_days?: number
  }) {
    const { data } = await api.post("/v1/automations", payload)
    return data as { ok: boolean; automation: Automation }
  },

  async updateAutomation(id: string, payload: Partial<{
    name: string
    description: string
    trigger_type: TriggerType
    trigger_config: Record<string, unknown>
    steps: Omit<AutomationStep, "id" | "step_order">[]
    segment_id: string
    allow_reentry: boolean
    reentry_days: number
    is_active: boolean
  }>) {
    const { data } = await api.put(`/v1/automations/${id}`, payload)
    return data as { ok: boolean; automation: Automation }
  },

  async deleteAutomation(id: string) {
    const { data } = await api.delete(`/v1/automations/${id}`)
    return data as { ok: boolean }
  },

  async activateAutomation(id: string) {
    const { data } = await api.post(`/v1/automations/${id}/activate`, {})
    return data as { ok: boolean }
  },

  async deactivateAutomation(id: string) {
    const { data } = await api.post(`/v1/automations/${id}/deactivate`, {})
    return data as { ok: boolean }
  },

  async listEnrollments(id: string, params?: { status?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams()
    if (params?.status) query.set("status", params.status)
    if (params?.limit != null) query.set("limit", String(params.limit))
    if (params?.offset != null) query.set("offset", String(params.offset))
    const qs = query.toString()
    const { data } = await api.get(`/v1/automations/${id}/enrollments${qs ? `?${qs}` : ""}`)
    return data as { enrollments: AutomationEnrollment[]; pagination: { total: number; limit: number; offset: number; has_more: boolean } }
  },

  async cancelEnrollment(automationId: string, enrollmentId: string) {
    const { data } = await api.delete(`/v1/automations/${automationId}/enrollments/${enrollmentId}`)
    return data as { ok: boolean }
  },

  async manualEnroll(automationId: string, contact_ids: string[]) {
    const { data } = await api.post(`/v1/automations/${automationId}/enroll`, { contact_ids })
    return data as { ok: boolean; enrolled: number; skipped: number }
  },
}
