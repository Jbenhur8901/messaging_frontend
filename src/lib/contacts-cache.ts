import type { Contact } from "@/types"

const CONTACTS_CACHE_PREFIX = "contacts-cache:v4:"
const DEFAULT_SCOPE = "global"

type CachedContactsPayload = {
  version: 3
  cached_at: number
  contacts: Contact[]
}

type ContactsPageResult = {
  contacts: Contact[]
  pagination?: {
    total?: number
    has_more?: boolean
    limit?: number
  }
}

const getScope = (organizationId?: string | null): string => {
  if (!organizationId) return DEFAULT_SCOPE
  const trimmed = organizationId.trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_SCOPE
}

const getCacheKey = (organizationId?: string | null): string =>
  `${CONTACTS_CACHE_PREFIX}${getScope(organizationId)}`

export const getCachedContacts = (organizationId?: string | null): Contact[] | null => {
  if (typeof window === "undefined") return null

  try {
    const raw = localStorage.getItem(getCacheKey(organizationId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedContactsPayload
    if (!parsed || !Array.isArray(parsed.contacts)) return null
    return parsed.contacts
  } catch {
    return null
  }
}

export const setCachedContacts = (contacts: Contact[], organizationId?: string | null): void => {
  if (typeof window === "undefined") return

  try {
    const payload: CachedContactsPayload = {
      version: 3,
      cached_at: Date.now(),
      contacts,
    }
    localStorage.setItem(getCacheKey(organizationId), JSON.stringify(payload))
  } catch {
    // Ignore storage errors.
  }
}

export const clearCachedContacts = (organizationId?: string | null): void => {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(getCacheKey(organizationId))
  } catch {
    // Ignore storage errors.
  }
}

export const clearAllCachedContacts = (): void => {
  if (typeof window === "undefined") return

  try {
    const keysToDelete: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CONTACTS_CACHE_PREFIX)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore storage errors.
  }
}

export const fetchAllContactsPaged = async ({
  fetchPage,
  onProgress,
  onBatch,
  pageSize = 5000,
  maxContacts = Number.MAX_SAFE_INTEGER,
}: {
  fetchPage: (limit: number, offset: number) => Promise<ContactsPageResult>
  onProgress?: (loaded: number, total: number | null) => void
  onBatch?: (contacts: Contact[], total: number | null) => void
  pageSize?: number
  maxContacts?: number
}): Promise<{ contacts: Contact[]; total: number | null; truncated: boolean }> => {
  const allContacts: Contact[] = []
  let offset = 0
  let total: number | null = null

  while (allContacts.length < maxContacts) {
    const { contacts: batch, pagination } = await fetchPage(pageSize, offset)
    if (!batch || batch.length === 0) break

    if (typeof pagination?.total === "number" && total === null) {
      total = pagination.total
    }

    const remaining = maxContacts - allContacts.length
    allContacts.push(...batch.slice(0, remaining))

    // Advance by the number of contacts actually returned.
    // Some APIs cap the response size server-side but still echo the requested
    // limit in pagination, which would otherwise skip pages.
    offset += batch.length

    onProgress?.(allContacts.length, total)
    onBatch?.([...allContacts], total)

    if (typeof total === "number" && allContacts.length >= total) break
    if (typeof pagination?.total === "number" && offset >= pagination.total) break
    if (pagination?.has_more === false && typeof total !== "number") break
    if (
      typeof pagination?.total !== "number" &&
      pagination?.has_more !== true &&
      batch.length < pageSize
    ) {
      break
    }
  }

  const truncated = total !== null ? total > maxContacts : allContacts.length >= maxContacts
  return { contacts: allContacts, total, truncated }
}
