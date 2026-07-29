import { createClient } from "@supabase/supabase-js"
import { authStorage } from "@/lib/auth-storage"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type SupabaseClientType = ReturnType<typeof createClient>

let cachedClient: SupabaseClientType | null | undefined
let authListenerRegistered = false

function isStaleRefreshTokenError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes("invalid refresh token") || lower.includes("already used")
}

function clearLegacySupabaseStorage() {
  if (typeof window === "undefined") return
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      localStorage.removeItem(key)
    }
  }
}

function registerAuthListener(supabase: SupabaseClientType) {
  if (authListenerRegistered || typeof window === "undefined") return
  authListenerRegistered = true

  supabase.auth.onAuthStateChange((event, session) => {
    // Tokens are refreshed only via the Flow API — ignore Supabase refresh events.
    if (event === "TOKEN_REFRESHED") return

    if (session?.access_token) {
      authStorage.setItem("access_token", session.access_token)
    }
    if (session?.refresh_token) {
      authStorage.setItem("refresh_token", session.refresh_token)
    }
  })
}

export function getSupabaseClient(): SupabaseClientType | null {
  if (cachedClient !== undefined) return cachedClient

  if (!supabaseUrl || !supabaseAnonKey) {
    cachedClient = null
    return cachedClient
  }

  clearLegacySupabaseStorage()

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  registerAuthListener(cachedClient)
  return cachedClient
}

export async function clearSupabaseSession(): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return
  try {
    await supabase.auth.signOut({ scope: "local" })
  } catch {
    // Ignore — local session cleanup is best-effort.
  }
  clearLegacySupabaseStorage()
}

export async function syncSupabaseSession(session?: {
  access_token: string
  refresh_token: string
} | null) {
  if (typeof window === "undefined") return
  if (!session?.access_token || !session.refresh_token) return

  const supabase = getSupabaseClient()
  if (!supabase) return

  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })

  if (error && isStaleRefreshTokenError(error.message)) {
    await clearSupabaseSession()
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

  const accessToken = authStorage.getItem("access_token")
  const refreshToken = authStorage.getItem("refresh_token")
  if (accessToken && refreshToken) {
    await syncSupabaseSession({ access_token: accessToken, refresh_token: refreshToken })
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
