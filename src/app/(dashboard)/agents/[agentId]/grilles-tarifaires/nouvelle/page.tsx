"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle,
  Database,
  FileCsv,
  Spinner,
  Trash,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { handleApiError, tariffGridsService } from "@/services"
import type { TariffGrid } from "@/types/tariff-grids"
import { buildTariffGridPath, formatFileSize, parseCsvFile } from "@/lib/tariff-csv"
import { Skeleton } from "@/components/ui/skeleton"
import { AGENT_CATALOG } from "../../../_catalog"

const SEPARATOR_OPTIONS = [
  { value: ";", label: "Point-virgule (;)" },
  { value: ",", label: "Virgule (,)" },
  { value: "\t", label: "Tabulation" },
  { value: "|", label: "Pipe (|)" },
]

export default function NouvelleGrillePage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const gridIdParam = searchParams.get("gridId")
  const presentation = AGENT_CATALOG.find((a) => a.id === agentId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(Boolean(gridIdParam))
  const [grid, setGrid] = useState<TariffGrid | null>(null)
  const [name, setName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [separator, setSeparator] = useState(";")
  const [encoding, setEncoding] = useState("UTF-8")
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [rowCount, setRowCount] = useState(0)
  const [csvPath, setCsvPath] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!gridIdParam) return
    let active = true
    tariffGridsService.getGrid(gridIdParam).then((loaded) => {
      if (!active) return
      setGrid(loaded)
      setName(loaded.name)
      setSeparator(loaded.separator || ";")
      setEncoding(loaded.encoding || "UTF-8")
      setHeaders(loaded.headers || [])
      setCsvPath(loaded.csv_path || "")
      setRowCount(loaded.csv_row_count || 0)
      setIsLoading(false)
    }).catch(() => {
      toast.error("Grille introuvable")
      router.replace(`/agents/${agentId}/grilles-tarifaires`)
    })
    return () => { active = false }
  }, [gridIdParam, agentId, router])

  const handleFile = async (selected: File) => {
    setIsParsing(true)
    try {
      const preview = await parseCsvFile(selected, { separator })
      if (preview.duplicateHeaders.length > 0) {
        toast.error(`En-têtes dupliqués : ${preview.duplicateHeaders.join(", ")}`)
        return
      }
      setFile(selected)
      setHeaders(preview.headers)
      setPreviewRows(preview.rows)
      setRowCount(preview.rowCount)
      setSeparator(preview.separator)
      setEncoding(preview.encoding)
      setCsvPath(buildTariffGridPath(agentId, selected.name))
      if (!name.trim()) setName(selected.name.replace(/\.csv$/i, ""))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV invalide")
    } finally {
      setIsParsing(false)
    }
  }

  const handleContinue = async () => {
    if (!file || !name.trim()) {
      toast.error("Nom et fichier CSV requis")
      return
    }
    setIsSaving(true)
    try {
      let targetId = grid?.id
      if (!targetId) {
        const created = await tariffGridsService.createGrid({ name: name.trim(), agent_id: undefined })
        targetId = created.id
      }
      const updated = await tariffGridsService.importCsv(targetId, {
        file,
        name: name.trim(),
        separator,
        agent_slug: agentId,
      })
      toast.success("Fichier importé")
      router.push(`/agents/${agentId}/grilles-tarifaires/${updated.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : handleApiError(error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const ready = Boolean(file && headers.length > 0)

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
        <span className="text-foreground">Nouvelle grille</span>
      </nav>

      <div>
        <Link
          href={`/agents/${agentId}/grilles-tarifaires`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
          Retour
        </Link>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Import de la grille
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nouvelle grille tarifaire</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Importez un fichier CSV pour détecter automatiquement ses colonnes.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
              <p className="mb-4 text-[13px] font-semibold text-foreground">Fichier CSV</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0]
                  if (selected) handleFile(selected)
                }}
              />
              {!file ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const dropped = e.dataTransfer.files?.[0]
                    if (dropped) handleFile(dropped)
                  }}
                  className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border/50 bg-muted/10 py-12 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  {isParsing ? (
                    <Spinner className="h-8 w-8 animate-spin text-primary" weight="bold" />
                  ) : (
                    <FileCsv className="h-10 w-10 text-muted-foreground/40" weight="duotone" />
                  )}
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-foreground">Déposez votre fichier CSV ici</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                      ou cliquez pour sélectionner un fichier · 10 Mo maximum
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing}
                    className="rounded-xl border border-border/50 bg-card/50 px-4 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-50"
                  >
                    Choisir un fichier
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-500/90">
                      <FileCsv className="h-5 w-5 text-white" weight="fill" />
                    </span>
                    <div>
                      <p className="text-[12px] font-medium text-foreground">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground/60">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-400" weight="fill" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-border/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Remplacer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null)
                        setHeaders([])
                        setPreviewRows([])
                        setRowCount(0)
                        setCsvPath("")
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" weight="regular" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {file && headers.length > 0 && (
              <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
                <p className="mb-1 text-[13px] font-semibold text-foreground">Aperçu des données</p>
                <p className="mb-4 text-[11px] text-muted-foreground/60">
                  {headers.length} colonnes détectées · {rowCount.toLocaleString("fr-FR")} lignes
                </p>
                <div className="overflow-x-auto rounded-xl border border-border/40">
                  <table className="w-full min-w-[600px] text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        {headers.map((header) => (
                          <th key={header} className="px-3 py-2 font-semibold text-foreground">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-border/20 last:border-0">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-muted-foreground">{cell || "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-4">
              <p className="text-[13px] font-semibold text-foreground">Informations</p>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Nom de la grille</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border/50 bg-card/50 px-3 text-[12px] text-foreground focus:border-primary/40 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Séparateur</label>
                <select
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border/50 bg-card/50 px-3 text-[12px] text-foreground focus:border-primary/40 focus:outline-none"
                >
                  {SEPARATOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Encodage</label>
                <select
                  value={encoding}
                  onChange={(e) => setEncoding(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border/50 bg-card/50 px-3 text-[12px] text-foreground focus:border-primary/40 focus:outline-none"
                >
                  <option value="UTF-8">UTF-8</option>
                  <option value="ISO-8859-1">ISO-8859-1</option>
                </select>
              </div>
              {csvPath && (
                <div className="flex items-start gap-2.5 rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" weight="regular" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Stockage</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{csvPath}</p>
                  </div>
                </div>
              )}
              {ready && (
                <p className="flex items-center gap-1.5 text-[12px] text-emerald-400">
                  <CheckCircle className="h-4 w-4" weight="fill" />
                  Le fichier est prêt à être configuré
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/40 pt-4">
        <Link
          href={`/agents/${agentId}/grilles-tarifaires`}
          className="rounded-xl border border-border/50 px-4 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Annuler
        </Link>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!ready || isSaving}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving && <Spinner className="h-3.5 w-3.5 animate-spin" weight="bold" />}
          Continuer vers le mapping →
        </button>
      </div>
    </div>
  )
}
