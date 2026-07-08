import { api, apiJson } from "./api"

// ─── Full visual config — everything the template reads ────────────────── //
export interface PdfStyles {
  // Colors
  primary_color: string
  header_text_color: string
  text_color: string
  muted_color: string
  border_color: string
  row_alt_color: string

  // Typography
  font_family: string

  // Company
  entreprise_nom: string
  entreprise_adresse: string
  entreprise_telephone: string
  entreprise_email: string
  entreprise_logo_url: string

  // Document meta
  doc_title: string
  currency: string
  footer_text: string

  // Client fields visibility
  show_client_telephone: boolean
  show_client_email: boolean
  show_client_adresse: boolean
  label_client: string

  // Items table columns
  show_quantite: boolean
  show_prix_unitaire: boolean
  label_description: string
  label_quantite: string
  label_prix_unitaire: string
  label_total: string

  // Totals
  show_sous_total: boolean
  show_tva: boolean
  tva_taux: number
  centime_additionnel_enabled: boolean
  centime_additionnel_taux: number
  centime_additionnel_label: string

  // Sections
  show_notes: boolean
  label_notes: string
}

export const DEFAULT_PDF_STYLES: PdfStyles = {
  primary_color: "#233064",
  header_text_color: "#ffffff",
  text_color: "#333333",
  muted_color: "#888888",
  border_color: "#e0e0e0",
  row_alt_color: "#f8f9fa",

  font_family: "Arial, Helvetica, sans-serif",

  entreprise_nom: "Mon Entreprise",
  entreprise_adresse: "Brazzaville, République du Congo",
  entreprise_telephone: "+242 06 000 0000",
  entreprise_email: "contact@entreprise.com",
  entreprise_logo_url: "",

  doc_title: "DEVIS",
  currency: "FCFA",
  footer_text: "Merci pour votre confiance. Ce devis est valable 30 jours à compter de sa date d'émission.",

  show_client_telephone: true,
  show_client_email: true,
  show_client_adresse: true,
  label_client: "Destinataire",

  show_quantite: true,
  show_prix_unitaire: true,
  label_description: "Description",
  label_quantite: "Qté",
  label_prix_unitaire: "Prix unitaire",
  label_total: "Total",

  show_sous_total: true,
  show_tva: true,
  tva_taux: 18,
  centime_additionnel_enabled: false,
  centime_additionnel_taux: 1,
  centime_additionnel_label: "Centime additionnel",

  show_notes: true,
  label_notes: "Notes & Conditions",
}

export interface FieldSchema {
  key: string
  label: string
  type: "string" | "number" | "array"
  required: boolean
  item_fields?: FieldSchema[]
}

export interface PdfTemplate {
  id: string
  organization_id?: string
  agent_id?: string | null
  name: string
  description?: string | null
  html_content?: string
  styles: PdfStyles
  fields_schema: FieldSchema[]
  is_default: boolean
  created_at: string
  updated_at?: string
}

export interface PdfTemplateCreatePayload {
  name: string
  description?: string
  agent_id?: string
  html_content?: string
  styles?: Partial<PdfStyles>
  fields_schema?: FieldSchema[]
  is_default?: boolean
}

export interface PdfTemplateUpdatePayload {
  name?: string
  description?: string
  html_content?: string
  styles?: Partial<PdfStyles>
  fields_schema?: FieldSchema[]
  is_default?: boolean
}

export interface PdfGeneratePayload {
  template_id?: string
  file_name?: string
  numero_devis?: string
  date_emission?: string
  date_validite?: string
  client_nom: string
  client_telephone?: string
  client_email?: string
  client_adresse?: string
  items: Array<{ description: string; quantite: number; prix_unitaire: number; total: number }>
  sous_total: number
  tva_taux?: number
  tva_montant?: number
  total: number
  notes?: string
}

export const pdfTemplatesService = {
  async listTemplates(agentId?: string) {
    const params: Record<string, string> = {}
    if (agentId) params.agent_id = agentId
    const { data } = await api.get<{ templates: PdfTemplate[]; pagination: { total: number } }>(
      "/v1/ai/pdf/templates", { params }
    )
    return data
  },

  async getTemplate(templateId: string): Promise<PdfTemplate> {
    const { data } = await api.get<{ data: PdfTemplate }>(`/v1/ai/pdf/templates/${templateId}`)
    return data.data
  },

  async getDefaultTemplate(): Promise<{ data: PdfTemplate; source: "organization" | "system" }> {
    const { data } = await api.get<{ data: PdfTemplate; source: "organization" | "system" }>(
      "/v1/ai/pdf/templates/default"
    )
    return data
  },

  async createTemplate(payload: PdfTemplateCreatePayload): Promise<PdfTemplate> {
    const { data } = await apiJson.post<{ ok: boolean; template: PdfTemplate }>(
      "/v1/ai/pdf/templates", payload
    )
    return data.template
  },

  async updateTemplate(templateId: string, payload: PdfTemplateUpdatePayload): Promise<PdfTemplate> {
    const { data } = await apiJson.put<{ ok: boolean; template: PdfTemplate }>(
      `/v1/ai/pdf/templates/${templateId}`, payload
    )
    return data.template
  },

  async deleteTemplate(templateId: string): Promise<void> {
    await api.delete(`/v1/ai/pdf/templates/${templateId}`)
  },

  async previewTemplate(payload: {
    html_content?: string
    template_id?: string
    styles?: Partial<PdfStyles>
    data?: Record<string, unknown>
  }): Promise<string> {
    const { data } = await apiJson.post<{ ok: boolean; html: string }>(
      "/v1/ai/pdf/preview", payload
    )
    if (!data.ok || typeof data.html !== "string") {
      throw new Error("Réponse d'aperçu PDF invalide")
    }
    return data.html
  },

  async generatePdf(payload: PdfGeneratePayload) {
    const { data } = await apiJson.post<{
      ok: boolean
      data: { upload_id: string; public_url: string; file_name: string; size: number }
    }>("/v1/ai/pdf/generate", payload)
    return data.data
  },
}
