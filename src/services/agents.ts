import { api, apiJson } from "./api"

export type AgentChannel = "whatsapp" | "email" | "sms" | "web"

export interface Agent {
  id: string
  name: string
  slug: string
  description?: string | null
  channel: AgentChannel
  is_active?: boolean
  ai_enabled?: boolean
  ai_instructions?: string | null
  ai_model: string
  ai_temperature: string
  ai_timeline?: string | null
  ai_tools: string[]
  ai_vector_store_ids: string[]
  created_at: string
  updated_at?: string
  _workspace_config?: {
    custom_name?: string | null
    custom_instructions?: string | null
    custom_model?: string | null
    custom_temperature?: string | null
    custom_tools?: string[] | null
    custom_vector_store_ids?: string[] | null
  }
}

export interface AgentDocument {
  id?: string
  upload_id?: string
  public_url?: string | null
  file_name: string
  mime_type?: string | null
  metadata?: {
    title?: string
    use_case?: string
    description?: string
    [key: string]: unknown
  } | null
  size?: number | null
  created_at?: string
}

export interface AgentPagination {
  total: number
  limit: number
  offset: number
  has_more?: boolean
}

export interface AgentUpdatePayload {
  name?: string
  description?: string
  is_active?: boolean
  ai_enabled?: boolean
  ai_instructions?: string
  ai_model?: string
  ai_timeline?: string
  ai_temperature?: string
  ai_tools?: string[]
  ai_vector_store_ids?: string[]
}

const normalizeAgent = (agent: Agent): Agent => ({
  ...agent,
  ai_tools: Array.isArray(agent.ai_tools) ? agent.ai_tools : [],
  ai_vector_store_ids: Array.isArray(agent.ai_vector_store_ids) ? agent.ai_vector_store_ids : [],
})

const unwrapAgent = (data: unknown): Agent | null => {
  const root = data as { data?: Agent | null }
  return root.data ? normalizeAgent(root.data) : null
}

export const agentsService = {
  async listAgents(): Promise<Agent[]> {
    const { data } = await api.get<{ data: Agent[] }>("/v1/agents")
    return (data.data || []).map(normalizeAgent)
  },

  async getActiveAgent(): Promise<Agent | null> {
    const { data } = await api.get<{ data: Agent | null }>("/v1/agents/active")
    return unwrapAgent(data)
  },

  async getAgent(agentId: string): Promise<Agent> {
    const { data } = await api.get<{ data: Agent }>(`/v1/agents/${agentId}`)
    const agent = unwrapAgent(data)
    if (!agent) throw new Error("Agent introuvable")
    return agent
  },

  async updateAgent(agentId: string, payload: AgentUpdatePayload): Promise<Agent> {
    const { data } = await apiJson.patch<{ ok: boolean; data: Agent }>(`/v1/agents/${agentId}`, payload)
    const agent = unwrapAgent(data)
    if (!agent) throw new Error("Agent introuvable")
    return agent
  },

  async activateAgent(agentId: string): Promise<Agent> {
    const { data } = await api.post<{ ok: boolean; message: string; data: Agent }>(
      `/v1/agents/${agentId}/activate`
    )
    return normalizeAgent(data.data)
  },

  async deactivateActiveAgent(): Promise<{ ok: boolean; message: string }> {
    const { data } = await api.delete<{ ok: boolean; message: string }>("/v1/agents/active")
    return data
  },

  async getAgentByIdOrSlug(idOrSlug: string): Promise<Agent> {
    try {
      return await this.getAgent(idOrSlug)
    } catch {
      // Slugs are resolved from the catalogue below.
    }
    const agents = await this.listAgents()
    const agent = agents.find((item) => item.id === idOrSlug || item.slug === idOrSlug)
    if (!agent) throw new Error("Agent introuvable")
    return this.getAgent(agent.id).catch(() => agent)
  },

  async getTools(agentId: string): Promise<string[]> {
    const { data } = await api.get<{ data: { agent_id: string; ai_tools: string[] } }>(
      `/v1/agents/${agentId}/tools`
    )
    return data.data?.ai_tools || []
  },

  async updateTools(agentId: string, aiTools: string[]): Promise<string[]> {
    const { data } = await apiJson.put<{ ok: boolean; data: { agent_id: string; ai_tools: string[] } }>(
      `/v1/agents/${agentId}/tools`,
      { ai_tools: aiTools }
    )
    return data.data?.ai_tools || []
  },

  async listDocuments(
    agentId: string,
    limit = 50,
    offset = 0
  ): Promise<{ documents: AgentDocument[]; pagination: AgentPagination }> {
    const { data } = await api.get<{ documents: AgentDocument[]; pagination: AgentPagination }>(
      `/v1/agents/${agentId}/documents`,
      { params: { limit, offset } }
    )
    return data
  },

  async uploadDocument(
    agentId: string,
    file: File,
    metadata: { title?: string; use_case?: string; description?: string } = {}
  ): Promise<AgentDocument> {
    const formData = new FormData()
    formData.append("file", file)
    if (metadata.title) formData.append("title", metadata.title)
    if (metadata.use_case) formData.append("use_case", metadata.use_case)
    if (metadata.description) formData.append("description", metadata.description)

    const { data } = await api.post<{ ok: boolean; data: AgentDocument }>(
      `/v1/agents/${agentId}/documents`,
      formData
    )
    return data.data
  },

  async deleteDocument(agentId: string, uploadId: string): Promise<{ ok: boolean; message: string }> {
    const { data } = await api.delete<{ ok: boolean; message: string }>(
      `/v1/agents/${agentId}/documents/${uploadId}`
    )
    return data
  },
}
