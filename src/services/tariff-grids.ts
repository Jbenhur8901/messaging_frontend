import { api, apiJson, getStoredActiveOrgId } from "./api"
import { getSupabaseClient, syncSupabaseSession } from "@/lib/supabase"
import { authStorage } from "@/lib/auth-storage"
import { buildTariffGridPath, parseCsvFile } from "@/lib/tariff-csv"
import { deriveGridStatus, runTariffCalculation } from "@/lib/tariff-engine"
import type {
  TariffGrid,
  TariffGridCreatePayload,
  TariffGridImportPayload,
  TariffGridTestInput,
  TariffGridTestResult,
  TariffGridUpdatePayload,
} from "@/types/tariff-grids"

const STORAGE_KEY = "flow-tariff-grids-v1"
const CSV_CONTENT_KEY = "flow-tariff-grids-csv-v1"
const TARIFF_BUCKET = process.env.NEXT_PUBLIC_TARIFF_GRID_BUCKET || process.env.NEXT_PUBLIC_MEDIA_UPLOAD_BUCKET || "mms-media"

const isBrowser = () => typeof window !== "undefined"

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2, 11)
}

const nowIso = () => new Date().toISOString()

function storageScope(): string {
  return getStoredActiveOrgId() || "default"
}

function readLocalGrids(): TariffGrid[] {
  if (!isBrowser()) return []
  const raw = window.localStorage.getItem(`${STORAGE_KEY}:${storageScope()}`)
  if (!raw) return []
  try {
    return JSON.parse(raw) as TariffGrid[]
  } catch {
    return []
  }
}

function writeLocalGrids(grids: TariffGrid[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(`${STORAGE_KEY}:${storageScope()}`, JSON.stringify(grids))
}

function readCsvContent(gridId: string): string | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(`${CSV_CONTENT_KEY}:${storageScope()}:${gridId}`)
  return raw || null
}

function writeCsvContent(gridId: string, content: string) {
  if (!isBrowser()) return
  window.localStorage.setItem(`${CSV_CONTENT_KEY}:${storageScope()}:${gridId}`, content)
}

function deleteCsvContent(gridId: string) {
  if (!isBrowser()) return
  window.localStorage.removeItem(`${CSV_CONTENT_KEY}:${storageScope()}:${gridId}`)
}

function mapGrid(raw: Record<string, unknown>): TariffGrid {
  return {
    id: String(raw.id),
    organization_id: (raw.organization_id as string) ?? undefined,
    agent_id: (raw.agent_id as string) ?? null,
    name: String(raw.name ?? "Grille"),
    csv_path: String(raw.csv_path ?? ""),
    csv_file_name: (raw.csv_file_name as string) ?? null,
    csv_size: raw.csv_size != null ? Number(raw.csv_size) : null,
    csv_row_count: raw.csv_row_count != null ? Number(raw.csv_row_count) : null,
    csv_column_count: raw.csv_column_count != null ? Number(raw.csv_column_count) : null,
    separator: (raw.separator as string) ?? ";",
    encoding: (raw.encoding as string) ?? "UTF-8",
    headers: Array.isArray(raw.headers) ? (raw.headers as string[]) : [],
    input_mapping: (raw.input_mapping as Record<string, string>) ?? {},
    output_columns: Array.isArray(raw.output_columns) ? (raw.output_columns as string[]) : [],
    formula: String(raw.formula ?? ""),
    status: (raw.status as TariffGrid["status"]) ?? "no_file",
    created_at: String(raw.created_at ?? nowIso()),
    updated_at: (raw.updated_at as string) ?? undefined,
  }
}

async function uploadCsvToStorage(path: string, file: File): Promise<string> {
  const supabase = getSupabaseClient()
  if (!supabase) return path

  const accessToken = authStorage.getItem("access_token")
  const refreshToken = authStorage.getItem("refresh_token")
  if (accessToken && refreshToken) {
    await syncSupabaseSession({ access_token: accessToken, refresh_token: refreshToken })
  }

  const { error } = await supabase.storage.from(TARIFF_BUCKET).upload(path, file, {
    contentType: file.type || "text/csv",
    upsert: true,
  })
  if (error) throw new Error(error.message || "Échec de l'upload CSV")
  return path
}

const seedGrids = (): TariffGrid[] => [
  {
    id: "seed-assurance-auto",
    name: "Assurance auto",
    csv_path: "tariff-grids/jarvis/tarifs_assurance_auto.csv",
    csv_file_name: "tarifs_assurance_auto.csv",
    csv_size: 254_000,
    csv_row_count: 1284,
    csv_column_count: 12,
    separator: ";",
    encoding: "UTF-8",
    headers: ["PUISSANCE_BORNE_B", "CARBURANT", "DUREE", "RC_12M", "SR_IC_12M", "PRIME_12M", "TAXE"],
    input_mapping: { power: "PUISSANCE_BORNE_B", fuel_type: "CARBURANT", duration: "DUREE" },
    output_columns: ["RC_12M", "SR_IC_12M", "PRIME_12M"],
    formula: "RC_12M + SR_IC_12M",
    status: "connected",
    agent_id: "jarvis",
    created_at: "2024-05-12T10:00:00.000Z",
  },
  {
    id: "seed-transport",
    name: "Transport Brazzaville",
    csv_path: "",
    csv_file_name: null,
    csv_size: null,
    csv_row_count: null,
    csv_column_count: null,
    separator: ";",
    encoding: "UTF-8",
    headers: [],
    input_mapping: {},
    output_columns: [],
    formula: "",
    status: "no_file",
    agent_id: null,
    created_at: "2024-04-08T10:00:00.000Z",
  },
  {
    id: "seed-maintenance",
    name: "Prestations maintenance",
    csv_path: "tariff-grids/jarvis/prestations_maintenance.csv",
    csv_file_name: "prestations_maintenance.csv",
    csv_size: 120_000,
    csv_row_count: 420,
    csv_column_count: 8,
    separator: ";",
    encoding: "UTF-8",
    headers: ["TYPE", "DUREE", "PRIX"],
    input_mapping: { type: "TYPE", duration: "DUREE" },
    output_columns: ["PRIX"],
    formula: "PRIX",
    status: "ready",
    agent_id: null,
    created_at: "2024-02-03T10:00:00.000Z",
  },
]

function ensureLocalGrids(): TariffGrid[] {
  const existing = readLocalGrids()
  if (existing.length > 0) return existing
  const seeded = seedGrids()
  writeLocalGrids(seeded)
  writeCsvContent(
    "seed-assurance-auto",
    [
      "PUISSANCE_BORNE_B;CARBURANT;DUREE;RC_12M;SR_IC_12M;PRIME_12M;TAXE",
      "4;Essence;12;150,34;85,20;235,54;12,50",
      "7;Essence;12;147,62;84,13;231,75;11,80",
      "10;Diesel;12;162,10;92,40;254,50;13,20",
    ].join("\n")
  )
  return seeded
}

async function tryApi<T>(fn: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
  try {
    return await fn()
  } catch {
    return await fallback()
  }
}

export const tariffGridsService = {
  async listGrids(agentId?: string): Promise<{ grids: TariffGrid[] }> {
    return tryApi(
      async () => {
        const params: Record<string, string> = {}
        if (agentId) params.agent_id = agentId
        const { data } = await api.get<{ grids: Record<string, unknown>[] }>("/v1/tariff-grids", { params })
        return { grids: (data.grids || []).map(mapGrid) }
      },
      () => {
        const grids = ensureLocalGrids()
        return { grids: agentId ? grids.filter((g) => !g.agent_id || g.agent_id === agentId) : grids }
      }
    )
  },

  async getGrid(gridId: string): Promise<TariffGrid> {
    return tryApi(
      async () => {
        const { data } = await api.get<{ data: Record<string, unknown> }>(`/v1/tariff-grids/${gridId}`)
        return mapGrid(data.data)
      },
      () => {
        const grid = ensureLocalGrids().find((g) => g.id === gridId)
        if (!grid) throw new Error("Grille introuvable")
        return grid
      }
    )
  },

  async createGrid(payload: TariffGridCreatePayload): Promise<TariffGrid> {
    return tryApi(
      async () => {
        const { data } = await apiJson.post<{ grid: Record<string, unknown> }>("/v1/tariff-grids", payload)
        return mapGrid(data.grid)
      },
      () => {
        const grid: TariffGrid = {
          id: createId(),
          name: payload.name,
          agent_id: payload.agent_id ?? null,
          csv_path: "",
          input_mapping: {},
          output_columns: [],
          formula: "",
          status: "no_file",
          created_at: nowIso(),
        }
        const grids = ensureLocalGrids()
        grids.push(grid)
        writeLocalGrids(grids)
        return grid
      }
    )
  },

  async updateGrid(gridId: string, payload: TariffGridUpdatePayload): Promise<TariffGrid> {
    return tryApi(
      async () => {
        const { data } = await apiJson.patch<{ grid: Record<string, unknown> }>(`/v1/tariff-grids/${gridId}`, payload)
        return mapGrid(data.grid)
      },
      () => {
        const grids = ensureLocalGrids()
        const index = grids.findIndex((g) => g.id === gridId)
        if (index < 0) throw new Error("Grille introuvable")
        const next = {
          ...grids[index],
          ...payload,
          updated_at: nowIso(),
        }
        next.status = deriveGridStatus(next)
        grids[index] = next
        writeLocalGrids(grids)
        return next
      }
    )
  },

  async deleteGrid(gridId: string): Promise<void> {
    await tryApi(
      async () => {
        await api.delete(`/v1/tariff-grids/${gridId}`)
      },
      () => {
        writeLocalGrids(ensureLocalGrids().filter((g) => g.id !== gridId))
        deleteCsvContent(gridId)
      }
    )
  },

  async importCsv(gridId: string, payload: TariffGridImportPayload): Promise<TariffGrid> {
    const preview = await parseCsvFile(payload.file, { separator: payload.separator })
    if (preview.duplicateHeaders.length > 0) {
      throw new Error(`En-têtes dupliqués : ${preview.duplicateHeaders.join(", ")}`)
    }

    const csvPath = buildTariffGridPath(payload.agent_slug || "default", payload.file.name)
    try {
      await uploadCsvToStorage(csvPath, payload.file)
    } catch {
      // Local dev: keep CSV in localStorage when Supabase is unavailable.
    }
    writeCsvContent(gridId, preview.text)

    return this.updateGrid(gridId, {
      name: payload.name,
      csv_path: csvPath,
      csv_file_name: payload.file.name,
      csv_size: payload.file.size,
      csv_row_count: preview.rowCount,
      csv_column_count: preview.headers.length,
      separator: preview.separator,
      encoding: preview.encoding,
      headers: preview.headers,
      status: preview.headers.length > 0 ? "incomplete" : "invalid_csv",
    })
  },

  async connectGrid(gridId: string, agentId: string): Promise<TariffGrid> {
    return tryApi(
      async () => {
        const { data } = await apiJson.post<{ grid: Record<string, unknown> }>(
          `/v1/tariff-grids/${gridId}/connect`,
          { agent_id: agentId }
        )
        return mapGrid(data.grid)
      },
      async () => {
        const grids = ensureLocalGrids().map((g) =>
          g.agent_id === agentId ? { ...g, agent_id: null, status: deriveGridStatus({ ...g, agent_id: null }) } : g
        )
        writeLocalGrids(grids)
        return this.updateGrid(gridId, { agent_id: agentId, status: "connected" })
      }
    )
  },

  async disconnectGrid(gridId: string): Promise<TariffGrid> {
    return tryApi(
      async () => {
        const { data } = await apiJson.post<{ grid: Record<string, unknown> }>(
          `/v1/tariff-grids/${gridId}/disconnect`,
          {}
        )
        return mapGrid(data.grid)
      },
      () => this.updateGrid(gridId, { agent_id: null, status: "ready" })
    )
  },

  async getCsvContent(gridId: string): Promise<string | null> {
    const local = readCsvContent(gridId)
    if (local) return local
    return tryApi(
      async () => {
        const { data } = await api.get<{ content: string }>(`/v1/tariff-grids/${gridId}/csv`)
        return data.content
      },
      () => null
    )
  },

  async testCalculation(gridId: string, inputs: TariffGridTestInput): Promise<TariffGridTestResult> {
    return tryApi(
      async () => {
        const { data } = await apiJson.post<TariffGridTestResult>(`/v1/tariff-grids/${gridId}/test`, { inputs })
        return data
      },
      async () => {
        const grid = await this.getGrid(gridId)
        const csvText = await this.getCsvContent(gridId)
        if (!csvText) {
          return {
            success: false,
            matchCount: 0,
            outputValues: {},
            result: null,
            error: "Fichier CSV introuvable",
          }
        }
        return runTariffCalculation(grid, csvText, inputs)
      }
    )
  },

  getConnectedGridId(agentId: string): string | null {
    const grid = ensureLocalGrids().find((g) => g.agent_id === agentId)
    return grid?.id ?? null
  },
}
