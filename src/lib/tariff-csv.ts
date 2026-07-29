import Papa from "papaparse"
import type { TariffGridCsvPreview } from "@/types/tariff-grids"

const SEPARATOR_CANDIDATES = [";", ",", "\t", "|"] as const

export function detectSeparator(text: string): string {
  const firstLines = text.split(/\r?\n/).slice(0, 5).filter(Boolean)
  if (firstLines.length === 0) return ";"

  let best = ";"
  let bestScore = -1
  for (const sep of SEPARATOR_CANDIDATES) {
    const counts = firstLines.map((line) => line.split(sep).length)
    const min = Math.min(...counts)
    const max = Math.max(...counts)
    if (min > 1 && min === max) {
      const score = min * 10 + counts[0]
      if (score > bestScore) {
        bestScore = score
        best = sep
      }
    }
  }
  return best
}

export function detectEncoding(_text: string): string {
  return "UTF-8"
}

function findDuplicateHeaders(headers: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const header of headers) {
    const key = header.trim()
    if (!key) continue
    if (seen.has(key)) duplicates.add(key)
    seen.add(key)
  }
  return Array.from(duplicates)
}

export function parseCsvText(
  text: string,
  options?: { separator?: string; previewRows?: number }
): TariffGridCsvPreview {
  const separator = options?.separator || detectSeparator(text)
  const encoding = detectEncoding(text)
  const parsed = Papa.parse<string[]>(text, {
    delimiter: separator,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(parsed.errors[0]?.message || "CSV invalide")
  }

  const allRows = parsed.data.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
  if (allRows.length === 0) {
    throw new Error("Le fichier CSV est vide")
  }

  const headers = allRows[0].map((h) => String(h ?? "").trim())
  const dataRows = allRows.slice(1)
  const duplicateHeaders = findDuplicateHeaders(headers)
  const previewLimit = options?.previewRows ?? 8
  const rows = dataRows.slice(0, previewLimit).map((row) =>
    headers.map((_, i) => String(row[i] ?? "").trim())
  )

  return {
    headers,
    rows,
    rowCount: dataRows.length,
    separator,
    encoding,
    duplicateHeaders,
  }
}

export async function parseCsvFile(
  file: File,
  options?: { separator?: string; previewRows?: number }
): Promise<TariffGridCsvPreview & { text: string }> {
  const text = await file.text()
  const preview = parseCsvText(text, options)
  return { ...preview, text }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function buildTariffGridPath(agentSlug: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `tariff-grids/${agentSlug}/${safeName}`
}

export function normalizeNumericValue(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === "--") return null
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".")
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}
