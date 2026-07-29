export type BusinessOperationType =
  | "quote"
  | "form"
  | "rtc"
  | "order"
  | "invoice"
  | "document"
  | "other"

export interface BusinessOperation {
  id: string
  reference?: string | null
  operationType: BusinessOperationType
  title: string
  contactName?: string | null
  contactPhone?: string | null
  status: string
  amount?: number | null
  currency?: string | null
  source?: "ai" | "whatsapp" | "manual" | string | null
  conversationId?: string | null
  agentId?: string | null
  documentUrl?: string | null
  payload?: Record<string, unknown> | null
  internalNote?: string | null
  createdAt: string
  updatedAt?: string | null
}

export type BusinessDocumentType =
  | "quote"
  | "invoice"
  | "receipt"
  | "kyc"
  | "certificate"
  | "report"
  | "other"

export interface BusinessDocument {
  id: string
  documentNumber?: string | null
  name: string
  documentType: BusinessDocumentType
  status: string
  fileName?: string | null
  filePath?: string | null
  mimeType?: string | null
  fileSize?: number | null
  customerId?: string | null
  customerName?: string | null
  agentId?: string | null
  agentName?: string | null
  conversationId?: string | null
  templateId?: string | null
  templateName?: string | null
  tariffGridId?: string | null
  amount?: number | null
  currency?: string | null
  previewUrl?: string | null
  downloadUrl?: string | null
  metadata?: Record<string, unknown> | null
  generatedAt?: string | null
  sentAt?: string | null
  viewedAt?: string | null
  expiresAt?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface BusinessDocumentStats {
  total: number
  createdThisMonth: number
  sent: number
  storageUsedBytes: number
}

export interface BusinessDocumentEvent {
  id: string
  documentId: string
  eventType: string
  actorType?: string | null
  actorId?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface CatalogCategory {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  sortOrder?: number | null
}

export interface CatalogItemImage {
  id: string
  url: string
  altText?: string | null
  isPrimary: boolean
  sortOrder?: number | null
}

export interface CatalogItem {
  id: string
  name: string
  categoryId?: string | null
  categoryName?: string | null
  itemType?: string | null
  sku?: string | null
  basePrice: number
  currency?: string | null
  description?: string | null
  imageUrl?: string | null
  availabilityStatus?: string | null
  isActive: boolean
  customFields?: Record<string, unknown> | null
  images: CatalogItemImage[]
}

export interface ImportCatalogPayload {
  items: Record<string, unknown>[]
  categories?: Record<string, unknown>[]
}

export interface DeliveryZone {
  id: string
  name: string
  city?: string | null
  district?: string | null
  isActive: boolean
}

export interface PaymentMethod {
  id: string
  name: string
  paymentType: string
  provider?: string | null
  accountReference?: string | null
  instructions?: string | null
  requiresPaymentProof?: boolean
  requiresDeposit?: boolean
  qrCode?: string | null
  isActive: boolean
}

export interface OrderItem {
  name: string
  qty: number
  unitPrice: number
}

export interface Order {
  id: string
  orderNumber?: string | null
  contactId?: string | null
  contactName?: string | null
  contactPhone?: string | null
  conversationId?: string | null
  source?: string | null
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  totalAmount: number
  currency: string
  deliveryAddress?: string | null
  deliveryType?: string | null
  deliveryDate?: string | null
  waitingTime?: number | null
  courier?: string | null
  assignedEmployees: string[]
  notes?: string | null
  internalNote?: string | null
  paymentMethodId?: string | null
  paymentProofUrl?: string | null
  items: OrderItem[]
  createdAt: string
}

export interface UpdateOrderPayload {
  status?: string
  payment_status?: string
  fulfillment_status?: string
  [key: string]: unknown
}

export interface BusinessWallet {
  balance: number
  currency: string
  totalCollected: number
  totalWithdrawn: number
}

export interface BusinessWalletTransaction {
  id: string
  type: "credit" | "debit" | string
  amount: number
  description?: string | null
  actionName: string
  balanceBefore: number
  balanceAfter: number
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export const FLOW_PAY_TYPE = "flow_pay" as const

export function isFlowPayType(type: string | null | undefined): boolean {
  return type === FLOW_PAY_TYPE || type === "duo_pay"
}

export interface FlowPayCollectStatus {
  id: string
  status: "processing" | "succeeded" | "failed" | string
  amount: number
  currency: string
  customerPhone?: string | null
  operator?: string | null
  failureMessage?: string | null
}

export interface FlowPayCardLink {
  checkoutUrl: string
  amount: number
  currency: string
}

export interface CardWallet {
  balance: number
  currency: string
  totalCollected: number
  totalWithdrawn: number
}

export interface CardWalletWithdrawal {
  id: string
  amount: number
  currency: string
  method: "bank_transfer" | "cash" | string
  status: "pending" | "processing" | "completed" | "rejected" | string
  adminNote?: string | null
  createdAt: string
}

export interface CreateCardWalletWithdrawalPayload {
  amount: number
  method: "bank_transfer" | "cash"
  bank_name?: string
  account_number?: string
  account_holder?: string
  bank_country?: string
  swift_code?: string
  iban?: string
  cash_pickup_location?: string
  contact_phone?: string
  notes?: string
}
