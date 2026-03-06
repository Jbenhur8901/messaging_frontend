import { apiJson } from "./api"

// Dedicated API instance for vector-store endpoints (Bearer auth via global interceptors).
const vsApi = apiJson

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
  id?: string
  name?: string
  [key: string]: unknown
}

interface CreateVectorStoreApiResponse {
  success?: boolean
  vector_store?: {
    id?: string
    vector_store_id?: string
    name?: string
    [key: string]: unknown
  }
  vector_store_id?: string
  id?: string
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
    const { data } = await vsApi.post<CreateVectorStoreApiResponse>(
      "/v1/vector-stores",
      { name },
      { headers: { "Content-Type": "application/json" } }
    )

    const nestedVectorStore = data.vector_store
    const vectorStoreId =
      nestedVectorStore?.vector_store_id ||
      data.vector_store_id ||
      nestedVectorStore?.id ||
      data.id

    return {
      ...data,
      ...nestedVectorStore,
      vector_store_id: vectorStoreId || "",
      id: nestedVectorStore?.id || data.id,
      name: nestedVectorStore?.name || data.name || name,
    }
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
