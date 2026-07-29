export type TariffGridStatus =
  | "no_file"
  | "importing"
  | "import_failed"
  | "invalid_csv"
  | "duplicate_headers"
  | "incomplete"
  | "invalid_formula"
  | "ready"
  | "connected"

export interface TariffGrid {
  id: string
  organization_id?: string
  agent_id?: string | null
  name: string
  csv_path: string
  csv_file_name?: string | null
  csv_size?: number | null
  csv_row_count?: number | null
  csv_column_count?: number | null
  separator?: string
  encoding?: string
  headers?: string[]
  input_mapping: Record<string, string>
  output_columns: string[]
  formula: string
  status: TariffGridStatus
  created_at: string
  updated_at?: string
}

export interface TariffGridCsvPreview {
  headers: string[]
  rows: string[][]
  rowCount: number
  separator: string
  encoding: string
  duplicateHeaders: string[]
}

export interface TariffGridTestInput {
  [field: string]: string
}

export interface TariffGridTestResult {
  success: boolean
  matchCount: number
  outputValues: Record<string, number | null>
  result: number | null
  error?: string
}

export interface TariffGridCreatePayload {
  name: string
  agent_id?: string
}

export interface TariffGridUpdatePayload {
  name?: string
  csv_path?: string
  csv_file_name?: string | null
  csv_size?: number | null
  csv_row_count?: number | null
  csv_column_count?: number | null
  separator?: string
  encoding?: string
  headers?: string[]
  input_mapping?: Record<string, string>
  output_columns?: string[]
  formula?: string
  status?: TariffGridStatus
  agent_id?: string | null
}

export interface TariffGridImportPayload {
  file: File
  name: string
  separator?: string
  encoding?: string
  agent_slug?: string
}
