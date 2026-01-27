"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { contactsService, tagsService, handleApiError } from "@/services"
import type { Tag, ContactImportResult } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Loader2,
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

export default function ImportContactsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [result, setResult] = useState<ContactImportResult | null>(null)

  // File upload
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // JSON import
  const [jsonData, setJsonData] = useState("")

  useEffect(() => {
    const loadTags = async () => {
      try {
        const result = await tagsService.getTags()
        setTags(result.tags)
      } catch (error) {
        console.error("Error loading tags:", error)
      }
    }
    loadTags()
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile)
      } else {
        toast.error("Seuls les fichiers CSV sont acceptés")
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleCsvImport = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier")
      return
    }

    setIsLoading(true)
    try {
      const importResult = await contactsService.importContactsCsv(
        file,
        selectedTags.length > 0 ? selectedTags : undefined
      )
      setResult(importResult)
      toast.success(`${importResult.imported} contacts importés`)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJsonImport = async () => {
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
      const importResult = await contactsService.importContactsJson(
        contacts,
        selectedTags.length > 0 ? selectedTags : undefined
      )
      setResult(importResult)
      toast.success(`${importResult.imported} contacts importés`)
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Résultat de l&apos;import</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Import terminé</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 w-full max-w-lg">
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{result.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                  <p className="text-sm text-muted-foreground">Importés</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                  <p className="text-sm text-muted-foreground">Mis à jour</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold text-destructive">{result.failed}</p>
                  <p className="text-sm text-muted-foreground">Échoués</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-6 w-full max-w-lg">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Erreurs</span>
                  </div>
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-left">
                    <ul className="text-sm space-y-1">
                      {result.errors.slice(0, 10).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>...et {result.errors.length - 10} autres erreurs</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={() => setResult(null)}>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importer des contacts</h1>
          <p className="text-muted-foreground">
            Importez vos contacts depuis un fichier CSV ou JSON
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
                  Format attendu: phone_number, first_name, last_name, email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25"
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

                {file && (
                  <div className="flex items-center gap-2 rounded-md border p-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Supprimer
                    </Button>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleCsvImport}
                  disabled={!file || isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importer
                </Button>
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
                <Textarea
                  placeholder={`[\n  {"phone_number": "+33612345678", "first_name": "Jean", "last_name": "Dupont"},\n  {"phone_number": "+33698765432", "first_name": "Marie"}\n]`}
                  className="h-48 font-mono text-sm"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                />

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

        <Card>
          <CardHeader>
            <CardTitle>Tags à appliquer</CardTitle>
            <CardDescription>
              Sélectionnez les tags à appliquer aux contacts importés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer"
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
      </div>
    </div>
  )
}
