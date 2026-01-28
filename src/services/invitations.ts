import axios from "axios"
import { api } from "./api"
import type { OrganizationInvitation, OrganizationRole } from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const invitationsService = {
  // Get invitation details (public endpoint - no auth required)
  async getInvitation(token: string): Promise<OrganizationInvitation> {
    const { data } = await axios.get(`${API_BASE_URL}/v1/invitations/${token}`)
    return data
  },

  // Accept an invitation (requires auth)
  async acceptInvitation(token: string): Promise<{
    success: boolean
    organization_id: string
    organization_name: string
    role: OrganizationRole
  }> {
    const formData = new URLSearchParams()
    formData.append("token", token)
    const { data } = await api.post("/v1/invitations/accept", formData)
    return data
  },
}
