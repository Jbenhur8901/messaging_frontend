"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Send, Paperclip, Image, FileText, Music, AlertCircle } from "lucide-react"
import { whatsappService } from "@/services/whatsapp"
import { toast } from "sonner"

interface MessageComposerProps {
  onSendText: (text: string) => Promise<void>
  onSendMedia: (payload: {
    media_type: "image" | "video" | "audio" | "document"
    media_id?: string
    caption?: string
    filename?: string
  }) => Promise<void>
  isSending: boolean
  disabled?: boolean
  blockedReason?: string | null
}

export function MessageComposer({
  onSendText,
  onSendMedia,
  isSending,
  disabled,
  blockedReason,
}: MessageComposerProps) {
  const [text, setText] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaTypeRef = useRef<"image" | "document" | "audio">("image")

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    try {
      await onSendText(trimmed)
      setText("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le message n'a pas pu être envoyé")
    }
  }, [text, isSending, onSendText])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    setIsUploading(true)
    try {
      const result = await whatsappService.uploadMedia(file)
      if (!result.media_id) {
        toast.error("Upload réussi mais aucun identifiant média retourné")
        setIsUploading(false)
        return
      }
      await onSendMedia({
        media_type: mediaTypeRef.current,
        media_id: result.media_id,
        filename: file.name,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'envoi du fichier")
    } finally {
      setIsUploading(false)
    }
  }

  const openFilePicker = (type: "image" | "document" | "audio") => {
    mediaTypeRef.current = type
    const accepts: Record<string, string> = {
      image: "image/*",
      document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip",
      audio: "audio/*",
    }
    if (fileInputRef.current) {
      fileInputRef.current.accept = accepts[type]
      fileInputRef.current.click()
    }
  }

  if (blockedReason) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-card px-4 py-4">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-xs text-muted-foreground flex-1">
          {blockedReason}
        </span>
      </div>
    )
  }

  return (
    <div className="shrink-0 border-t border-border/60 bg-card/95 px-3 py-3 sm:px-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="mx-auto flex max-w-4xl items-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              disabled={disabled || isSending || isUploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => openFilePicker("image")}>
              <Image className="h-4 w-4 mr-2" />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openFilePicker("document")}>
              <FileText className="h-4 w-4 mr-2" />
              Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openFilePicker("audio")}>
              <Music className="h-4 w-4 mr-2" />
              Audio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message"
          className="min-h-10 max-h-[120px] resize-none rounded-xl border-transparent bg-muted/50 px-4 py-2.5 text-sm focus-visible:border-primary/30"
          rows={1}
          disabled={disabled || isSending || isUploading}
        />

        <Button
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={handleSend}
          disabled={!text.trim() || disabled || isSending || isUploading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
