import { createClient } from "@supabase/supabase-js"
import { authStorage } from "@/lib/auth-storage"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type SupabaseClientType = ReturnType<typeof createClient>

let cachedClient: SupabaseClientType | null | undefined

export function getSupabaseClient(): SupabaseClientType | null {
  if (cachedClient !== undefined) return cachedClient

  if (!supabaseUrl || !supabaseAnonKey) {
    cachedClient = null
    return cachedClient
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey)
  return cachedClient
}

export async function syncSupabaseSession(session?: {
  access_token: string
  refresh_token: string
} | null) {
  if (typeof window === "undefined") return
  if (!session?.access_token || !session.refresh_token) return
  const supabase = getSupabaseClient()
  if (!supabase) return
  try {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  } catch {
    // Keep frontend usable even if Supabase session sync fails.
  }
}

if (typeof window !== "undefined") {
  const supabase = getSupabaseClient()
  if (supabase) {
    supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) {
      authStorage.setItem("access_token", session.access_token)
    } else {
      authStorage.removeItem("access_token")
    }

    if (session?.refresh_token) {
      authStorage.setItem("refresh_token", session.refresh_token)
    } else {
      authStorage.removeItem("refresh_token")
    }
    })
  }
}

const BUCKET = process.env.NEXT_PUBLIC_MEDIA_UPLOAD_BUCKET || "mms-media"
const MAX_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_MEDIA_SIZE_MB || "50")

export async function uploadMediaToSupabase(file: File): Promise<string> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error(
      "Supabase n'est pas configuré. Définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."
    )
  }

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
