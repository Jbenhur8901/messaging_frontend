import axios from "axios"
import { authStorage } from "@/lib/auth-storage"
import { getStoredActiveOrgId } from "@/services/api"
import { api, apiJson } from "@/services/api"
import type {
  BusinessOperation,
  BusinessOperationType,
  BusinessDocument,
  BusinessDocumentEvent,
  BusinessDocumentStats,
  BusinessDocumentType,
  BusinessWallet,
  BusinessWalletTransaction,
  CardWallet,
  CardWalletWithdrawal,
  CatalogCategory,
  CatalogItem,
  CatalogItemImage,
  CreateCardWalletWithdrawalPayload,
  DeliveryZone,
  FlowPayCardLink,
  FlowPayCollectStatus,
  ImportCatalogPayload,
  Order,
  PaymentMethod,
  UpdateOrderPayload,
} from "@/types/business"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return authStorage.getItem("access_token")
}

export function getActiveWorkspaceId(): string | null {
  return getStoredActiveOrgId()
}

function orgBase(orgId: string) {
  return `/v1/app/organizations/${orgId}/business`
}

function wsBase(wsId: string) {
  return `/v1/app/workspaces/${wsId}/business`
}

function isNotFound(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404
}

async function businessGet<T>(orgId: string, path: string): Promise<T> {
  const urls = [`${wsBase(orgId)}${path}`, `${orgBase(orgId)}${path}`]
  let lastErr: unknown
  for (const url of urls) {
    try {
      const { data } = await api.get<T>(url)
      return data
    } catch (err) {
      lastErr = err
      if (!isNotFound(err)) throw err
    }
  }
  throw lastErr
}

async function businessGetOr<T>(orgId: string, path: string, fallback: T): Promise<T> {
  try {
    return await businessGet<T>(orgId, path)
  } catch (err) {
    if (isNotFound(err)) return fallback
    throw err
  }
}

async function businessPost<T>(orgId: string, path: string, body?: unknown): Promise<T> {
  const urls = [`${wsBase(orgId)}${path}`, `${orgBase(orgId)}${path}`]
  let lastErr: unknown
  for (const url of urls) {
    try {
      const { data } = await apiJson.post<T>(url, body ?? {})
      return data
    } catch (err) {
      lastErr = err
      if (!isNotFound(err)) throw err
    }
  }
  throw lastErr
}

async function businessPatch<T>(orgId: string, path: string, body: unknown): Promise<T> {
  const urls = [`${wsBase(orgId)}${path}`, `${orgBase(orgId)}${path}`]
  let lastErr: unknown
  for (const url of urls) {
    try {
      const { data } = await apiJson.patch<T>(url, body)
      return data
    } catch (err) {
      lastErr = err
      if (!isNotFound(err)) throw err
    }
  }
  throw lastErr
}

async function businessDelete(orgId: string, path: string): Promise<void> {
  const urls = [`${wsBase(orgId)}${path}`, `${orgBase(orgId)}${path}`]
  let lastErr: unknown
  for (const url of urls) {
    try {
      await api.delete(url)
      return
    } catch (err) {
      lastErr = err
      if (!isNotFound(err)) throw err
    }
  }
  throw lastErr
}

function mapCategory(raw: Record<string, unknown>): CatalogCategory {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    description: (raw.description as string) ?? null,
    isActive: raw.is_active !== false,
    sortOrder: (raw.sort_order as number) ?? null,
  }
}

function mapItemImage(raw: Record<string, unknown>): CatalogItemImage {
  return {
    id: String(raw.id),
    url: String(raw.url ?? ""),
    altText: (raw.alt_text as string) ?? null,
    isPrimary: Boolean(raw.is_primary),
    sortOrder: (raw.sort_order as number) ?? null,
  }
}

function mapItem(raw: Record<string, unknown>): CatalogItem {
  const images = Array.isArray(raw.images)
    ? raw.images.map((img) => mapItemImage(img as Record<string, unknown>))
    : []
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    categoryId: (raw.category_id as string) ?? null,
    categoryName: (raw.category_name as string) ?? null,
    itemType: (raw.item_type as string) ?? "product",
    sku: (raw.sku as string) ?? null,
    basePrice: Number(raw.base_price ?? 0),
    currency: (raw.currency as string) ?? "XOF",
    description: (raw.description as string) ?? null,
    imageUrl: (raw.image_url as string) ?? null,
    availabilityStatus: (raw.availability_status as string) ?? "available",
    isActive: raw.is_active !== false,
    customFields: (raw.custom_fields as Record<string, unknown>) ?? null,
    images,
  }
}

function mapZone(raw: Record<string, unknown>): DeliveryZone {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    city: (raw.city as string) ?? null,
    district: (raw.district as string) ?? null,
    isActive: raw.is_active !== false,
  }
}

function mapPaymentMethod(raw: Record<string, unknown>): PaymentMethod {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    paymentType: String(raw.payment_type ?? "custom"),
    provider: (raw.provider as string) ?? null,
    accountReference: (raw.account_reference as string) ?? null,
    instructions: (raw.instructions as string) ?? null,
    requiresPaymentProof: Boolean(raw.requires_payment_proof),
    requiresDeposit: Boolean(raw.requires_deposit),
    qrCode: (raw.qr_code as string) ?? null,
    isActive: raw.is_active !== false,
  }
}

function mapOrderItem(raw: Record<string, unknown>) {
  return {
    name: String(raw.name ?? ""),
    qty: Number(raw.quantity ?? raw.qty ?? 1),
    unitPrice: Number(raw.unit_price ?? 0),
  }
}

function mapOrder(raw: Record<string, unknown>): Order {
  const items = Array.isArray(raw.items)
    ? raw.items.map((item) => mapOrderItem(item as Record<string, unknown>))
    : []
  return {
    id: String(raw.id),
    orderNumber: (raw.order_number as string) ?? null,
    contactId: (raw.contact_id as string) ?? null,
    contactName: (raw.contact_name as string) ?? null,
    contactPhone: (raw.contact_phone as string) ?? null,
    conversationId: (raw.conversation_id as string) ?? null,
    source: (raw.source as string) ?? null,
    status: String(raw.status ?? "pending"),
    paymentStatus: String(raw.payment_status ?? "unpaid"),
    fulfillmentStatus: String(raw.fulfillment_status ?? "incomplete"),
    totalAmount: Number(raw.total_amount ?? 0),
    currency: String(raw.currency ?? "XAF"),
    deliveryAddress: (raw.delivery_address as string) ?? null,
    deliveryType: (raw.delivery_type as string) ?? null,
    deliveryDate: (raw.delivery_date as string) ?? null,
    waitingTime: raw.waiting_time != null ? Number(raw.waiting_time) : null,
    courier: (raw.courier as string) ?? null,
    assignedEmployees: Array.isArray(raw.assigned_employees)
      ? raw.assigned_employees.map(String)
      : [],
    notes: (raw.notes as string) ?? null,
    internalNote: (raw.internal_note as string) ?? null,
    paymentMethodId: (raw.payment_method_id as string) ?? null,
    paymentProofUrl: (raw.payment_proof_url as string) ?? null,
    items,
    createdAt: String(raw.created_at ?? ""),
  }
}

function mapOperation(raw: Record<string, unknown>): BusinessOperation {
  return {
    id: String(raw.id),
    reference: (raw.reference as string) ?? (raw.order_number as string) ?? null,
    operationType: String(raw.operation_type ?? raw.type ?? "other") as BusinessOperationType,
    title: String(raw.title ?? raw.name ?? raw.reference ?? "—"),
    contactName: (raw.contact_name as string) ?? null,
    contactPhone: (raw.contact_phone as string) ?? null,
    status: String(raw.status ?? "pending"),
    amount: raw.amount != null ? Number(raw.amount) : raw.total_amount != null ? Number(raw.total_amount) : null,
    currency: (raw.currency as string) ?? null,
    source: (raw.source as string) ?? null,
    conversationId: (raw.conversation_id as string) ?? null,
    agentId: (raw.agent_id as string) ?? null,
    documentUrl: (raw.document_url as string) ?? (raw.file_url as string) ?? null,
    payload: (raw.payload as Record<string, unknown>) ?? (raw.metadata as Record<string, unknown>) ?? null,
    internalNote: (raw.internal_note as string) ?? null,
    createdAt: String(raw.created_at ?? ""),
    updatedAt: (raw.updated_at as string) ?? null,
  }
}

function unwrapList<T>(data: unknown, mapper: (raw: Record<string, unknown>) => T): T[] {
  if (Array.isArray(data)) return data.map((item) => mapper(item as Record<string, unknown>))
  const obj = data as { data?: unknown[]; items?: unknown[] }
  const list = obj.data ?? obj.items ?? []
  return Array.isArray(list) ? list.map((item) => mapper(item as Record<string, unknown>)) : []
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const method = (options.method ?? "GET").toLowerCase()
  const config = {
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
  }
  if (method === "get") {
    const { data } = await api.get<T>(path, config)
    return data
  }
  if (method === "post") {
    const { data } = await apiJson.post<T>(path, options.body ?? {}, config)
    return data
  }
  if (method === "patch") {
    const { data } = await apiJson.patch<T>(path, options.body ?? {}, config)
    return data
  }
  if (method === "delete") {
    const { data } = await api.delete<T>(path, config)
    return data as T
  }
  throw new Error(`Unsupported method: ${method}`)
}

// ─── Catalog ────────────────────────────────────────────────────────────────

export async function listCatalogCategories(_token: string, wsId: string) {
  const data = await businessGetOr<unknown>(wsId, "/catalog/categories", [])
  return unwrapList(data, mapCategory)
}

export async function createCatalogCategory(_token: string, wsId: string, payload: Record<string, unknown>) {
  const data = await businessPost<Record<string, unknown>>(wsId, "/catalog/categories", payload)
  return mapCategory((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function updateCatalogCategory(_token: string, wsId: string, id: string, payload: Record<string, unknown>) {
  const data = await businessPatch<Record<string, unknown>>(wsId, `/catalog/categories/${id}`, payload)
  return mapCategory((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function deleteCatalogCategory(_token: string, wsId: string, id: string) {
  await businessDelete(wsId, `/catalog/categories/${id}`)
}

export async function listCatalogItems(_token: string, wsId: string) {
  const data = await businessGetOr<unknown>(wsId, "/catalog/items", [])
  return unwrapList(data, mapItem)
}

export async function createCatalogItem(_token: string, wsId: string, payload: Record<string, unknown>) {
  const data = await businessPost<Record<string, unknown>>(wsId, "/catalog/items", payload)
  return mapItem((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function updateCatalogItem(_token: string, wsId: string, id: string, payload: Record<string, unknown>) {
  const data = await businessPatch<Record<string, unknown>>(wsId, `/catalog/items/${id}`, payload)
  return mapItem((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function deleteCatalogItem(_token: string, wsId: string, id: string) {
  await businessDelete(wsId, `/catalog/items/${id}`)
}

export async function importCatalogData(_token: string, wsId: string, payload: ImportCatalogPayload) {
  const data = await businessPost<{ items?: number; categories?: number }>(wsId, "/catalog/import", payload)
  return { items: data.items ?? 0, categories: data.categories ?? 0 }
}

export async function addCatalogItemImage(_token: string, wsId: string, itemId: string, payload: Record<string, unknown>) {
  const data = await businessPost<Record<string, unknown>>(wsId, `/catalog/items/${itemId}/images`, payload)
  return mapItemImage((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function updateCatalogItemImage(_token: string, wsId: string, imageId: string, payload: Record<string, unknown>) {
  const data = await businessPatch<Record<string, unknown>>(wsId, `/catalog/images/${imageId}`, payload)
  return mapItemImage((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function deleteCatalogItemImage(_token: string, wsId: string, imageId: string) {
  await businessDelete(wsId, `/catalog/images/${imageId}`)
}

export async function bulkDeleteCatalogItems(_token: string, wsId: string, ids: string[]) {
  await businessPost(wsId, "/catalog/items/bulk-delete", { ids })
}

export async function bulkDeleteCatalogCategories(_token: string, wsId: string, ids: string[]) {
  await businessPost(wsId, "/catalog/categories/bulk-delete", { ids })
}

export async function bulkDeleteCatalogImages(_token: string, wsId: string, ids: string[]) {
  await businessPost(wsId, "/catalog/images/bulk-delete", { ids })
}

// ─── Delivery zones ─────────────────────────────────────────────────────────

export async function listDeliveryZones(_token: string, wsId: string) {
  const data = await businessGetOr<unknown>(wsId, "/delivery-zones", [])
  return unwrapList(data, mapZone)
}

export async function createDeliveryZone(_token: string, wsId: string, payload: Record<string, unknown>) {
  const data = await businessPost<Record<string, unknown>>(wsId, "/delivery-zones", payload)
  return mapZone((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function updateDeliveryZone(_token: string, wsId: string, id: string, payload: Record<string, unknown>) {
  const data = await businessPatch<Record<string, unknown>>(wsId, `/delivery-zones/${id}`, payload)
  return mapZone((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function deleteDeliveryZone(_token: string, wsId: string, id: string) {
  await businessDelete(wsId, `/delivery-zones/${id}`)
}

// ─── Payment methods ────────────────────────────────────────────────────────

export async function listPaymentMethods(_token: string, wsId: string) {
  const data = await businessGetOr<unknown>(wsId, "/payment-methods", [])
  return unwrapList(data, mapPaymentMethod)
}

export async function createPaymentMethod(_token: string, wsId: string, payload: Record<string, unknown>) {
  const data = await businessPost<Record<string, unknown>>(wsId, "/payment-methods", payload)
  return mapPaymentMethod((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function updatePaymentMethod(_token: string, wsId: string, id: string, payload: Record<string, unknown>) {
  const data = await businessPatch<Record<string, unknown>>(wsId, `/payment-methods/${id}`, payload)
  return mapPaymentMethod((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function deletePaymentMethod(_token: string, wsId: string, id: string) {
  await businessDelete(wsId, `/payment-methods/${id}`)
}

// ─── Operations (AI records) ─────────────────────────────────────────────────

export async function listBusinessOperations(
  _token: string,
  wsId: string,
  params?: { limit?: number; page?: number; type?: BusinessOperationType | "all"; q?: string },
) {
  const search = new URLSearchParams()
  if (params?.limit) search.set("limit", String(params.limit))
  if (params?.page) search.set("page", String(params.page))
  if (params?.type && params.type !== "all") search.set("operation_type", params.type)
  if (params?.q) search.set("q", params.q)
  const qs = search.toString()
  try {
    const data = await businessGet<unknown>(wsId, `/operations${qs ? `?${qs}` : ""}`)
    return unwrapList(data, mapOperation)
  } catch (err) {
    if (!isNotFound(err)) throw err
    try {
      const orders = await listOrders(_token, wsId, { limit: params?.limit ?? 500, page: params?.page ?? 1 })
      return orders.map((order) =>
        mapOperation({
          id: order.id,
          reference: order.orderNumber,
          operation_type: "order",
          title: `Commande #${order.orderNumber || order.id.slice(0, 6)}`,
          contact_name: order.contactName,
          contact_phone: order.contactPhone,
          status: order.status,
          amount: order.totalAmount,
          currency: order.currency,
          source: order.source,
          conversation_id: order.conversationId,
          created_at: order.createdAt,
        }),
      )
    } catch {
      return []
    }
  }
}

export async function deleteBusinessOperation(_token: string, wsId: string, id: string) {
  try {
    await businessDelete(wsId, `/operations/${id}`)
  } catch {
    await deleteOrder(_token, wsId, id)
  }
}

// ─── Documents (generated PDF registry) ─────────────────────────────────────

function mapDocument(raw: Record<string, unknown>): BusinessDocument {
  return {
    id: String(raw.id),
    documentNumber: (raw.document_number as string) ?? null,
    name: String(raw.name ?? raw.title ?? "—"),
    documentType: String(raw.document_type ?? raw.type ?? "other") as BusinessDocumentType,
    status: String(raw.status ?? "generated"),
    fileName: (raw.file_name as string) ?? null,
    filePath: (raw.file_path as string) ?? null,
    mimeType: (raw.mime_type as string) ?? null,
    fileSize: raw.file_size != null ? Number(raw.file_size) : null,
    customerId: (raw.customer_id as string) ?? null,
    customerName: (raw.customer_name as string) ?? (raw.contact_name as string) ?? null,
    agentId: (raw.agent_id as string) ?? null,
    agentName: (raw.agent_name as string) ?? null,
    conversationId: (raw.conversation_id as string) ?? null,
    templateId: (raw.template_id as string) ?? null,
    templateName: (raw.template_name as string) ?? null,
    tariffGridId: (raw.tariff_grid_id as string) ?? null,
    amount: raw.amount != null ? Number(raw.amount) : null,
    currency: (raw.currency as string) ?? null,
    previewUrl: (raw.preview_url as string) ?? (raw.signed_url as string) ?? null,
    downloadUrl: (raw.download_url as string) ?? null,
    metadata: (raw.metadata as Record<string, unknown>) ?? null,
    generatedAt: (raw.generated_at as string) ?? null,
    sentAt: (raw.sent_at as string) ?? null,
    viewedAt: (raw.viewed_at as string) ?? null,
    expiresAt: (raw.expires_at as string) ?? null,
    createdAt: String(raw.created_at ?? raw.generated_at ?? ""),
    updatedAt: (raw.updated_at as string) ?? null,
  }
}

function mapDocumentEvent(raw: Record<string, unknown>): BusinessDocumentEvent {
  return {
    id: String(raw.id),
    documentId: String(raw.document_id ?? ""),
    eventType: String(raw.event_type ?? raw.type ?? "unknown"),
    actorType: (raw.actor_type as string) ?? null,
    actorId: (raw.actor_id as string) ?? null,
    metadata: (raw.metadata as Record<string, unknown>) ?? null,
    createdAt: String(raw.created_at ?? ""),
  }
}

const EMPTY_DOCUMENT_STATS: BusinessDocumentStats = {
  total: 0,
  createdThisMonth: 0,
  sent: 0,
  storageUsedBytes: 0,
}

export async function getBusinessDocumentStats(_token: string, wsId: string): Promise<BusinessDocumentStats> {
  const data = await businessGetOr<Record<string, unknown> | null>(wsId, "/documents/stats", null)
  if (!data) return EMPTY_DOCUMENT_STATS
  const raw = (data as { data?: Record<string, unknown> }).data ?? data
  return {
    total: Number(raw.total ?? 0),
    createdThisMonth: Number(raw.created_this_month ?? raw.createdThisMonth ?? 0),
    sent: Number(raw.sent ?? 0),
    storageUsedBytes: Number(raw.storage_used_bytes ?? raw.storageUsedBytes ?? 0),
  }
}

export async function listBusinessDocuments(
  _token: string,
  wsId: string,
  params?: {
    limit?: number
    page?: number
    document_type?: BusinessDocumentType | "all"
    status?: string
    agent_id?: string
    q?: string
    has_amount?: "yes" | "no"
    period?: "month" | "all"
  },
) {
  const search = new URLSearchParams()
  if (params?.limit) search.set("limit", String(params.limit))
  if (params?.page) search.set("page", String(params.page))
  if (params?.document_type && params.document_type !== "all") {
    search.set("document_type", params.document_type)
  }
  if (params?.status) search.set("status", params.status)
  if (params?.agent_id) search.set("agent_id", params.agent_id)
  if (params?.q) search.set("q", params.q)
  if (params?.has_amount) search.set("has_amount", params.has_amount)
  if (params?.period) search.set("period", params.period)
  const qs = search.toString()
  const data = await businessGetOr<unknown>(wsId, `/documents${qs ? `?${qs}` : ""}`, [])
  return unwrapList(data, mapDocument)
}

export async function getBusinessDocument(_token: string, wsId: string, id: string) {
  const data = await businessGet<Record<string, unknown>>(wsId, `/documents/${id}`)
  const raw = (data as { data?: Record<string, unknown> }).data ?? data
  return mapDocument(raw)
}

export async function listBusinessDocumentEvents(_token: string, wsId: string, documentId: string) {
  const data = await businessGetOr<unknown>(wsId, `/documents/${documentId}/events`, [])
  return unwrapList(data, mapDocumentEvent)
}

export async function getBusinessDocumentDownloadUrl(_token: string, wsId: string, id: string) {
  const data = await businessGet<Record<string, unknown>>(wsId, `/documents/${id}/download-url`)
  const raw = (data as { data?: Record<string, unknown> }).data ?? data
  return String(raw.url ?? raw.download_url ?? raw.signed_url ?? "")
}

export async function archiveBusinessDocument(_token: string, wsId: string, id: string) {
  const data = await businessPatch<Record<string, unknown>>(wsId, `/documents/${id}`, { status: "archived" })
  const raw = (data as { data?: Record<string, unknown> }).data ?? data
  return mapDocument(raw)
}

export async function deleteBusinessDocument(_token: string, wsId: string, id: string) {
  await businessDelete(wsId, `/documents/${id}`)
}

// ─── Orders (legacy) ────────────────────────────────────────────────────────

export async function listOrders(
  _token: string,
  wsId: string,
  params?: { limit?: number; page?: number },
) {
  const search = new URLSearchParams()
  if (params?.limit) search.set("limit", String(params.limit))
  if (params?.page) search.set("page", String(params.page))
  const qs = search.toString()
  const data = await businessGetOr<unknown>(wsId, `/orders${qs ? `?${qs}` : ""}`, [])
  return unwrapList(data, mapOrder)
}

export async function createOrder(_token: string, wsId: string, payload: Record<string, unknown>) {
  const data = await businessPost<Record<string, unknown>>(wsId, "/orders", payload)
  return mapOrder((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function updateOrder(_token: string, wsId: string, id: string, payload: UpdateOrderPayload) {
  const data = await businessPatch<Record<string, unknown>>(wsId, `/orders/${id}`, payload)
  return mapOrder((data as { data?: Record<string, unknown> }).data ?? data)
}

export async function deleteOrder(_token: string, wsId: string, id: string) {
  await businessDelete(wsId, `/orders/${id}`)
}

// ─── Files ──────────────────────────────────────────────────────────────────

export async function uploadWorkspaceFile(_token: string, wsId: string, file: File) {
  const fd = new FormData()
  fd.append("file", file)
  const urls = [`${wsBase(wsId)}/files`, `${orgBase(wsId)}/files`]
  let lastErr: unknown
  for (const url of urls) {
    try {
      const { data } = await api.post<{ url: string }>(url, fd, {
        headers: { Authorization: `Bearer ${_token}` },
      })
      return data
    } catch (err) {
      lastErr = err
      if (!isNotFound(err)) throw err
    }
  }
  throw lastErr
}

// ─── Wallet ─────────────────────────────────────────────────────────────────

const EMPTY_WALLET: BusinessWallet = {
  balance: 0,
  currency: "XAF",
  totalCollected: 0,
  totalWithdrawn: 0,
}

export async function getBusinessWallet(_token: string, wsId: string): Promise<BusinessWallet> {
  const data = await businessGetOr<Record<string, unknown> | null>(wsId, "/wallet", null)
  if (!data) return EMPTY_WALLET
  const raw = (data as { data?: Record<string, unknown> }).data ?? data
  return {
    balance: Number(raw.balance ?? 0),
    currency: String(raw.currency ?? "XAF"),
    totalCollected: Number(raw.total_collected ?? 0),
    totalWithdrawn: Number(raw.total_withdrawn ?? 0),
  }
}

export async function listBusinessWalletTransactions(_token: string, wsId: string): Promise<BusinessWalletTransaction[]> {
  const data = await businessGetOr<unknown>(wsId, "/wallet/transactions", [])
  return unwrapList(data, (raw) => ({
    id: String(raw.id),
    type: String(raw.type ?? "credit"),
    amount: Number(raw.amount ?? 0),
    description: (raw.description as string) ?? null,
    actionName: String(raw.action_name ?? raw.actionName ?? ""),
    balanceBefore: Number(raw.balance_before ?? 0),
    balanceAfter: Number(raw.balance_after ?? 0),
    metadata: (raw.metadata as Record<string, unknown>) ?? null,
    createdAt: String(raw.created_at ?? ""),
  }))
}

export async function requestBusinessWithdrawalOtp(
  _token: string,
  wsId: string,
  payload: { amount: number; operator: string; mobile_money_number: string },
) {
  return businessPost(wsId, "/wallet/withdrawals/otp", payload)
}

export async function createBusinessWithdrawal(
  _token: string,
  wsId: string,
  payload: { amount: number; operator: string; mobile_money_number: string; otp: string },
) {
  return businessPost(wsId, "/wallet/withdrawals", payload)
}

export async function createFlowPayCollectIntent(
  _token: string,
  wsId: string,
  payload: { amount: number; customer_phone: string; operator: string; description?: string },
) {
  const data = await businessPost<{ intent_id: string } & Record<string, unknown>>(wsId, "/flow-pay/collect/intent", payload)
  return { ...data, intentId: String(data.intent_id ?? data.intentId ?? "") }
}

export async function confirmFlowPayCollect(_token: string, wsId: string, intentId: string) {
  const data = await businessPost<Record<string, unknown>>(wsId, `/flow-pay/collect/${intentId}/confirm`, {})
  return {
    id: String(data.id ?? intentId),
    status: String(data.status ?? "processing"),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "XAF"),
    customerPhone: (data.customer_phone as string) ?? null,
    operator: (data.operator as string) ?? null,
    failureMessage: (data.failure_message as string) ?? null,
  } as FlowPayCollectStatus
}

export async function getFlowPayCollectStatus(_token: string, wsId: string, paymentId: string) {
  const data = await businessGet<Record<string, unknown>>(wsId, `/flow-pay/collect/${paymentId}`)
  const raw = (data as { data?: Record<string, unknown> }).data ?? data
  return {
    id: String(raw.id ?? paymentId),
    status: String(raw.status ?? "processing"),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "XAF"),
    customerPhone: (raw.customer_phone as string) ?? null,
    operator: (raw.operator as string) ?? null,
    failureMessage: (raw.failure_message as string) ?? null,
  } as FlowPayCollectStatus
}

export async function createFlowPayCardLink(
  _token: string,
  wsId: string,
  payload: { amount: number; description?: string },
) {
  const data = await businessPost<Record<string, unknown>>(wsId, "/flow-pay/card-link", payload)
  const raw = (data as { data?: Record<string, unknown> }).data ?? data
  return {
    checkoutUrl: String(raw.checkout_url ?? raw.checkoutUrl ?? ""),
    amount: Number(raw.amount ?? payload.amount),
    currency: String(raw.currency ?? "XAF"),
  } as FlowPayCardLink
}

export async function getFlowPayCardLinkStatus(_token: string, wsId: string, linkId: string) {
  return businessGet(wsId, `/flow-pay/card-link/${linkId}`)
}

export async function getCardWallet(_token: string, wsId: string): Promise<CardWallet | null> {
  const data = await businessGetOr<Record<string, unknown> | null>(wsId, "/card-wallet", null)
  if (!data) return null
  const raw = (data as { data?: Record<string, unknown> }).data ?? data
  return {
    balance: Number(raw.balance ?? 0),
    currency: String(raw.currency ?? "XAF"),
    totalCollected: Number(raw.total_collected ?? 0),
    totalWithdrawn: Number(raw.total_withdrawn ?? 0),
  }
}

export async function listCardWalletWithdrawals(_token: string, wsId: string): Promise<CardWalletWithdrawal[]> {
  const data = await businessGetOr<unknown>(wsId, "/card-wallet/withdrawals", [])
  return unwrapList(data, (raw) => ({
    id: String(raw.id),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "XAF"),
    method: String(raw.method ?? "bank_transfer"),
    status: String(raw.status ?? "pending"),
    adminNote: (raw.admin_note as string) ?? null,
    createdAt: String(raw.created_at ?? ""),
  }))
}

export async function createCardWalletWithdrawal(
  _token: string,
  wsId: string,
  payload: CreateCardWalletWithdrawalPayload,
) {
  return businessPost(wsId, "/card-wallet/withdrawals", payload)
}

export const businessService = {
  getToken,
  getActiveWorkspaceId,
  listBusinessOperations,
  deleteBusinessOperation,
  listBusinessDocuments,
  getBusinessDocumentStats,
  getBusinessDocument,
  deleteBusinessDocument,
}
