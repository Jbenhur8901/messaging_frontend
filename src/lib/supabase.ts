import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const BUCKET = process.env.NEXT_PUBLIC_MEDIA_UPLOAD_BUCKET || "mms-media"
const MAX_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_MEDIA_SIZE_MB || "50")

export async function uploadMediaToSupabase(file: File): Promise<string> {
  const maxBytes = MAX_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error(`Le fichier dépasse ${MAX_SIZE_MB} MB`)
  }

  const ext = file.name.split(".").pop() || "bin"
  const path = `campaigns/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) {
    throw new Error(error.message || "Échec de l'upload")
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}
