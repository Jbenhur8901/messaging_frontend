import type { Contact } from "@/types"

const CONTACTS_CACHE_PREFIX = "contacts-cache:v2:"
const DEFAULT_SCOPE = "global"

type CachedContactsPayload = {
  version: 1
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
      version: 1,
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
  pageSize = 5000,
  maxContacts = Number.MAX_SAFE_INTEGER,
}: {
  fetchPage: (limit: number, offset: number) => Promise<ContactsPageResult>
  onProgress?: (loaded: number, total: number | null) => void
  pageSize?: number
  maxContacts?: number
}): Promise<{ contacts: Contact[]; total: number | null; truncated: boolean }> => {
  const allContacts: Contact[] = []
  const seenIds = new Set<string>()
  let offset = 0
  let total: number | null = null

  while (allContacts.length < maxContacts) {
    const { contacts: batch, pagination } = await fetchPage(pageSize, offset)
    if (!batch || batch.length === 0) break

    if (typeof pagination?.total === "number" && total === null) {
      total = pagination.total
    }

    const uniqueBatch = batch.filter((contact) => {
      if (!contact?.id) return true
      if (seenIds.has(contact.id)) return false
      seenIds.add(contact.id)
      return true
    })

    const remaining = maxContacts - allContacts.length
    allContacts.push(...uniqueBatch.slice(0, remaining))

    const pageLimit =
      typeof pagination?.limit === "number" && pagination.limit > 0
        ? pagination.limit
        : batch.length
    if (pageLimit <= 0) break

    const expectedBatchSize = Math.min(pageSize, pageLimit)
    offset += pageLimit

    onProgress?.(allContacts.length, total)

    if (typeof total === "number" && allContacts.length >= total) break
    if (typeof pagination?.total === "number" && offset >= pagination.total) break
    if (batch.length < expectedBatchSize) break
    if (uniqueBatch.length === 0) break
  }

  const truncated = total !== null ? total > maxContacts : allContacts.length >= maxContacts
  return { contacts: allContacts, total, truncated }
}
