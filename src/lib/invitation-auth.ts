export const INVITATION_TOKEN_SESSION_KEY = "invitation_token"
export const INVITATION_ACCEPTED_SESSION_KEY = "invitation_accepted"
export const PENDING_INVITATION_TOKEN_KEY = "pending_invitation_token"

export function setPendingInvitationToken(token: string): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(INVITATION_TOKEN_SESSION_KEY, token)
}

export function getPendingInvitationToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(INVITATION_TOKEN_SESSION_KEY)
}

export function savePersistentInvitationToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PENDING_INVITATION_TOKEN_KEY, token)
}

export function getPersistentInvitationToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(PENDING_INVITATION_TOKEN_KEY)
}

export function clearPersistentInvitationToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(PENDING_INVITATION_TOKEN_KEY)
}

export function clearPendingInvitationToken(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(INVITATION_TOKEN_SESSION_KEY)
  sessionStorage.removeItem(INVITATION_ACCEPTED_SESSION_KEY)
}

export function clearAllInvitationTokens(): void {
  clearPendingInvitationToken()
  clearPersistentInvitationToken()
}

export function markInvitationAccepted(): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(INVITATION_ACCEPTED_SESSION_KEY, "1")
  clearPersistentInvitationToken()
}

export function wasInvitationAccepted(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(INVITATION_ACCEPTED_SESSION_KEY) === "1"
}

export function extractInvitationTokenFromPath(path?: string | null): string | null {
  if (!path) return null
  const match = path.match(/\/invitations?\/([^/?#]+)/i)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function resolveInvitationToken(explicitToken?: string | null): string | undefined {
  return (
    explicitToken ||
    getPendingInvitationToken() ||
    getPersistentInvitationToken() ||
    undefined
  )
}
