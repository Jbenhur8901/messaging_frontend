import { authStorage } from "@/lib/auth-storage"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const MAX_MEDIA_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_MEDIA_SIZE_MB || "10")

export interface MediaUploadResponse {
  success: boolean
  media_id: string
  file_handle: string
  upload_session_id: string
  file_name: string
  file_type: string
  file_size: number
}

export const uploadMediaToBackend = async (file: File): Promise<MediaUploadResponse> => {
  const maxBytes = MAX_MEDIA_SIZE_MB * 1024 * 1024
  if (Number.isFinite(maxBytes) && file.size > maxBytes) {
    throw new Error(`Le fichier dépasse ${MAX_MEDIA_SIZE_MB}MB`)
  }

  const formData = new FormData()
  formData.append("file", file)

  const token = authStorage.getItem("access_token")

  const response = await fetch(`${API_BASE_URL}/v1/app/whatsapp/media/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || "Upload impossible")
  }

  const data = (await response.json()) as MediaUploadResponse
  if (!data.success) {
    throw new Error("Upload impossible")
  }
  return data
}
