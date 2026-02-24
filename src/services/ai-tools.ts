import { api } from "./api"

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
  files?: Array<{ file_id: string; filename: string; [key: string]: unknown }>
  [key: string]: unknown
}

export interface Pagination {
  total: number
  limit: number
  offset: number
}

export const aiToolsService = {
  // POST /v1/vector-stores
  async createVectorStore(name?: string): Promise<VectorStoreResult> {
    const formData = new FormData()
    if (name) formData.append("name", name)
    const { data } = await api.post<VectorStoreResult>(
      "/v1/vector-stores",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
    return data
  },

  // GET /v1/vector-stores
  async listVectorStores(
    limit = 50,
    offset = 0
  ): Promise<{ vector_stores: VectorStoreItem[]; pagination: Pagination }> {
    const { data } = await api.get<{ vector_stores: VectorStoreItem[]; pagination: Pagination }>(
      "/v1/vector-stores",
      { params: { limit, offset } }
    )
    return data
  },

  // POST /v1/vector-stores/:id/files
  async uploadFiles(
    vectorStoreId: string,
    files?: File[],
    fileUrls?: string
  ): Promise<UploadFilesResult> {
    const formData = new FormData()
    if (files) {
      for (const file of files) {
        formData.append("files", file)
      }
    }
    if (fileUrls) {
      formData.append("file_urls", fileUrls)
    }
    const { data } = await api.post<UploadFilesResult>(
      `/v1/vector-stores/${vectorStoreId}/files`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
    return data
  },

  // GET /v1/vector-stores/:id/files
  async listFiles(
    vectorStoreId: string,
    limit = 50,
    offset = 0
  ): Promise<{ files: VectorStoreFileItem[]; pagination: Pagination }> {
    const { data } = await api.get<{ files: VectorStoreFileItem[]; pagination: Pagination }>(
      `/v1/vector-stores/${vectorStoreId}/files`,
      { params: { limit, offset } }
    )
    return data
  },

  // DELETE /v1/vector-stores/:id
  async deleteVectorStore(vectorStoreId: string): Promise<{ success: boolean }> {
    const { data } = await api.delete<{ success: boolean }>(
      `/v1/vector-stores/${vectorStoreId}`
    )
    return data
  },

  // DELETE /v1/vector-stores/:vsId/files/:fileId
  async deleteFileFromVectorStore(
    vectorStoreId: string,
    fileId: string
  ): Promise<{ success: boolean }> {
    const { data } = await api.delete<{ success: boolean }>(
      `/v1/vector-stores/${vectorStoreId}/files/${fileId}`
    )
    return data
  },
}
