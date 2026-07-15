"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { segmentsService, handleApiError } from "@/services"
import type { Segment, SegmentCriteria, SegmentContact } from "@/services/segments"
import { SegmentEditor } from "../_components/segment-editor"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Users, ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { ProGate } from "@/components/ui/pro-gate"

function EditSegmentPageContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [segment, setSegment] = useState<Segment | null>(null)
  const [loading, setLoading] = useState(true)

  // Contacts tab
  const [contacts, setContacts] = useState<SegmentContact[]>([])
  const [contactsTotal, setContactsTotal] = useState(0)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsPage, setContactsPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const limit = 50

  useEffect(() => {
    segmentsService
      .getSegment(id)
      .then(setSegment)
      .catch(() => toast.error("Segment introuvable"))
      .finally(() => setLoading(false))
  }, [id])

  async function loadContacts(page = 0) {
    setContactsLoading(true)
    try {
      const res = await segmentsService.listSegmentContacts(id, { limit, offset: page * limit })
      setContacts(res.contacts)
      setContactsTotal(res.pagination.total)
      setContactsPage(page)
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setContactsLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await segmentsService.refreshCount(id)
      setSegment((s) => s ? { ...s, estimated_count: res.count, count_refreshed_at: res.refreshed_at } : s)
      toast.success(`${res.count} contacts`)
    } catch (err) {
      toast.error(handleApiError(err).message)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSave(name: string, description: string, criteria: SegmentCriteria) {
    await segmentsService.updateSegment(id, { name, description: description || undefined, criteria })
    toast.success("Segment mis à jour")
    router.push("/contacts/segments")
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (!segment) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Segment introuvable.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/contacts/segments">
            <ArrowLeft className="size-4 mr-2" />
            Retour
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Tabs defaultValue="edit">
      <div className="px-6 pt-6 border-b border-border/60">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">{segment.name}</h1>
            {segment.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{segment.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <Users className="size-3" />
              {segment.estimated_count != null ? segment.estimated_count.toLocaleString() : "—"} contacts
            </Badge>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
          </div>
        </div>
        <TabsList className="mb-0">
          <TabsTrigger value="edit">Critères</TabsTrigger>
          <TabsTrigger value="contacts" onClick={() => contacts.length === 0 && loadContacts(0)}>
            Contacts {contactsTotal > 0 && `(${contactsTotal.toLocaleString()})`}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="edit" className="mt-0">
        <SegmentEditor
          initial={{ name: segment.name, description: segment.description ?? "", criteria: segment.criteria }}
          onSave={handleSave}
        />
      </TabsContent>

      <TabsContent value="contacts" className="mt-0 p-6">
        {contactsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucun contact dans ce segment. Essayez de rafraîchir.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.phone_number}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell>
                      {c.is_blocked ? (
                        <Badge variant="destructive" className="text-xs">Bloqué</Badge>
                      ) : c.is_active ? (
                        <Badge variant="secondary" className="text-xs">Actif</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>{contactsTotal.toLocaleString()} contact{contactsTotal !== 1 ? "s" : ""} au total</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={contactsPage === 0 || contactsLoading}
                  onClick={() => loadContacts(contactsPage - 1)}
                >
                  Précédent
                </Button>
                <span className="flex items-center px-2">
                  Page {contactsPage + 1} / {Math.ceil(contactsTotal / limit)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(contactsPage + 1) * limit >= contactsTotal || contactsLoading}
                  onClick={() => loadContacts(contactsPage + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}

export default function EditSegmentPage() {
  return <ProGate feature="Segments"><EditSegmentPageContent /></ProGate>
}
