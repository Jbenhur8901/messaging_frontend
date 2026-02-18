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
  conversationClosed?: boolean
}

export function MessageComposer({
  onSendText,
  onSendMedia,
  isSending,
  disabled,
  conversationClosed,
}: MessageComposerProps) {
  const [text, setText] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaTypeRef = useRef<"image" | "document" | "audio">("image")

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    setText("")
    await onSendText(trimmed)
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
      await onSendMedia({
        media_type: mediaTypeRef.current,
        media_id: result.media_id,
        filename: file.name,
      })
    } catch {
      toast.error("Erreur lors de l'upload du fichier")
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

  if (conversationClosed) {
    return (
      <div className="flex items-center gap-2 border-t px-4 py-3 bg-muted/50 shrink-0">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-xs text-muted-foreground flex-1">
          La fen&ecirc;tre de conversation est ferm&eacute;e. Seuls les templates peuvent &ecirc;tre envoy&eacute;s.
        </span>
        <Button variant="outline" size="sm" disabled>
          Envoyer un template
        </Button>
      </div>
    )
  }

  return (
    <div className="border-t px-3 py-2 shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="flex items-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
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
          placeholder="Tapez un message..."
          className="min-h-[36px] max-h-[120px] resize-none text-sm"
          rows={1}
          disabled={disabled || isSending || isUploading}
        />

        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || disabled || isSending || isUploading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
