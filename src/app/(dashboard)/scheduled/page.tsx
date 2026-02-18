"use client"

import { useState, useEffect, useCallback } from "react"
import { whatsappService } from "@/services/whatsapp"
import { handleApiError } from "@/services"
import type { ScheduledMessage } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Clock, Plus, X, Send, Radio, Loader2 } from "lucide-react"
import { formatDate, truncate } from "@/lib/utils"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "default" },
  processing: { label: "En cours", variant: "secondary" },
  sent: { label: "Envoy\u00e9", variant: "outline" },
  failed: { label: "\u00c9chou\u00e9", variant: "destructive" },
  cancelled: { label: "Annul\u00e9", variant: "secondary" },
}

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formType, setFormType] = useState<"text" | "template">("text")
  const [formTo, setFormTo] = useState("")
  const [formScheduledAt, setFormScheduledAt] = useState("")
  const [formTimezone, setFormTimezone] = useState("Africa/Douala")
  const [formText, setFormText] = useState("")
  const [formTemplateName, setFormTemplateName] = useState("")
  const [formTemplateLanguage, setFormTemplateLanguage] = useState("fr")

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await whatsappService.getScheduledMessages(
        statusFilter === "all" ? undefined : statusFilter
      )
      setMessages(result.scheduled_messages || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const handleCancel = async (id: string) => {
    try {
      await whatsappService.cancelScheduledMessage(id)
      toast.success("Message annul\u00e9")
      loadMessages()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const handleSchedule = async () => {
    if (!formTo || !formScheduledAt) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }
    setIsSubmitting(true)
    try {
      await whatsappService.scheduleMessage({
        to: formTo,
        message_type: formType,
        scheduled_at: formScheduledAt,
        timezone: formTimezone,
        template_name: formType === "template" ? formTemplateName : undefined,
        template_language: formType === "template" ? formTemplateLanguage : undefined,
        text_body: formType === "text" ? formText : undefined,
      })
      toast.success("Message programm\u00e9")
      setIsDialogOpen(false)
      setFormTo("")
      setFormScheduledAt("")
      setFormText("")
      setFormTemplateName("")
      loadMessages()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const counts = {
    all: messages.length,
    pending: messages.filter((m) => m.status === "pending").length,
    sent: messages.filter((m) => m.status === "sent").length,
    failed: messages.filter((m) => m.status === "failed").length,
    cancelled: messages.filter((m) => m.status === "cancelled").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Messages programm&eacute;s
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            G&eacute;rez vos envois programm&eacute;s WhatsApp
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Programmer un message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Programmer un message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as "text" | "template")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texte</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destinataire *</Label>
                <Input placeholder="+237..." value={formTo} onChange={(e) => setFormTo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date et heure *</Label>
                <Input type="datetime-local" value={formScheduledAt} onChange={(e) => setFormScheduledAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fuseau horaire</Label>
                <Input value={formTimezone} onChange={(e) => setFormTimezone(e.target.value)} />
              </div>
              {formType === "text" ? (
                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea value={formText} onChange={(e) => setFormText(e.target.value)} placeholder="Votre message..." />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Nom du template *</Label>
                    <Input value={formTemplateName} onChange={(e) => setFormTemplateName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Langue</Label>
                    <Input value={formTemplateLanguage} onChange={(e) => setFormTemplateLanguage(e.target.value)} />
                  </div>
                </>
              )}
              <Button onClick={handleSchedule} disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Programmer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all" className="text-xs">
            Tous <Badge variant="secondary" className="ml-1.5 text-[10px]">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            En attente <Badge variant="secondary" className="ml-1.5 text-[10px]">{counts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-xs">
            Envoy&eacute;s <Badge variant="secondary" className="ml-1.5 text-[10px]">{counts.sent}</Badge>
          </TabsTrigger>
          <TabsTrigger value="failed" className="text-xs">
            &Eacute;chou&eacute;s <Badge variant="secondary" className="ml-1.5 text-[10px]">{counts.failed}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">
            Annul&eacute;s <Badge variant="secondary" className="ml-1.5 text-[10px]">{counts.cancelled}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Contenu</TableHead>
                  <TableHead>Date programm&eacute;e</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => {
                  const config = statusConfig[msg.status] || { label: msg.status, variant: "outline" as const }
                  return (
                    <TableRow key={msg.id}>
                      <TableCell>
                        {msg.scheduled_type === "broadcast" ? (
                          <Radio className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Send className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {msg.to || (msg.recipients ? `${msg.recipients.length} dest.` : "-")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                        {msg.template_name
                          ? truncate(msg.template_name, 30)
                          : msg.text_body
                          ? truncate(msg.text_body, 30)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(msg.scheduled_at)}
                        {msg.timezone && (
                          <span className="text-muted-foreground ml-1">({msg.timezone})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {msg.status === "pending" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Annuler le message ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irr&eacute;versible. Le message ne sera pas envoy&eacute;.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Non</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancel(msg.id)}>
                                  Oui, annuler
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {messages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun message programm&eacute;
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
