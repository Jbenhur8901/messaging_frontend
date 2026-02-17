"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Papa from "papaparse"
import { contactsService, tagsService, customFieldsService, handleApiError } from "@/services"
import type { Tag, ContactImportResult, CustomField } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  Loader2,
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  X,
} from "lucide-react"

// Champs cibles pour le mapping
const TARGET_FIELDS = [
  { value: "phone_number", label: "Numéro de téléphone", required: true },
  { value: "first_name", label: "Prénom", required: false },
  { value: "last_name", label: "Nom", required: false },
  { value: "email", label: "Email", required: false },
] as const

type TargetFieldValue = typeof TARGET_FIELDS[number]["value"]

interface CsvData {
  headers: string[]
  rows: Record<string, string>[]
  delimiter: string
}

interface ColumnMapping {
  [csvColumn: string]: TargetFieldValue | "custom" | "ignore"
}

interface CustomFieldMapping {
  [csvColumn: string]: string // id du champ custom global
}

interface LocalImportError {
  row: number
  error: string
}

const normalizePhoneNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith("+")) return trimmed
  if (trimmed.startsWith("00") && trimmed.length > 2) {
    const rest = trimmed.slice(2)
    return /^\d+$/.test(rest) ? `+${rest}` : trimmed
  }
  return /^\d+$/.test(trimmed) ? `+${trimmed}` : trimmed
}

const normalizeCustomFieldValue = (field: CustomField, value: string): unknown => {
  if (field.field_type === "number") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }
  if (field.field_type === "boolean") {
    const normalized = value.toLowerCase()
    if (["true", "1", "oui", "yes"].includes(normalized)) return true
    if (["false", "0", "non", "no"].includes(normalized)) return false
    return value
  }
  if (field.field_type === "multiselect") {
    return value.split(",").map((item) => item.trim()).filter(Boolean)
  }
  if (field.field_type === "date") {
    // Accept dd/mm/yyyy and convert to ISO date for backend.
    const frMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (frMatch) {
      const [, dd, mm, yyyy] = frMatch
      return `${yyyy}-${mm}-${dd}`
    }
  }
  return value
}

const isIsoDateLike = (value: string) =>
  /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)

export default function ImportContactsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [globalCustomFields, setGlobalCustomFields] = useState<CustomField[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [result, setResult] = useState<ContactImportResult | null>(null)

  // File upload
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // CSV parsing state
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [customFieldNames, setCustomFieldNames] = useState<CustomFieldMapping>({})
  const [step, setStep] = useState<"upload" | "mapping" | "result">("upload")
  const [updateExisting, setUpdateExisting] = useState(false)
  const [localErrors, setLocalErrors] = useState<LocalImportError[]>([])

  // JSON import
  const [jsonData, setJsonData] = useState("")

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tagsResult, customFieldsResult] = await Promise.all([
          tagsService.getTags(),
          customFieldsService.getCustomFields(),
        ])
        setTags(tagsResult.tags)
        setGlobalCustomFields(
          (customFieldsResult.custom_fields || []).filter(
            (field) => !field.is_system && field.is_active !== false
          )
        )
      } catch (error) {
      }
    }
    loadData()
  }, [])

  // Auto-mapping intelligent basé sur les noms de colonnes
  const autoMapColumns = useCallback((headers: string[]) => {
    const mapping: ColumnMapping = {}
    const normalizedMap: Record<string, TargetFieldValue> = {
      phone: "phone_number",
      phone_number: "phone_number",
      phonenumber: "phone_number",
      telephone: "phone_number",
      tel: "phone_number",
      mobile: "phone_number",
      numero: "phone_number",
      numéro: "phone_number",
      first_name: "first_name",
      firstname: "first_name",
      prenom: "first_name",
      prénom: "first_name",
      first: "first_name",
      last_name: "last_name",
      lastname: "last_name",
      nom: "last_name",
      last: "last_name",
      family_name: "last_name",
      email: "email",
      mail: "email",
      courriel: "email",
      e_mail: "email",
    }

    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().trim().replace(/[\s-]/g, "_")
      if (normalizedMap[normalizedHeader]) {
        mapping[header] = normalizedMap[normalizedHeader]
      } else {
        mapping[header] = "ignore"
      }
    })

    return mapping
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const parseCsvFile = useCallback((selectedFile: File) => {
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        const rows = results.data as Record<string, string>[]
        const delimiter = results.meta.delimiter || ","

        if (headers.length === 0) {
          toast.error("Le fichier CSV est vide ou mal formaté")
          return
        }

        setCsvData({ headers, rows, delimiter })
        setColumnMapping(autoMapColumns(headers))
        setCustomFieldNames({})
        setLocalErrors([])
        setStep("mapping")
        toast.success(`${rows.length} lignes détectées (séparateur: "${delimiter}")`)
      },
      error: (error) => {
        toast.error(`Erreur de lecture: ${error.message}`)
      },
    })
  }, [autoMapColumns])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile)
        parseCsvFile(droppedFile)
      } else {
        toast.error("Seuls les fichiers CSV sont acceptés")
      }
    }
  }, [parseCsvFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      parseCsvFile(selectedFile)
    }
  }

  const handleMappingChange = (csvColumn: string, targetField: string) => {
    setLocalErrors([])
    setColumnMapping((prev) => ({
      ...prev,
      [csvColumn]: targetField as TargetFieldValue | "custom" | "ignore",
    }))
    if (targetField !== "custom") {
      setCustomFieldNames((prev) => {
        const next = { ...prev }
        delete next[csvColumn]
        return next
      })
      return
    }

    setCustomFieldNames((prev) => {
      const selected = prev[csvColumn]
      const exists =
        !!selected &&
        globalCustomFields.some((field) => field.id === selected || field.field_key === selected)
      if (exists) return prev
      const next = { ...prev }
      delete next[csvColumn]
      return next
    })
  }

  const handleCustomFieldSelection = (csvColumn: string, fieldId: string) => {
    setLocalErrors([])
    setCustomFieldNames((prev) => ({
      ...prev,
      [csvColumn]: fieldId,
    }))
  }

  // Vérifier si le mapping est valide
  const isMappingValid = useMemo(() => {
    const mappedFields = Object.values(columnMapping)
    const hasPhoneMapping = mappedFields.includes("phone_number")
    const customMappingsAreValid = Object.entries(columnMapping)
      .filter(([, targetField]) => targetField === "custom")
      .every(([csvColumn]) => Boolean(customFieldNames[csvColumn]))
    return hasPhoneMapping && customMappingsAreValid
  }, [columnMapping, customFieldNames])

  // Transformer les données CSV selon le mapping
  const transformData = useCallback(() => {
    if (!csvData) return []

    return csvData.rows.map((row) => {
      const contact: {
        phone_number: string
        first_name?: string
        last_name?: string
        email?: string
        custom_fields?: Record<string, unknown>
      } = {
        phone_number: "",
      }

      const customFields: Record<string, unknown> = {}

      Object.entries(columnMapping).forEach(([csvColumn, targetField]) => {
        const value = row[csvColumn]?.trim()
        if (!value) return

        if (targetField === "phone_number") {
          contact.phone_number = normalizePhoneNumber(value)
        } else if (targetField === "first_name") {
          contact.first_name = value
        } else if (targetField === "last_name") {
          contact.last_name = value
        } else if (targetField === "email") {
          contact.email = value
        } else if (targetField === "custom") {
          const selectedFieldToken = customFieldNames[csvColumn]
          const selectedField = globalCustomFields.find(
            (field) => field.id === selectedFieldToken || field.field_key === selectedFieldToken
          )
          const customFieldKey = selectedField?.field_key
          if (selectedField && customFieldKey) {
            customFields[customFieldKey] = normalizeCustomFieldValue(selectedField, value)
          }
        }
        // ignore = on ne fait rien
      })

      if (Object.keys(customFields).length > 0) {
        contact.custom_fields = customFields
      }

      return contact
    }).filter((c) => c.phone_number)
  }, [csvData, columnMapping, customFieldNames, globalCustomFields])

  const validateContactsForImport = useCallback(
    (contacts: Array<{ phone_number: string; custom_fields?: Record<string, unknown> }>): LocalImportError[] => {
      const errors: LocalImportError[] = []
      const allowedFields = new Map(
        globalCustomFields
          .filter((field) => field.field_key)
          .map((field) => [field.field_key, field])
      )

      contacts.forEach((contact, index) => {
        const rowNumber = index + 1
        const customFields = contact.custom_fields || {}
        Object.entries(customFields).forEach(([key, rawValue]) => {
          const field = allowedFields.get(key)
          if (!field) {
            errors.push({
              row: rowNumber,
              error: `Clé custom inconnue: ${key}`,
            })
            return
          }

          if (field.field_type === "number" && typeof rawValue !== "number") {
            errors.push({ row: rowNumber, error: `${key}: doit être un nombre` })
          }

          if (field.field_type === "boolean" && typeof rawValue !== "boolean") {
            errors.push({ row: rowNumber, error: `${key}: doit être un booléen` })
          }

          if (field.field_type === "multiselect" && !Array.isArray(rawValue)) {
            errors.push({ row: rowNumber, error: `${key}: doit être un tableau` })
          }

          if (field.field_type === "select" && Array.isArray(field.options) && field.options.length > 0) {
            if (typeof rawValue !== "string" || !field.options.includes(rawValue)) {
              errors.push({
                row: rowNumber,
                error: `${key}: valeur non autorisée`,
              })
            }
          }

          if (field.field_type === "multiselect" && Array.isArray(field.options) && field.options.length > 0) {
            if (
              Array.isArray(rawValue) &&
              rawValue.some((item) => typeof item !== "string" || !field.options?.includes(item))
            ) {
              errors.push({
                row: rowNumber,
                error: `${key}: une ou plusieurs valeurs ne sont pas autorisées`,
              })
            }
          }

          if (field.field_type === "date") {
            if (typeof rawValue !== "string" || !isIsoDateLike(rawValue)) {
              errors.push({
                row: rowNumber,
                error: `${key}: format date invalide (ISO recommandé: YYYY-MM-DD)`,
              })
            }
          }
        })
      })

      return errors
    },
    [globalCustomFields]
  )

  const handleImport = async () => {
    const contacts = transformData()
    setLocalErrors([])

    if (contacts.length === 0) {
      toast.error("Aucun contact valide à importer (numéro de téléphone manquant)")
      return
    }

    const validationErrors = validateContactsForImport(
      contacts as Array<{ phone_number: string; custom_fields?: Record<string, unknown> }>
    )
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors)
      toast.error("Erreurs de validation locale détectées")
      return
    }

    setIsLoading(true)
    try {
      const aggregatedCustomFields = contacts.reduce<Record<string, unknown>>((acc, contact) => {
        if (contact.custom_fields) {
          Object.assign(acc, contact.custom_fields)
        }
        return acc
      }, {})
      if (Object.keys(aggregatedCustomFields).length > 0) {
        await customFieldsService.validateCustomFields(aggregatedCustomFields)
      }

      const importResult = await contactsService.importContactsJson(
        contacts,
        selectedTags.length > 0 ? selectedTags : undefined,
        updateExisting
      )
      setResult(importResult)
      setStep("result")

      if (importResult.imported > 0) {
        toast.success(`${importResult.imported} contacts importés`)
      } else if (importResult.failed > 0) {
        toast.error(`Import terminé avec ${importResult.failed} erreurs`)
      }
    } catch (error) {
      const apiError = handleApiError(error)
      if (apiError.message.includes("Custom fields invalides")) {
        toast.error(`Import rejeté: ${apiError.message}`)
      }
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJsonImport = async () => {
    setLocalErrors([])
    if (!jsonData.trim()) {
      toast.error("Veuillez entrer des données JSON")
      return
    }

    let contacts
    try {
      contacts = JSON.parse(jsonData)
      if (!Array.isArray(contacts)) {
        throw new Error("Le JSON doit être un tableau")
      }
    } catch {
      toast.error("Format JSON invalide")
      return
    }

    setIsLoading(true)
    try {
      const normalizedContacts = contacts.map((contact) => {
        if (contact && typeof contact === "object" && typeof contact.phone_number === "string") {
          return {
            ...contact,
            phone_number: normalizePhoneNumber(contact.phone_number),
          }
        }
        return contact
      })

      const validationErrors = validateContactsForImport(
        normalizedContacts as Array<{ phone_number: string; custom_fields?: Record<string, unknown> }>
      )
      if (validationErrors.length > 0) {
        setLocalErrors(validationErrors)
        toast.error("Erreurs de validation locale détectées")
        setIsLoading(false)
        return
      }

      const importResult = await contactsService.importContactsJson(
        normalizedContacts,
        selectedTags.length > 0 ? selectedTags : undefined,
        updateExisting
      )
      setResult(importResult)
      setStep("result")

      if (importResult.imported > 0) {
        toast.success(`${importResult.imported} contacts importés`)
      } else if (importResult.failed > 0) {
        toast.error(`Import terminé avec ${importResult.failed} erreurs`)
      }
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetImport = () => {
    setFile(null)
    setCsvData(null)
    setColumnMapping({})
    setCustomFieldNames({})
    setResult(null)
    setLocalErrors([])
    setStep("upload")
    setJsonData("")
  }

  // Écran de résultat
  if (step === "result" && result) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">
              Résultat de l&apos;import
            </h1>
            <p className="text-muted-foreground mt-1">
              Résumé des contacts traités lors de l&apos;import.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              {result.imported > 0 ? (
                <CheckCircle className="h-8 w-8 text-emerald-600 mb-4" />
              ) : (
                <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-4" />
              )}
              <h2 className="text-xl font-semibold mb-2">
                {result.imported > 0 ? "Import terminé" : "Import terminé avec des erreurs"}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 w-full max-w-lg">
                <div className="rounded-lg border border-border/40 bg-card p-4 ">
                  <p className="text-2xl font-semibold">{result.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card p-4 ">
                  <p className="text-2xl font-semibold text-emerald-600">{result.imported}</p>
                  <p className="text-sm text-muted-foreground">Importés</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card p-4 ">
                  <p className="text-2xl font-semibold text-sky-600">{result.updated}</p>
                  <p className="text-sm text-muted-foreground">Mis à jour</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card p-4 ">
                  <p className="text-2xl font-semibold text-destructive">{result.failed}</p>
                  <p className="text-sm text-muted-foreground">Échoués</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-6 w-full max-w-lg">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Erreurs ({result.errors.length})</span>
                  </div>
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-left max-h-60 overflow-y-auto">
                    <ul className="text-sm space-y-1">
                      {result.errors.slice(0, 20).map((error, i) => (
                        <li key={i} className="flex gap-2">
                          {typeof error === "object" && error !== null ? (
                            <>
                              <span className="font-medium text-muted-foreground">
                                Ligne {(error as { row?: number }).row || i + 1}:
                              </span>
                              <span>{(error as { error?: string }).error || JSON.stringify(error)}</span>
                            </>
                          ) : (
                            <span>{String(error)}</span>
                          )}
                        </li>
                      ))}
                      {result.errors.length > 20 && (
                        <li className="text-muted-foreground">
                          ...et {result.errors.length - 20} autres erreurs
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={resetImport}>
                  Nouvel import
                </Button>
                <Link href="/contacts">
                  <Button>Voir les contacts</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Écran de mapping des colonnes
  if (step === "mapping" && csvData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("upload")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Mapper les colonnes</h1>
            <p className="text-muted-foreground mt-1">
              Associez chaque colonne de votre fichier aux champs de contact.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fichier: {file?.name}</CardTitle>
            <CardDescription>
              {csvData.rows.length} lignes - Séparateur détecté: &quot;{csvData.delimiter}&quot;
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Format attendu pour le numéro: international (ex. +33612345678). Les numéros sans
              &quot;+&quot; seront automatiquement préfixés.
            </p>
            {/* Mapping des colonnes */}
            <div className="space-y-4">
              <h3 className="font-medium">Correspondance des colonnes</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colonne CSV</TableHead>
                      <TableHead>Exemple</TableHead>
                      <TableHead></TableHead>
                      <TableHead>Champ cible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.headers.map((header) => (
                      <TableRow key={header}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {csvData.rows[0]?.[header] || "-"}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={columnMapping[header] || "ignore"}
                            onValueChange={(value) => handleMappingChange(header, value)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ignore">
                                <span className="flex items-center gap-2">
                                  <X className="h-4 w-4" />
                                  Ignorer
                                </span>
                              </SelectItem>
                              {TARGET_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                  {field.required && <span className="text-destructive ml-1">*</span>}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Champ personnalisé</SelectItem>
                            </SelectContent>
                          </Select>
                          {columnMapping[header] === "custom" && (
                            <div className="mt-2 space-y-2">
                              <Select
                                value={customFieldNames[header] || "unselected"}
                                onValueChange={(value) => {
                                  if (value !== "unselected") {
                                    handleCustomFieldSelection(header, value)
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[260px]">
                                  <SelectValue placeholder="Sélectionner un champ global" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unselected">Sélectionner...</SelectItem>
                                  {globalCustomFields.map((field) => (
                                    <SelectItem key={field.id} value={field.id}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {globalCustomFields.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Aucun champ personnalisé global disponible. Créez-en dans{" "}
                                  <Link href="/contacts/tags?tab=fields" className="text-primary hover:underline">
                                    Paramétrage
                                  </Link>
                                  .
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {!isMappingValid && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    Vous devez mapper une colonne vers &quot;Numéro de téléphone&quot; et sélectionner un champ global pour chaque
                    mapping &quot;Champ personnalisé&quot;.
                  </span>
                </div>
              )}
            </div>

            {localErrors.length > 0 && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <p className="mb-2 text-sm font-medium text-destructive">
                  Erreurs locales détectées ({localErrors.length})
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                  {localErrors.slice(0, 20).map((error, i) => (
                    <li key={`${error.row}-${i}`}>
                      Ligne {error.row}: {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Aperçu des données transformées */}
            <div className="space-y-4">
              <h3 className="font-medium">Aperçu (5 premières lignes)</h3>
                <div className="rounded-md border border-border/40 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Champs custom</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transformData().slice(0, 5).map((contact, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{contact.phone_number || "-"}</TableCell>
                        <TableCell>{contact.first_name || "-"}</TableCell>
                        <TableCell>{contact.last_name || "-"}</TableCell>
                        <TableCell>{contact.email || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contact.custom_fields
                            ? Object.entries(contact.custom_fields).map(([k, v]) => `${k}: ${v}`).join(", ")
                            : "-"
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="font-medium">Tags à appliquer</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    style={{
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                      borderColor: tag.color,
                    }}
                    onClick={() => {
                      if (selectedTags.includes(tag.id)) {
                        setSelectedTags(selectedTags.filter((id) => id !== tag.id))
                      } else {
                        setSelectedTags([...selectedTags, tag.id])
                      }
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <p className="text-muted-foreground text-sm">Aucun tag disponible</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="update-existing"
                checked={updateExisting}
                onCheckedChange={(checked) => setUpdateExisting(checked === true)}
              />
              <label htmlFor="update-existing" className="text-sm text-muted-foreground">
                Mettre à jour les contacts existants (`update_existing=true`)
              </label>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button onClick={handleImport} disabled={!isMappingValid || isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importer {transformData().length} contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Écran d'upload initial
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Importer des contacts</h1>
          <p className="text-muted-foreground mt-1">
            Importez vos contacts depuis un fichier CSV ou JSON.
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Tabs defaultValue="csv">
          <TabsList>
            <TabsTrigger value="csv">Fichier CSV</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="csv">
            <Card>
              <CardHeader>
                <CardTitle>Import CSV</CardTitle>
                <CardDescription>
                  Glissez votre fichier CSV - les colonnes seront détectées automatiquement
                  (supporte les séparateurs &quot;,&quot; et &quot;;&quot;)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Format attendu pour le numéro: international (ex. +33612345678). Les numéros sans
                  &quot;+&quot; seront automatiquement préfixés.
                </p>
                <div
                  className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border/40 bg-muted/40"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Glissez-déposez votre fichier CSV ici, ou
                  </p>
                  <label htmlFor="file-upload">
                    <Button variant="outline" asChild>
                      <span>Parcourir</span>
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {file && !csvData && (
                  <div className="flex items-center gap-2 rounded-md border border-border/40 bg-card p-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json">
            <Card>
              <CardHeader>
                <CardTitle>Import JSON</CardTitle>
                <CardDescription>
                  Format: [{`{`}&quot;phone_number&quot;: &quot;+33...&quot;, &quot;first_name&quot;: &quot;...&quot;{`}`}]
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Format attendu pour le numéro: international (ex. +33612345678). Les numéros sans
                  &quot;+&quot; seront automatiquement préfixés.
                </p>
                <Textarea
                  placeholder={`[\n  {"phone_number": "+33612345678", "first_name": "Jean", "last_name": "Dupont"},\n  {"phone_number": "+33698765432", "first_name": "Marie"}\n]`}
                  className="h-48 font-mono text-sm"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                />

                {localErrors.length > 0 && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                    <p className="mb-2 text-sm font-medium text-destructive">
                      Erreurs locales détectées ({localErrors.length})
                    </p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                      {localErrors.slice(0, 20).map((error, i) => (
                        <li key={`${error.row}-${i}`}>
                          Ligne {error.row}: {error.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags pour JSON */}
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tags à appliquer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                          className="cursor-pointer transition-colors"
                          style={{
                            backgroundColor: selectedTags.includes(tag.id)
                              ? tag.color
                              : undefined,
                            borderColor: tag.color,
                          }}
                          onClick={() => {
                            if (selectedTags.includes(tag.id)) {
                              setSelectedTags(selectedTags.filter((id) => id !== tag.id))
                            } else {
                              setSelectedTags([...selectedTags, tag.id])
                            }
                          }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {tags.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                          Aucun tag disponible
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  className="w-full"
                  onClick={handleJsonImport}
                  disabled={!jsonData.trim() || isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importer
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
