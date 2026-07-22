import { authStorage } from "@/lib/auth-storage"
import { getSupabaseClient, syncSupabaseSession } from "@/lib/supabase"

export function getPasswordResetRedirectUrl(): string {
  if (typeof window === "undefined") return "/auth/reset-password"
  return `${window.location.origin}/auth/reset-password`
}

export async function establishRecoverySession(): Promise<boolean> {
  if (typeof window === "undefined") return false

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  const searchParams = new URLSearchParams(window.location.search)

  const accessToken =
    hashParams.get("access_token") ?? searchParams.get("access_token")
  const refreshToken =
    hashParams.get("refresh_token") ?? searchParams.get("refresh_token")
  const code = searchParams.get("code")

  if (accessToken && refreshToken) {
    authStorage.setItem("access_token", accessToken)
    authStorage.setItem("refresh_token", refreshToken)
    await syncSupabaseSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    window.history.replaceState({}, document.title, window.location.pathname)
    return true
  }

  if (code) {
    const supabase = getSupabaseClient()
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data.session) {
        authStorage.setItem("access_token", data.session.access_token)
        authStorage.setItem("refresh_token", data.session.refresh_token)
        await syncSupabaseSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        window.history.replaceState({}, document.title, window.location.pathname)
        return true
      }
    }
  }

  return !!authStorage.getItem("access_token")
}
