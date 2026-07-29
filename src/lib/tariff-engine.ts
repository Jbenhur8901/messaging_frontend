import Papa from "papaparse"
import { normalizeNumericValue } from "@/lib/tariff-csv"
import { evaluateFormula } from "@/lib/tariff-formula"
import type { TariffGrid, TariffGridTestInput, TariffGridTestResult } from "@/types/tariff-grids"

function normalizeMatchValue(value: string): string {
  return value.trim().toLowerCase()
}

function rowMatches(
  row: Record<string, string>,
  inputMapping: Record<string, string>,
  inputs: TariffGridTestInput
): boolean {
  for (const [field, column] of Object.entries(inputMapping)) {
    const expected = inputs[field]
    if (expected === undefined || expected === "") continue
    const actual = row[column] ?? ""
    if (normalizeMatchValue(actual) !== normalizeMatchValue(expected)) {
      return false
    }
  }
  return true
}

export function parseCsvRows(text: string, separator: string): Record<string, string>[] {
  const parsed = Papa.parse<string[]>(text, {
    delimiter: separator,
    skipEmptyLines: true,
  })
  const allRows = parsed.data.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
  if (allRows.length < 2) return []
  const headers = allRows[0].map((h) => String(h ?? "").trim())
  return allRows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, i) => [header, String(row[i] ?? "").trim()]))
  )
}

export function runTariffCalculation(
  grid: TariffGrid,
  csvText: string,
  inputs: TariffGridTestInput
): TariffGridTestResult {
  const separator = grid.separator || ";"
  const rows = parseCsvRows(csvText, separator)
  const matches = rows.filter((row) => rowMatches(row, grid.input_mapping, inputs))

  if (matches.length === 0) {
    return {
      success: false,
      matchCount: 0,
      outputValues: {},
      result: null,
      error: "Aucune ligne trouvée",
    }
  }
  if (matches.length > 1) {
    return {
      success: false,
      matchCount: matches.length,
      outputValues: {},
      result: null,
      error: `${matches.length} lignes correspondent — la recherche doit être unique`,
    }
  }

  const matched = matches[0]
  const outputValues: Record<string, number | null> = {}
  const numericVars: Record<string, number> = {}

  for (const column of grid.headers || []) {
    const raw = matched[column] ?? ""
    const num = normalizeNumericValue(raw)
    outputValues[column] = num
    if (num !== null) numericVars[column] = num
  }

  try {
    const result = grid.formula.trim()
      ? evaluateFormula(grid.formula, numericVars)
      : null
    return {
      success: true,
      matchCount: 1,
      outputValues,
      result,
    }
  } catch (error) {
    return {
      success: false,
      matchCount: 1,
      outputValues,
      result: null,
      error: error instanceof Error ? error.message : "Erreur de calcul",
    }
  }
}

export function deriveGridStatus(grid: Pick<TariffGrid, "csv_path" | "headers" | "input_mapping" | "output_columns" | "formula" | "agent_id">): TariffGrid["status"] {
  if (!grid.csv_path) return "no_file"
  if (!grid.headers?.length) return "invalid_csv"
  const hasMapping = Object.keys(grid.input_mapping).length > 0
  const hasOutputs = grid.output_columns.length > 0
  if (!hasMapping || !hasOutputs) return "incomplete"
  if (!grid.formula.trim()) return "incomplete"
  return grid.agent_id ? "connected" : "ready"
}
