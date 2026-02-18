"use client"

import { useCallback, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Image, Video, File, X, Loader2 } from "lucide-react"

const ACCEPTED_MIME_TYPES: Record<string, string> = {
  IMAGE: "image/jpeg,image/png,image/webp",
  VIDEO: "video/mp4,video/3gpp",
  DOCUMENT: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

const FORMAT_ICONS: Record<string, typeof Image> = {
  IMAGE: Image,
  VIDEO: Video,
  DOCUMENT: File,
}

const FORMAT_LABELS: Record<string, string> = {
  IMAGE: "une image",
  VIDEO: "une vidéo",
  DOCUMENT: "un document",
}

interface HeaderMediaUploadProps {
  headerMediaFormat: string
  headerFile: File | null
  headerMediaUrl: string
  headerUploading: boolean
  onFileSelected: (file: File) => void
  onRemove: () => void
}

export function HeaderMediaUpload({
  headerMediaFormat,
  headerFile,
  headerMediaUrl,
  headerUploading,
  onFileSelected,
  onRemove,
}: HeaderMediaUploadProps) {
  const [dragActive, setDragActive] = useState(false)

  const Icon = FORMAT_ICONS[headerMediaFormat] || File

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      const file = e.dataTransfer.files?.[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected]
  )

  return (
    <Card className="border-transparent">
      <CardContent className="p-4 space-y-3">
        <div>
          <h2 className="text-[14px] font-semibold tracking-tight flex items-center gap-2">
            <Icon className="h-3.5 w-3.5" />
            Header du template
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Ce template nécessite {FORMAT_LABELS[headerMediaFormat] || "un fichier"} en header.
          </p>
        </div>

        {headerFile && headerMediaUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-md border border-border/40 p-3">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{headerFile.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemove}>
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Supprimer</span>
              </Button>
            </div>
            {headerMediaFormat === "IMAGE" && (
              <div className="rounded-md border border-border/40 overflow-hidden">
                <img
                  src={headerMediaUrl}
                  alt="Aperçu header"
                  className="max-h-48 w-full object-contain bg-muted/30"
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border/40 bg-muted/30"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {headerUploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload en cours...</p>
              </div>
            ) : (
              <>
                <Icon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Glissez-déposez votre fichier ici, ou
                </p>
                <label htmlFor="header-media-upload">
                  <Button variant="outline" size="sm" asChild>
                    <span>Parcourir</span>
                  </Button>
                  <input
                    id="header-media-upload"
                    type="file"
                    accept={ACCEPTED_MIME_TYPES[headerMediaFormat] || "*/*"}
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
