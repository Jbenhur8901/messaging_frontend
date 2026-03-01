import { api } from "./api"
import type {
  Organization,
  OrganizationSummary,
  OrganizationRole,
  OrganizationMember,
  OrganizationInvitation,
} from "@/types"

export const organizationsService = {
  // Organization CRUD
  async createOrganization(name: string): Promise<{ success: boolean; organization: Organization }> {
    const formData = new URLSearchParams()
    formData.append("name", name)
    const { data } = await api.post("/v1/organizations", formData)
    return data
  },

  async getOrganizations(): Promise<{ organizations: OrganizationSummary[] }> {
    const { data } = await api.get("/v1/organizations")
    return data
  },

  async switchOrganization(orgId: string): Promise<{ success: boolean; organization_id?: string; active_org_id?: string }> {
    const { data } = await api.post(`/v1/organizations/${orgId}/switch`)
    return data
  },

  async getOrganization(orgId: string): Promise<Organization> {
    const { data } = await api.get(`/v1/organizations/${orgId}`)
    return data
  },

  async updateOrganization(orgId: string, name: string): Promise<{ success: boolean; organization: Organization }> {
    const formData = new URLSearchParams()
    formData.append("name", name)
    const { data } = await api.put(`/v1/organizations/${orgId}`, formData)
    return data
  },

  async deleteOrganization(orgId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/v1/organizations/${orgId}`)
    return data
  },

  // Member management
  async inviteMember(
    orgId: string,
    email: string,
    role: OrganizationRole
  ): Promise<{ success: boolean; invitation: OrganizationInvitation }> {
    const formData = new URLSearchParams()
    formData.append("email", email)
    formData.append("role", role)
    const { data } = await api.post(`/v1/organizations/${orgId}/members/invite`, formData)
    return data
  },

  async getMembers(orgId: string): Promise<{ members: OrganizationMember[] }> {
    const { data } = await api.get(`/v1/organizations/${orgId}/members`)
    return data
  },

  async updateMemberRole(
    orgId: string,
    memberId: string,
    role: OrganizationRole
  ): Promise<{ success: boolean; member: OrganizationMember }> {
    const formData = new URLSearchParams()
    formData.append("role", role)
    const { data } = await api.put(`/v1/organizations/${orgId}/members/${memberId}`, formData)
    return data
  },

  async removeMember(orgId: string, memberId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/v1/organizations/${orgId}/members/${memberId}`)
    return data
  },
}
