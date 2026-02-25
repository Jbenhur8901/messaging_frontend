import axios from "axios"
import { authStorage } from "@/lib/auth-storage"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Helper to get stored API key
function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null
  try {
    const storedAuth = authStorage.getItem("auth-storage")
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth)
      const storedKey = parsed.state?.apiKey
      if (typeof storedKey === "string" && storedKey.length > 0) return storedKey
    }
  } catch { /* ignore */ }
  try {
    const user = authStorage.getItem("user")
    if (user) {
      const parsedUser = JSON.parse(user)
      const apiKey = parsedUser.api_key
      if (typeof apiKey === "string") return apiKey
      if (apiKey && typeof apiKey === "object" && typeof apiKey.key === "string") return apiKey.key
    }
  } catch { /* ignore */ }
  return null
}

// Dedicated axios instance for vector-store endpoints: X-API-Key only, no JWT
const vsApi = axios.create({ baseURL: API_BASE_URL })

vsApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const apiKey = getStoredApiKey()
    if (apiKey) {
      config.headers["X-API-Key"] = apiKey
    }
    // No Authorization Bearer header for vector-store endpoints
  }
  config.headers["Accept"] = "application/json"
  return config
})

// ── Types ──

export interface VectorStoreItem {
  id: string
  vector_store_id: string
  name: string
  organization_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface VectorStoreFileItem {
  id: string
  file_id: string
  yanola_file_id?: string
  filename: string
  file_size?: number | null
  file_type?: string | null
  source_url?: string | null
  created_at: string
  [key: string]: unknown
}

export interface VectorStoreResult {
  vector_store_id: string
  name?: string
  [key: string]: unknown
}

export interface UploadFilesResult {
  success: boolean
  files?: Array<{
    id: string
    file_id: string
    yanola_file_id?: string
    filename: string
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export interface Pagination {
  total: number
  limit: number
  offset: number
}

// ── Service ──

export const aiToolsService = {
  // POST /v1/vector-stores  (JSON body — backend generates vector_store_id)
  async createVectorStore(name: string): Promise<VectorStoreResult> {
    const { data } = await vsApi.post<VectorStoreResult>(
      "/v1/vector-stores",
      { name },
      { headers: { "Content-Type": "application/json" } }
    )
    return data
  },

  // GET /v1/vector-stores
  async listVectorStores(
    limit = 50,
    offset = 0
  ): Promise<{ vector_stores: VectorStoreItem[]; pagination: Pagination }> {
    const { data } = await vsApi.get<{ vector_stores: VectorStoreItem[]; pagination: Pagination }>(
      "/v1/vector-stores",
      { params: { limit, offset } }
    )
    return data
  },

  // POST /v1/vector-stores/:id/files  (multipart/form-data with repeated `files` fields)
  async uploadFiles(
    vectorStoreId: string,
    files: File[]
  ): Promise<UploadFilesResult> {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append("files", file)
    })
    const { data } = await vsApi.post<UploadFilesResult>(
      `/v1/vector-stores/${vectorStoreId}/files`,
      formData
    )
    return data
  },

  // GET /v1/vector-stores/:id/files
  async listFiles(
    vectorStoreId: string,
    limit = 50,
    offset = 0
  ): Promise<{ files: VectorStoreFileItem[]; pagination: Pagination }> {
    const { data } = await vsApi.get<{ files: VectorStoreFileItem[]; pagination: Pagination }>(
      `/v1/vector-stores/${vectorStoreId}/files`,
      { params: { limit, offset } }
    )
    return data
  },

  // DELETE /v1/vector-stores/:id
  async deleteVectorStore(vectorStoreId: string): Promise<{ success: boolean }> {
    const { data } = await vsApi.delete<{ success: boolean }>(
      `/v1/vector-stores/${vectorStoreId}`
    )
    return data
  },

  // DELETE /v1/vector-stores/:vsId/files/:fileId  (use yanola_file_id in priority)
  async deleteFileFromVectorStore(
    vectorStoreId: string,
    fileId: string
  ): Promise<{ success: boolean }> {
    const { data } = await vsApi.delete<{ success: boolean }>(
      `/v1/vector-stores/${vectorStoreId}/files/${fileId}`
    )
    return data
  },
}
