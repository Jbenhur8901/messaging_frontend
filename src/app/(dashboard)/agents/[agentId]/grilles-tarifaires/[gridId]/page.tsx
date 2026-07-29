"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  FloppyDisk,
  Function as FunctionIcon,
  Plug,
  Plus,
  Spinner,
  Trash,
  XCircle,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { agentsService, handleApiError, tariffGridsService } from "@/services"
import type { TariffGrid } from "@/types/tariff-grids"
import { validateFormula } from "@/lib/tariff-formula"
import { Skeleton } from "@/components/ui/skeleton"
import { AGENT_CATALOG } from "../../../_catalog"

type MappingRow = { id: string; field: string; column: string }

const createMappingRow = (field = "", column = ""): MappingRow => ({
  id: Math.random().toString(36).slice(2, 9),
  field,
  column,
})

export default function GrilleConfigPage({ params }: { params: Promise<{ agentId: string; gridId: string }> }) {
  const { agentId, gridId } = use(params)
  const router = useRouter()
  const presentation = AGENT_CATALOG.find((a) => a.id === agentId)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [grid, setGrid] = useState<TariffGrid | null>(null)
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([createMappingRow()])
  const [outputColumns, setOutputColumns] = useState<string[]>([])
  const [formula, setFormula] = useState("")
  const [testInputs, setTestInputs] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<{
    success: boolean
    outputValues: Record<string, number | null>
    result: number | null
    error?: string
  } | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      try {
        const loaded = await tariffGridsService.getGrid(gridId)
        if (!active) return
        setGrid(loaded)
        const rows = Object.entries(loaded.input_mapping).map(([field, column]) =>
          createMappingRow(field, column)
        )
        setMappingRows(rows.length > 0 ? rows : [createMappingRow()])
        setOutputColumns(loaded.output_columns)
        setFormula(loaded.formula)
        setTestInputs(Object.fromEntries(Object.keys(loaded.input_mapping).map((k) => [k, ""])))
      } catch {
        toast.error("Grille introuvable")
        router.replace(`/agents/${agentId}/grilles-tarifaires`)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [gridId, agentId, router])

  const headers = grid?.headers || []
  const formulaValidation = useMemo(
    () => validateFormula(formula, outputColumns.length > 0 ? outputColumns : headers),
    [formula, outputColumns, headers]
  )

  const inputMapping = useMemo(() => {
    const mapping: Record<string, string> = {}
    for (const row of mappingRows) {
      const field = row.field.trim()
      const column = row.column.trim()
      if (field && column) mapping[field] = column
    }
    return mapping
  }, [mappingRows])

  const handleSave = async (connect = false) => {
    if (!grid) return
    setIsSaving(true)
    try {
      const updated = await tariffGridsService.updateGrid(grid.id, {
        input_mapping: inputMapping,
        output_columns: outputColumns,
        formula,
        status: formulaValidation.valid ? "ready" : "invalid_formula",
      })
      if (connect) {
        const agent = await agentsService.getAgentByIdOrSlug(agentId)
        await tariffGridsService.connectGrid(updated.id, agent.id)
        toast.success("Configuration enregistrée et connectée")
      } else {
        toast.success("Configuration enregistrée")
      }
      router.push(`/agents/${agentId}/grilles-tarifaires`)
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!grid) return
    setIsTesting(true)
    setTestResult(null)
    try {
      await tariffGridsService.updateGrid(grid.id, {
        input_mapping: inputMapping,
        output_columns: outputColumns,
        formula,
      })
      const result = await tariffGridsService.testCalculation(grid.id, testInputs)
      setTestResult({
        success: result.success,
        outputValues: result.outputValues,
        result: result.result,
        error: result.error,
      })
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsTesting(false)
    }
  }

  const formatNumber = (value: number | null | undefined) => {
    if (value == null) return "—"
    return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (isLoading || !grid) {
    return <Skeleton className="mx-auto mt-6 h-96 max-w-6xl rounded-2xl" />
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Link href="/agents" className="transition-colors hover:text-foreground">Agents IA</Link>
        <span>/</span>
        <Link href={`/agents/${agentId}`} className="transition-colors hover:text-foreground">
          {presentation?.label || agentId}
        </Link>
        <span>/</span>
        <Link href={`/agents/${agentId}/grilles-tarifaires`} className="transition-colors hover:text-foreground">
          Grilles tarifaires
        </Link>
        <span>/</span>
        <span className="text-foreground">{grid.name}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/agents/${agentId}/grilles-tarifaires`}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" weight="bold" />
            Retour
          </Link>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Configuration de la grille
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{grid.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {grid.csv_file_name} · {grid.csv_column_count} colonnes · {(grid.csv_row_count || 0).toLocaleString("fr-FR")} lignes
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-4 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {isSaving ? <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" /> : <FloppyDisk className="h-4 w-4" weight="regular" />}
          Enregistrer
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            <p className="mb-1 text-[13px] font-semibold text-foreground">Champs d&apos;entrée</p>
            <p className="mb-4 text-[11px] text-muted-foreground/60">
              Associez les champs utilisés par l&apos;agent aux colonnes du CSV.
            </p>
            <div className="space-y-2">
              {mappingRows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.field}
                    onChange={(e) => {
                      const value = e.target.value
                      setMappingRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, field: value } : r)))
                      setTestInputs((prev) => {
                        const next = { ...prev }
                        if (value.trim()) next[value.trim()] = prev[row.field] || ""
                        if (row.field.trim() && row.field !== value) delete next[row.field.trim()]
                        return next
                      })
                    }}
                    placeholder="power"
                    className="h-9 flex-1 rounded-xl border border-border/50 bg-card/50 px-3 text-[12px] focus:border-primary/40 focus:outline-none"
                  />
                  <span className="text-muted-foreground/40">→</span>
                  <select
                    value={row.column}
                    onChange={(e) => setMappingRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, column: e.target.value } : r)))}
                    className="h-9 flex-1 rounded-xl border border-border/50 bg-card/50 px-3 text-[12px] focus:border-primary/40 focus:outline-none"
                  >
                    <option value="">Colonne CSV</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setMappingRows((prev) => prev.filter((r) => r.id !== row.id))}
                    className="rounded-lg p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash className="h-4 w-4" weight="regular" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMappingRows((prev) => [...prev, createMappingRow()])}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 py-2.5 text-[12px] text-muted-foreground hover:border-primary/30 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" weight="bold" />
              Ajouter un champ
            </button>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            <p className="mb-4 text-[13px] font-semibold text-foreground">Colonnes de sortie</p>
            <div className="flex flex-wrap gap-3">
              {headers.map((header) => (
                <label key={header} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/40 px-3 py-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={outputColumns.includes(header)}
                    onChange={(e) => {
                      setOutputColumns((prev) =>
                        e.target.checked ? [...prev, header] : prev.filter((c) => c !== header)
                      )
                    }}
                    className="accent-primary"
                  />
                  {header}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            <p className="mb-4 text-[13px] font-semibold text-foreground">Formule</p>
            <div className="relative">
              <FunctionIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" weight="bold" />
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="RC_12M + SR_IC_12M"
                className="h-10 w-full rounded-xl border border-border/50 bg-card/50 px-3 pr-10 font-mono text-[12px] focus:border-primary/40 focus:outline-none"
              />
            </div>
            {formula.trim() && (
              <p className={`mt-2 flex items-center gap-1.5 text-[12px] ${formulaValidation.valid ? "text-emerald-400" : "text-destructive"}`}>
                {formulaValidation.valid ? (
                  <><CheckCircle className="h-4 w-4" weight="fill" /> Formule valide</>
                ) : (
                  <><XCircle className="h-4 w-4" weight="fill" /> {formulaValidation.error}</>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <p className="mb-1 text-[13px] font-semibold text-foreground">Tester le calcul</p>
          <p className="mb-4 text-[11px] text-muted-foreground/60">
            Testez la grille comme l&apos;agent l&apos;utilisera.
          </p>
          <div className="space-y-3">
            {Object.keys(inputMapping).map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-[11px] text-muted-foreground">{field}</label>
                <input
                  type="text"
                  value={testInputs[field] || ""}
                  onChange={(e) => setTestInputs((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-border/50 bg-card/50 px-3 text-[12px] focus:border-primary/40 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || Object.keys(inputMapping).length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isTesting ? <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" /> : <Calculator className="h-4 w-4" weight="bold" />}
            Calculer
          </button>

          {testResult && (
            <div className="mt-5 space-y-4 border-t border-border/40 pt-4">
              <p className={`flex items-center gap-1.5 text-[12px] font-medium ${testResult.success ? "text-emerald-400" : "text-destructive"}`}>
                {testResult.success ? (
                  <><CheckCircle className="h-4 w-4" weight="fill" /> Ligne trouvée</>
                ) : (
                  <><XCircle className="h-4 w-4" weight="fill" /> {testResult.error}</>
                )}
              </p>
              {testResult.success && (
                <>
                  <div className="space-y-1.5">
                    {outputColumns.map((col) => (
                      <div key={col} className="flex justify-between text-[12px]">
                        <span className="text-muted-foreground">{col}</span>
                        <span className="font-medium">{formatNumber(testResult.outputValues[col])}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border/30 bg-muted/10 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Résultat calculé</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{formatNumber(testResult.result)}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
        <Link
          href={`/agents/${agentId}/grilles-tarifaires`}
          className="rounded-xl border border-border/50 px-4 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Annuler
        </Link>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={isSaving || !formulaValidation.valid}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isSaving ? <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" /> : <Plug className="h-4 w-4" weight="bold" />}
          Enregistrer et connecter
        </button>
      </div>
    </div>
  )
}
