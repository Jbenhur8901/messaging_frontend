// Auth types
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  organization_id: string
  organization_name?: string
  role: "owner" | "admin" | "member"
  email_verified: boolean
  created_at: string
  api_key?: string
  api_key_id?: string
  mfa_enabled?: boolean
  is_first_login?: boolean
}

export interface Organization {
  id: string
  name: string
  credit_balance: number
  is_active: boolean
}

export interface OrganizationSummary {
  id: string
  name: string
  role: "owner" | "admin" | "member" | "viewer"
  joined_at?: string
}

export interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface AuthResponse {
  success: boolean
  user: User
  organization?: Organization
  session?: Session
  message?: string
  mfa_required?: boolean
  mfa_enabled?: boolean
  pre_auth_token?: string
}

export interface MFAStatus {
  mfa_enabled: boolean
  mfa_verified_at?: string | null
  backup_codes_remaining?: number
  backup_codes_low?: boolean
  account_locked?: boolean
  locked_until?: string | null
}

export interface MFASetupResponse {
  success: boolean
  secret?: string
  qr_code: string
  provisioning_uri?: string
  message?: string
}

// Credits types
export interface CreditBalance {
  organization_id: string
  organization_name: string
  credit_balance: number
  credit_reserved: number
  credit_available: number
  last_recharge_at: string | null
  whatsapp_credit_balance?: number
  whatsapp_credit_reserved?: number
  whatsapp_credit_available?: number
  whatsapp_last_recharge_at?: string | null
  currency: string
  note: string
}

export interface CreditTransaction {
  id: string
  type: "consumption" | "recharge" | "refund" | "adjustment"
  amount: number
  description: string
  broadcast_id?: string
  payment_reference?: string
  created_at: string
}

export interface CreditUsage {
  period_days: number
  total_consumed: number
  total_recharged: number
  average_daily_consumption: number
  current_balance: number
  available_balance: number
  estimated_days_remaining: number
  daily_breakdown: Record<string, number>
}

// Message types
export interface MessageResult {
  success: boolean
  message_id: string
  twilio_sid: string
  status: string
  error: string | null
  segments: number
  credits_consumed: number
  encoding: "GSM-7" | "UCS-2"
}

export interface BroadcastResult {
  success: boolean
  broadcast_id: string
  status: string
  total_recipients: number
  estimated_batches: number
  message: string
  segments_per_message: number
  total_credits: number
  encoding: "GSM-7" | "UCS-2"
}

// Templated message result
export interface TemplatedMessageResult {
  success: boolean
  message_id: string
  twilio_sid: string
  status: string
  template_id: string
  template_name: string
  rendered_body: string
  segments: number
  credits_consumed: number
}

// Templated broadcast result
export interface TemplatedBroadcastResult {
  success: boolean
  broadcast_id: string
  status: string
  total_recipients: number
  template_id: string
  template_name: string
  message: string
}

export interface Broadcast {
  broadcast_id: string
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  total_recipients: number
  sent_count: number
  failed_count: number
  pending_count: number
  progress_percent: number
  segments_per_message: number
  total_segments: number
  credits_consumed: number
  credits_reserved: number
  message_encoding: "GSM-7" | "UCS-2"
  campaign_name: string | null
  body?: string
  created_at: string
  completed_at: string | null
  // WhatsApp-specific fields
  channel?: "sms" | "whatsapp"
  template_name?: string
  delivered_count?: number
  read_count?: number
  delivery_rate?: number
  read_rate?: number
}

export interface BroadcastMessage {
  phone: string
  status: "queued" | "sending" | "sent" | "delivered" | "undelivered" | "failed"
  segments_count: number
  twilio_sid: string | null
  error: string | null
  sent_at: string | null
}

// Contact types
export interface Contact {
  id: string
  phone_number: string
  first_name: string | null
  last_name: string | null
  email: string | null
  custom_fields: Record<string, unknown>
  is_active: boolean
  is_blocked: boolean
  messages_sent: number
  messages_delivered?: number
  last_message_at: string | null
  tags: Tag[]
  created_at?: string
}

export interface ContactImportError {
  row?: number
  error: string
}

export interface ContactImportResult {
  success: boolean
  import_id: string
  total: number
  imported: number
  updated: number
  skipped: number
  failed: number
  errors: (string | ContactImportError)[]
}

// Tag types
export interface Tag {
  id: string
  name: string
  color: string
  description?: string
  contact_count: number
}

// Template types
export interface Template {
  id: string
  name: string
  body: string
  category: "transactional" | "marketing" | "notification" | "other"
  encoding: "GSM-7" | "UCS-2"
  segments_count: number
  character_count: number
  variables: string[]
  is_active: boolean
  use_count: number
  created_at?: string
  updated_at?: string
}

export interface TemplatePreview {
  template_id: string
  template_name: string
  original_body: string
  rendered_body: string
  variables_used: Record<string, string>
  analysis: {
    segments: number
    encoding: "GSM-7" | "UCS-2"
    characters: number
  }
}

// Custom Field types
export interface CustomField {
  id: string
  field_key: string
  label: string
  field_type: "text" | "number" | "date" | "boolean" | "select" | "multiselect" | "email" | "url" | "phone"
  is_required: boolean
  is_active: boolean
  is_system?: boolean
  is_global?: boolean
  placeholder?: string
  options?: string[]
}

// Dashboard types
export interface DashboardOverview {
  credits: {
    balance: number
    reserved: number
    available: number
    expiring_soon: number
    expiring_in_days: number
  }
  today: {
    messages_sent: number
    messages_delivered: number
    delivery_rate: number
  }
  week: {
    messages_sent: number
    messages_delivered: number
    delivery_rate: number
  }
  broadcasts: {
    active: number
  }
  generated_at: string
}

export interface DailyStat {
  date: string
  messages_sent: number
  messages_delivered: number
  messages_failed: number
  messages_read?: number
  delivery_rate: number
  credits_consumed: number
}

// SMS Tools types
export interface SMSAnalysis {
  segments: number
  encoding: "GSM-7" | "UCS-2"
  characters: number
  characters_per_segment: number
  max_characters: number
  is_gsm: boolean
  cost_multiplier: number
}

export interface SMSEstimate {
  message_analysis: {
    segments: number
    encoding: "GSM-7" | "UCS-2"
    characters: number
  }
  recipient_count: number
  segments_per_recipient: number
  total_segments: number
  total_credits_required: number
  credits_available: number
  sufficient_credits: boolean
  shortage: number
}

export interface NonGSMCharacter {
  character: string
  position: number
  unicode: string
  suggestion: string
}

// API Key types
export interface APIKey {
  id: string
  name: string
  key_prefix: string
  environment: "live" | "test"
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

// MFA types
export interface MFAFactor {
  id: string
  friendly_name: string | null
  factor_type: "totp"
  status: "verified" | "unverified"
  created_at: string
  updated_at: string
}

export interface MFAEnrollResponse {
  id: string
  type: "totp"
  totp: {
    qr_code: string
    secret: string
    uri: string
  }
}

export interface MFAVerifyResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface MFAChallengeResponse {
  id: string
  factor_id: string
  created_at: string
  expires_at: string
}

// Messaging Service types
export interface MessagingService {
  id: string
  service_sid: string
  service_name: string
  alpha_sender_id: string
  alpha_sender_sid?: string
  usecase: "notifications" | "marketing" | "verification" | "otp" | "transactional"
  inbound_request_url?: string
  status_callback_url?: string
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at?: string
}

export interface CreateMessagingServiceRequest {
  service_name: string
  alpha_sender_id: string
  usecase?: "notifications" | "marketing" | "verification" | "otp" | "transactional"
  inbound_request_url?: string
  status_callback_url?: string
  is_default?: boolean
}

// Pagination
export interface Pagination {
  total: number
  limit: number
  offset: number
  has_more?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

// Organization types (extended)
export type OrganizationRole = "owner" | "admin" | "member" | "viewer"

export interface OrganizationMember {
  id: string
  user_id: string | null
  email: string
  role: OrganizationRole
  status: "pending" | "accepted"
  first_name?: string
  last_name?: string
  joined_at?: string
  invited_at?: string
}

export interface OrganizationInvitation {
  id: string
  organization_id: string
  organization_name: string
  email: string
  role: OrganizationRole
  status?: "pending" | "accepted" | "revoked" | "expired"
  expires_at: string
  created_at?: string
  token?: string
  invitation_url?: string
}

// Credit Request types
export type PaymentMethod = "cash" | "airtel_money" | "mobile_money" | "bank_transfer"
export type CreditRequestStatus = "pending" | "approved" | "rejected" | "cancelled"

export interface CreditRequest {
  id: string
  organization_id: string
  organization_name?: string
  requested_by: string
  requester_email?: string
  requester_name?: string
  amount: number
  payment_method: PaymentMethod
  payment_reference?: string
  payment_proof_url?: string
  status: CreditRequestStatus
  reviewed_by?: string
  reviewed_at?: string
  review_note?: string
  created_at: string
}

// AI Credit Request types
export interface AICreditRequest {
  id: string
  organization_id: string
  organization_name?: string
  requested_by: string
  requester_email?: string
  requester_name?: string
  package_code: string
  package_name?: string
  credits_amount: number
  total_price_fcfa: number
  payment_method: PaymentMethod
  payment_reference?: string
  payment_proof_url?: string
  status: CreditRequestStatus
  reviewed_by?: string
  reviewed_at?: string
  review_note?: string
  created_at: string
}

// Admin types
export type AdminRole = "admin" | "super_admin"

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
}

export interface AdminSession {
  token: string
  expires_at: string
}

export interface AdminAuthResponse {
  success: boolean
  token: string
  expires_at: string
  admin: AdminUser
}

export interface AdminDashboard {
  pending_credit_requests: number
  total_organizations: number
  total_users: number
  approved_today: number
  credits_distributed_today: number
}

// WhatsApp types
export interface WhatsAppConfig {
  access_token?: string | null
  phone_number_id?: string | null
  business_account_id?: string | null
  enabled?: boolean | null
  is_configured: boolean
  last_verified_at?: string
}

export type WhatsAppTemplateStatus = "APPROVED" | "PENDING" | "REJECTED"
export type WhatsAppTemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION"
export type WhatsAppComponentType = "HEADER" | "BODY" | "FOOTER" | "BUTTONS"
export type WhatsAppHeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"
export type WhatsAppButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER"

export interface WhatsAppTemplateParameter {
  type: "text" | "image" | "video" | "document"
  text?: string
  image?: { link: string }
  video?: { link: string }
  document?: { link: string; filename?: string }
}

export interface WhatsAppTemplateButton {
  type: WhatsAppButtonType
  text: string
  url?: string
  phone_number?: string
}

export interface WhatsAppTemplateComponent {
  type: WhatsAppComponentType
  format?: WhatsAppHeaderFormat
  text?: string
  buttons?: WhatsAppTemplateButton[]
  example?: {
    header_text?: string[]
    body_text?: string[][]
    header_handle?: string[]
    filename?: string
  }
}

export interface WhatsAppTemplate {
  id: string
  name: string
  language: string
  status: WhatsAppTemplateStatus
  category: WhatsAppTemplateCategory
  components: WhatsAppTemplateComponent[]
  created_at?: string
  updated_at?: string
}

export type WhatsAppMessageStatus = "queued" | "sent" | "delivered" | "read" | "failed"

export interface WhatsAppMessageEvent {
  status: WhatsAppMessageStatus
  timestamp: string
  error_code?: string
  error_message?: string
}

export interface WhatsAppMessage {
  id: string
  message_id: string
  phone_number: string
  template_name?: string
  template_language?: string
  status: WhatsAppMessageStatus
  error_message?: string
  sent_at?: string
  delivered_at?: string
  read_at?: string
  created_at: string
}

export type WhatsAppBroadcastStatus = "pending" | "processing" | "completed" | "failed" | "cancelled"

export interface WhatsAppBroadcast {
  id: string
  campaign_name: string | null
  template_id: string
  template_name: string
  template_language: string
  status: WhatsAppBroadcastStatus
  total_recipients: number
  sent_count: number
  delivered_count: number
  read_count: number
  failed_count: number
  pending_count: number
  progress_percent: number
  created_at: string
  completed_at: string | null
}

export interface WhatsAppBroadcastMessage {
  id?: string
  phone: string
  to_phone?: string
  status: WhatsAppMessageStatus
  message_id: string | null
  wamid?: string | null
  error: string | null
  error_code?: string | null
  error_message?: string | null
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  failed_at?: string | null
  created_at?: string
}

export interface WhatsAppStats {
  total_messages: number
  delivered: number
  read: number
  failed: number
  delivery_rate: number
  read_rate: number
  period_days: number
}

export interface WhatsAppBroadcastResult {
  success: boolean
  broadcast_id: string
  status: string
  total_recipients: number
  template_name: string
  template_language: string
  message: string
}

export interface WhatsAppMessageResult {
  success: boolean
  message_id: string
  status: WhatsAppMessageStatus
  phone_number: string
}

// === Conversations Inbox ===
export interface WhatsAppInboxConversation {
  id: string
  phone_number?: string
  contact_phone?: string
  contact_name: string | null
  status: "open" | "closed" | "archived"
  assigned_to?: string | null
  unread_count: number
  last_message_at: string | null
  last_message_preview?: string | null
  last_message_direction?: string | null
  created_at: string
  updated_at: string
  contact_id?: string | null
}

export type WhatsAppMessageDirection = "inbound" | "outbound"
export type WhatsAppMessageType = "text" | "template" | "image" | "video" | "audio" | "document" | "location" | "contacts" | "interactive" | "reaction" | "sticker" | "button" | "order" | "unknown"

export interface WhatsAppConversationMessage {
  id: string
  message_id?: string
  wamid?: string
  direction: WhatsAppMessageDirection
  // Type: API sends message_type (inbound) or content_type (outbound)
  type?: WhatsAppMessageType
  message_type?: string
  content_type?: string
  // Text: API sends text_body
  content?: string
  body?: string
  text_body?: string | null
  text?: string | { body?: string }
  // Phone
  phone_number?: string
  contact_phone?: string
  from_phone?: string
  to_phone?: string
  from_name?: string
  // Template
  template_name?: string
  template_language?: string
  // Status & timestamps
  status?: WhatsAppMessageStatus
  error_message?: string
  sent_at?: string
  delivered_at?: string
  read_at?: string
  created_at?: string
  received_at?: string
  timestamp?: string
  meta_timestamp?: string
  is_read?: boolean
  // Media
  media_url?: string | null
  media_id?: string | null
  media_type?: string | null
  media_mime_type?: string | null
  media_filename?: string | null
  media_caption?: string | null
  caption?: string | null
  filename?: string | null
  // Location (flat fields from API)
  latitude?: number | null
  longitude?: number | null
  location_latitude?: number | null
  location_longitude?: number | null
  location_name?: string | null
  location_address?: string | null
  // Interactive (flat fields from API)
  interactive_type?: string | null
  interactive_reply_id?: string | null
  interactive_reply_title?: string | null
  interactive_data?: unknown
  // Reaction (flat field from API)
  reaction_emoji?: string | null
  reaction_message_id?: string | null
  // Contacts
  contacts_data?: unknown
  // Context
  context_message_id?: string | null
  // AI
  is_ai_reply?: boolean
}

// === Freeform Messages ===
export interface SendTextPayload {
  to: string
  text: string
  preview_url?: boolean
  reply_to_wamid?: string
}

export interface SendMediaPayload {
  to: string
  media_type: "image" | "video" | "audio" | "document"
  media_url?: string
  media_id?: string
  caption?: string
  filename?: string
}

export interface SendLocationPayload {
  to: string
  latitude: string
  longitude: string
  name?: string
  address?: string
}

export interface MediaUploadResult {
  media_id: string
}

// === Messages Programmés ===
export type ScheduledMessageStatus = "pending" | "processing" | "sent" | "failed" | "cancelled"
export type ScheduledMessageType = "message" | "broadcast"

export interface ScheduledMessage {
  id: string
  scheduled_at: string
  timezone?: string
  message_type: "template" | "text"
  scheduled_type?: ScheduledMessageType
  status: ScheduledMessageStatus
  to?: string
  template_name?: string
  template_language?: string
  text_body?: string
  recipients?: string[]
  created_at: string
}

// === Analytics ===
export interface TemplateAnalytics {
  template_id: string
  template_name: string
  total_sent: number
  delivered: number
  read: number
  failed: number
  delivery_rate: number
  read_rate: number
}

export interface DeliveryRatePoint {
  date: string
  sent: number
  delivered: number
  failed: number
  delivery_rate: number
}

export interface ReadRatePoint {
  date: string
  delivered: number
  read: number
  read_rate: number
}

export interface ResponseTimeStats {
  avg_response_time_seconds: number
  median_response_time_seconds: number
  p95_response_time_seconds: number
}

export interface ConversationAnalytics {
  total_conversations: number
  open: number
  closed: number
  avg_messages_per_conversation: number
}

// === Flows ===
export type WhatsAppFlowStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED" | "BLOCKED" | "THROTTLED"
export type WhatsAppFlowCategory = "SIGN_UP" | "SIGN_IN" | "APPOINTMENT_BOOKING" | "LEAD_GENERATION" | "CONTACT_US" | "CUSTOMER_SUPPORT" | "SURVEY" | "OTHER"

export interface WhatsAppFlow {
  id: string
  name: string
  status: WhatsAppFlowStatus
  categories: WhatsAppFlowCategory[]
  created_at: string
  updated_at: string
}

export interface WhatsAppFlowDetail extends WhatsAppFlow {
  flow_json?: object
  validation_errors?: string[]
}

export interface WhatsAppFlowResponse {
  id: string
  flow_id: string
  phone_number: string
  response_data: Record<string, unknown>
  created_at: string
}

// === Comptes WABA ===
export type WhatsAppAccountStatus = "pending" | "active" | "suspended" | "disconnected" | "verification_needed" | "restricted"

export interface WhatsAppAccount {
  id: string
  waba_id: string
  phone_number_id: string
  display_phone_number: string
  business_name: string
  status: WhatsAppAccountStatus
  is_default: boolean
  quality_rating?: string
  messaging_limit?: string
  verified_name?: string
  created_at: string
  updated_at: string
}

// === Consentement ===
export interface ConsentStatus {
  phone_number: string
  opted_in: boolean
  opted_in_at?: string
  opted_out_at?: string
  source?: string
}

export interface ConsentHistoryEntry {
  id: string
  action: "opt_in" | "opt_out"
  source: string
  consent_text?: string
  ip_address?: string
  created_at: string
}

// === Crédits WhatsApp ===
export interface CompartmentBalance {
  balance: number
  reserved: number
  available: number
}

export interface WhatsAppCreditBalance {
  marketing: CompartmentBalance
  utility: CompartmentBalance
  authentication: CompartmentBalance
  free: CompartmentBalance
  total_balance: number
}

export interface WhatsAppCreditPackage {
  id?: string
  code: string
  name: string
  category: "marketing" | "utility" | "authentication" | "topup"
  messages_included?: number
  message_count?: number
  price_fcfa?: number
  total_price_fcfa?: number
  unit_price_fcfa?: number
  discount_percent?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
  description?: string
}

export interface WhatsAppCreditTransaction {
  id: string
  transaction_type: "purchase" | "consumption" | "refund" | "expiration"
  compartment: string
  amount: number
  description: string
  created_at: string
}

export interface WhatsAppCreditDashboard {
  balance: WhatsAppCreditBalance
  usage: { period_days: number; total_consumed: number; daily_breakdown: Record<string, number>; by_compartment: Record<string, number> }
  recent_transactions: WhatsAppCreditTransaction[]
  notifications: WhatsAppCreditNotification[]
  expiring_soon?: { amount: number; expires_at: string }
}

export interface WhatsAppCreditNotification {
  id: string
  type: string
  message: string
  is_read: boolean
  created_at: string
}

export interface PreSendCheck {
  can_send: boolean
  category: string
  message_count: number
  credits_required: number
  credits_available: number
  shortage?: number
}

// Scenarios types
export type ScenarioStatus = "active" | "inactive" | "draft"
export type ScenarioChannel = "whatsapp"

export type ScenarioNodeType =
  | "trigger_incoming"
  | "trigger_keyword"
  | "trigger_webhook"
  | "trigger_event"
  | "trigger_schedule"
  | "message_text"
  | "message_image"
  | "message_audio"
  | "message_video"
  | "message_document"
  | "message_buttons"
  | "message_quick_reply"
  | "message_template"
  | "condition_if"
  | "action_wait"
  | "action_tag"
  | "action_update_field"
  | "action_api_call"
  | "action_redirect_scenario"
  | "action_assign_agent"
  | "end"

export interface ScenarioPosition {
  x: number
  y: number
}

export interface ScenarioNode {
  id: string
  type: ScenarioNodeType
  title: string
  description?: string
  position: ScenarioPosition
  config: Record<string, string | number | boolean | string[] | null | undefined>
}

export interface ScenarioEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface ScenarioFlow {
  nodes: ScenarioNode[]
  edges: ScenarioEdge[]
  viewport?: {
    zoom: number
    panX: number
    panY: number
  }
}

export interface ScenarioGlobalVariable {
  id: string
  key: string
  value: string
}

export interface ScenarioStats {
  trigger_count: number
  total_messages_sent: number
  completion_rate: number
  last_triggered_at?: string | null
}

export interface ScenarioVersion {
  id: string
  created_at: string
  note: string
  status: ScenarioStatus
  flow: ScenarioFlow
}

export interface ConversationScenario {
  id: string
  name: string
  description: string
  status: ScenarioStatus
  channel: ScenarioChannel
  is_main?: boolean
  created_at: string
  updated_at: string
  published_at?: string | null
  flow: ScenarioFlow
  global_variables: ScenarioGlobalVariable[]
  stats: ScenarioStats
  versions: ScenarioVersion[]
}
