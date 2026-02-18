"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { whatsappService } from "@/services/whatsapp"
import { handleApiError } from "@/services"
import type { WhatsAppFlowDetail, WhatsAppFlowResponse } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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
import { toast } from "sonner"
import { ArrowLeft, Upload, Archive, Save, Loader2 } from "lucide-react"
import { formatDate, formatPhoneNumber } from "@/lib/utils"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Brouillon", variant: "secondary" },
  PUBLISHED: { label: "Publi\u00e9", variant: "default" },
  DEPRECATED: { label: "D\u00e9pr\u00e9ci\u00e9", variant: "outline" },
  BLOCKED: { label: "Bloqu\u00e9", variant: "destructive" },
  THROTTLED: { label: "Limit\u00e9", variant: "destructive" },
}

export default function FlowDetailPage() {
  const router = useRouter()
  const params = useParams()
  const flowId = params?.id as string

  const [flow, setFlow] = useState<WhatsAppFlowDetail | null>(null)
  const [responses, setResponses] = useState<WhatsAppFlowResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [jsonText, setJsonText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("json")

  const loadFlow = useCallback(async () => {
    setIsLoading(true)
    try {
      const [flowData, responsesData] = await Promise.all([
        whatsappService.getFlow(flowId),
        whatsappService.getFlowResponses(flowId),
      ])
      setFlow(flowData)
      setJsonText(flowData.flow_json ? JSON.stringify(flowData.flow_json, null, 2) : "")
      setResponses(responsesData.responses || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }, [flowId])

  useEffect(() => {
    if (flowId) loadFlow()
  }, [flowId, loadFlow])

  const handleSaveJson = async () => {
    try {
      const parsed = JSON.parse(jsonText)
      setIsSaving(true)
      await whatsappService.updateFlowJson(flowId, parsed)
      toast.success("Flow JSON sauvegard\u00e9")
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("JSON invalide")
        return
      }
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      await whatsappService.publishFlow(flowId)
      toast.success("Flow publi\u00e9")
      loadFlow()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const handleDeprecate = async () => {
    try {
      await whatsappService.deprecateFlow(flowId)
      toast.success("Flow d\u00e9pr\u00e9ci\u00e9")
      loadFlow()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!flow) return null

  const config = statusConfig[flow.status] || { label: flow.status, variant: "outline" as const }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/whatsapp/flows")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{flow.name}</h1>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Cr&eacute;&eacute; le {formatDate(flow.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {flow.status === "DRAFT" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Publier
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publier ce flow ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le flow sera disponible pour l&apos;envoi de messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePublish}>Publier</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {flow.status === "PUBLISHED" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Archive className="h-4 w-4 mr-2" />
                  D&eacute;pr&eacute;cier
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>D&eacute;pr&eacute;cier ce flow ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le flow ne pourra plus &ecirc;tre utilis&eacute; pour envoyer des messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeprecate}>D&eacute;pr&eacute;cier</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="responses">R&eacute;ponses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Flow JSON</CardTitle>
              {flow.status === "DRAFT" && (
                <Button size="sm" onClick={handleSaveJson} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Sauvegarder
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="font-mono text-xs min-h-[400px]"
                disabled={flow.status !== "DRAFT"}
              />
              {flow.validation_errors && flow.validation_errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {flow.validation_errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500">{err}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>T&eacute;l&eacute;phone</TableHead>
                    <TableHead>Donn&eacute;es</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((resp) => (
                    <TableRow key={resp.id}>
                      <TableCell className="font-mono text-xs">
                        {formatPhoneNumber(resp.phone_number)}
                      </TableCell>
                      <TableCell>
                        <pre className="text-xs text-muted-foreground max-w-[400px] overflow-auto">
                          {JSON.stringify(resp.response_data, null, 2)}
                        </pre>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(resp.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {responses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Aucune r&eacute;ponse
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Analytics du flow disponibles prochainement
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
