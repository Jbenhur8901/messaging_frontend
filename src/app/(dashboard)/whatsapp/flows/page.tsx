"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { whatsappService } from "@/services/whatsapp"
import { handleApiError } from "@/services"
import type { WhatsAppFlow, WhatsAppFlowCategory } from "@/types"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { GitBranch, RefreshCw, Plus, Eye, Upload, Archive, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

const flowStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Brouillon", variant: "secondary" },
  PUBLISHED: { label: "Publi\u00e9", variant: "default" },
  DEPRECATED: { label: "D\u00e9pr\u00e9ci\u00e9", variant: "outline" },
  BLOCKED: { label: "Bloqu\u00e9", variant: "destructive" },
  THROTTLED: { label: "Limit\u00e9", variant: "destructive" },
}

const categoryLabels: Record<string, string> = {
  SIGN_UP: "Inscription",
  SIGN_IN: "Connexion",
  APPOINTMENT_BOOKING: "R\u00e9servation",
  LEAD_GENERATION: "Leads",
  CONTACT_US: "Contact",
  CUSTOMER_SUPPORT: "Support",
  SURVEY: "Sondage",
  OTHER: "Autre",
}

const allCategories: WhatsAppFlowCategory[] = [
  "SIGN_UP", "SIGN_IN", "APPOINTMENT_BOOKING", "LEAD_GENERATION",
  "CONTACT_US", "CUSTOMER_SUPPORT", "SURVEY", "OTHER",
]

export default function FlowsListPage() {
  const router = useRouter()
  const [flows, setFlows] = useState<WhatsAppFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formName, setFormName] = useState("")
  const [formCategories, setFormCategories] = useState<WhatsAppFlowCategory[]>([])

  const loadFlows = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await whatsappService.getFlows(statusFilter === "all" ? undefined : statusFilter)
      setFlows(result.flows || [])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadFlows()
  }, [loadFlows])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await whatsappService.syncFlows()
      toast.success(`${result.synced} flow(s) synchronis\u00e9(s)`)
      loadFlows()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCreate = async () => {
    if (!formName) {
      toast.error("Le nom est requis")
      return
    }
    setIsSubmitting(true)
    try {
      await whatsappService.createFlow(formName, formCategories)
      toast.success("Flow cr\u00e9\u00e9")
      setIsDialogOpen(false)
      setFormName("")
      setFormCategories([])
      loadFlows()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await whatsappService.publishFlow(id)
      toast.success("Flow publi\u00e9")
      loadFlows()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const handleDeprecate = async (id: string) => {
    try {
      await whatsappService.deprecateFlow(id)
      toast.success("Flow d\u00e9pr\u00e9ci\u00e9")
      loadFlows()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const toggleCategory = (cat: WhatsAppFlowCategory) => {
    setFormCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            Flows WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            G\u00e9rez vos flows interactifs WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Meta
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau flow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cr\u00e9er un flow</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Mon flow" />
                </div>
                <div className="space-y-2">
                  <Label>Cat\u00e9gories</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {allCategories.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={formCategories.includes(cat)}
                          onCheckedChange={() => toggleCategory(cat)}
                        />
                        {categoryLabels[cat]}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={isSubmitting} className="w-full">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cr\u00e9er
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
          <TabsTrigger value="DRAFT" className="text-xs">Brouillons</TabsTrigger>
          <TabsTrigger value="PUBLISHED" className="text-xs">Publi&eacute;s</TabsTrigger>
          <TabsTrigger value="DEPRECATED" className="text-xs">D&eacute;pr&eacute;ci&eacute;s</TabsTrigger>
        </TabsList>
      </Tabs>

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
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Cat&eacute;gories</TableHead>
                  <TableHead>Cr&eacute;&eacute; le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flows.map((flow) => {
                  const config = flowStatusConfig[flow.status] || { label: flow.status, variant: "outline" as const }
                  return (
                    <TableRow key={flow.id}>
                      <TableCell className="font-medium">{flow.name}</TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {flow.categories.map((cat) => (
                            <Badge key={cat} variant="outline" className="text-[10px]">
                              {categoryLabels[cat] || cat}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(flow.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => router.push(`/whatsapp/flows/${flow.id}`)}
                            title="Voir d\u00e9tail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {flow.status === "DRAFT" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Publier">
                                  <Upload className="h-3.5 w-3.5" />
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
                                  <AlertDialogAction onClick={() => handlePublish(flow.id)}>
                                    Publier
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {flow.status === "PUBLISHED" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="D\u00e9pr\u00e9cier">
                                  <Archive className="h-3.5 w-3.5" />
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
                                  <AlertDialogAction onClick={() => handleDeprecate(flow.id)}>
                                    D&eacute;pr&eacute;cier
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {flows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucun flow
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
