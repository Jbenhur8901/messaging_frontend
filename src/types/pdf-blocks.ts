export type PdfBlockType =
  | "title"
  | "text"
  | "field"
  | "list"
  | "customer_information"
  | "price_table"
  | "total"
  | "image"
  | "section_header"
  | "separator"
  | "signature"

export type BlockAlign = "left" | "center" | "right"

// Layout width — lets two (or three) blocks sit side by side on the same row
// instead of always stacking full-width. Absent/undefined behaves as "full".
export type BlockWidth = "full" | "half" | "third"

export interface PdfBlock {
  id: string
  type: PdfBlockType
  order: number
  width?: BlockWidth
  config: Record<string, unknown>
}

export interface BlockLibraryItem {
  type: PdfBlockType
  label: string
  category: "content" | "layout"
}

// "content" = ce qui porte de l'information (texte, champs, tableaux…)
// "layout" = ce qui structure la page (bandeaux, séparateurs, signature)
export const BLOCK_LIBRARY: BlockLibraryItem[] = [
  { type: "title", label: "Titre", category: "content" },
  { type: "text", label: "Texte", category: "content" },
  { type: "field", label: "Champ à remplir", category: "content" },
  { type: "list", label: "Liste", category: "content" },
  { type: "customer_information", label: "Informations client", category: "content" },
  { type: "price_table", label: "Tableau de prix", category: "content" },
  { type: "total", label: "Total", category: "content" },
  { type: "image", label: "Image", category: "content" },
  { type: "section_header", label: "Bandeau de section", category: "layout" },
  { type: "separator", label: "Séparateur", category: "layout" },
  { type: "signature", label: "Signature", category: "layout" },
]

export const PRICE_TABLE_COLUMNS: { value: string; label: string }[] = [
  { value: "description", label: "Description" },
  { value: "detail", label: "Détail" },
  { value: "quantity", label: "Quantité" },
  { value: "unit_price", label: "Prix unitaire" },
  { value: "amount", label: "Montant" },
]

export const createBlockId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2, 9)
}

const createId = createBlockId

function defaultConfigFor(type: PdfBlockType): Record<string, unknown> {
  switch (type) {
    case "title":
      return { text: "Titre du document", align: "left", color: "#111111", size: "large", show_doc_info: false }
    case "text":
      return { text: "Nous vous remercions pour votre confiance.", align: "left", color: "#333333", size: "medium" }
    case "field":
      return { label: "Nom (s)", value: "", style: "line", accent_color: "#111111" }
    case "list":
      return { items: ["Premier point"], style: "bullet", color: "#333333" }
    case "section_header":
      return { text: "Section", align: "left", bg_color: "#f3f4f6", text_color: "#111111" }
    case "customer_information":
      return {
        show_company: true,
        show_contact: true,
        show_address: true,
        title: "Informations client",
        accent_color: "#111111",
      }
    case "price_table":
      return {
        title: "Prestation proposée",
        columns: ["description", "detail", "quantity", "unit_price", "amount"],
        header_bg: "#f3f4f6",
        zebra: false,
        show_border: true,
      }
    case "total":
      return { show_subtotal: true, show_tax: true, tax_rate: 20, accent_color: "#111111" }
    case "image":
      return { url: "", align: "left", width_percent: 30 }
    case "separator":
      return { style: "solid", color: "#d1d5db", thickness: 1 }
    case "signature":
      return { align: "center", size: "medium", show_name: true, show_title: true, ink_color: "#111111" }
    default:
      return {}
  }
}

export function createBlock(type: PdfBlockType, order: number): PdfBlock {
  return { id: createId(), type, order, width: "full", config: defaultConfigFor(type) }
}

export function defaultBlocks(): PdfBlock[] {
  const order: PdfBlockType[] = ["title", "customer_information", "price_table", "total", "text", "signature"]
  return order.map((type, index) => {
    const config = defaultConfigFor(type)
    if (type === "text") {
      config.text = "Conditions de paiement : paiement à 30 jours à réception de la facture."
    }
    return { id: createId(), type, order: index + 1, width: "full", config }
  })
}

export function reorder(blocks: PdfBlock[]): PdfBlock[] {
  return blocks.map((block, index) => ({ ...block, order: index + 1 }))
}
