"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { contactsService, tagsService, handleApiError } from "@/services"
import type { Contact, Tag, Pagination } from "@/types"
import { formatNumber, formatPhoneNumber } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Trash,
  Edit,
  Ban,
  CheckCircle,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export default function ContactsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInitialized = useRef(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([])
  const [tagMatch, setTagMatch] = useState<"all" | "any">("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "blocked" | "deleted" | "all">(
    "all"
  )
  const [sourceFilter, setSourceFilter] = useState<"" | "api" | "csv" | "manual">("")
  const [createdAfter, setCreatedAfter] = useState("")
  const [createdBefore, setCreatedBefore] = useState("")
  const [sortBy, setSortBy] = useState<
    "created_at" | "first_name" | "last_name" | "phone_number"
  >("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleteReason, setBulkDeleteReason] = useState("")
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false)
  const [bulkTagsMode, setBulkTagsMode] = useState<"add" | "remove">("add")
  const [bulkTagIds, setBulkTagIds] = useState<string[]>([])
  const limit = 50

  useEffect(() => {
    if (isInitialized.current) return
    const q = searchParams.get("q") || ""
    const tagIds = searchParams.get("tag_ids")?.split(",").filter(Boolean) || []
    const tagMatchParam = searchParams.get("tag_match")
    const statusParam = searchParams.get("status")
    const sourceParam = searchParams.get("source")
    const createdAfterParam = searchParams.get("created_after") || ""
    const createdBeforeParam = searchParams.get("created_before") || ""
    const sortByParam = searchParams.get("sort_by")
    const sortOrderParam = searchParams.get("sort_order")
    const offsetParam = searchParams.get("offset")

    if (q) setSearchQuery(q)
    if (tagIds.length > 0) setSelectedTagFilters(tagIds)
    if (tagMatchParam === "all" || tagMatchParam === "any") setTagMatch(tagMatchParam)
    if (
      statusParam === "active" ||
      statusParam === "blocked" ||
      statusParam === "deleted" ||
      statusParam === "all"
    ) {
      setStatusFilter(statusParam)
    }
    if (sourceParam === "api" || sourceParam === "csv" || sourceParam === "manual") {
      setSourceFilter(sourceParam)
    }
    if (createdAfterParam) setCreatedAfter(createdAfterParam)
    if (createdBeforeParam) setCreatedBefore(createdBeforeParam)
    if (
      sortByParam === "created_at" ||
      sortByParam === "first_name" ||
      sortByParam === "last_name" ||
      sortByParam === "phone_number"
    ) {
      setSortBy(sortByParam)
    }
    if (sortOrderParam === "asc" || sortOrderParam === "desc") {
      setSortOrder(sortOrderParam)
    }
    if (offsetParam) {
      const offset = Number(offsetParam)
      if (!Number.isNaN(offset)) {
        setPage(Math.floor(offset / limit) + 1)
      }
    }
    isInitialized.current = true
  }, [searchParams])

  const loadContacts = async () => {
    setIsLoading(true)
    try {
      const offset = (page - 1) * limit
      const result = await contactsService.searchContacts({
        q: searchQuery || undefined,
        tagIds: selectedTagFilters.length > 0 ? selectedTagFilters : undefined,
        tagMatch: selectedTagFilters.length > 0 ? tagMatch : undefined,
        status: statusFilter,
        source: sourceFilter || undefined,
        createdAfter: createdAfter || undefined,
        createdBefore: createdBefore || undefined,
        sortBy,
        sortOrder,
        limit,
        offset,
      })
      setContacts(result.contacts)
      setPagination(result.pagination)
      setSelectedContacts([])
    } catch (error) {
      console.error("Error loading contacts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadContacts()
  }, [page])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      loadContacts()
    }, 300)
    return () => clearTimeout(timeout)
  }, [
    searchQuery,
    selectedTagFilters,
    tagMatch,
    statusFilter,
    sourceFilter,
    createdAfter,
    createdBefore,
    sortBy,
    sortOrder,
  ])

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

  const handleDelete = async () => {
    if (!deleteContactId) return

    try {
      await contactsService.bulkDelete([deleteContactId], "soft")
      await loadContacts()
      toast.success("Contact supprimé")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setDeleteContactId(null)
    }
  }

  const handleBlock = async (contactId: string, isBlocked: boolean) => {
    try {
      if (isBlocked) {
        await contactsService.unblockContact(contactId)
        toast.success("Contact débloqué")
      } else {
        await contactsService.blockContact(contactId)
        toast.success("Contact bloqué")
      }
      setContacts(
        contacts.map((c) =>
          c.id === contactId ? { ...c, is_blocked: !isBlocked } : c
        )
      )
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map((c) => c.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return
    try {
      await contactsService.bulkDelete(selectedContacts, "soft", bulkDeleteReason || undefined)
      toast.success(`${selectedContacts.length} contact(s) supprimé(s)`)
      setSelectedContacts([])
      await loadContacts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setBulkDeleteOpen(false)
      setBulkDeleteReason("")
    }
  }

  const handleBulkTags = async () => {
    if (selectedContacts.length === 0 || bulkTagIds.length === 0) return
    try {
      if (bulkTagsMode === "add") {
        await contactsService.bulkAddTags(selectedContacts, bulkTagIds)
        toast.success("Tags ajoutés")
      } else {
        await contactsService.bulkRemoveTags(selectedContacts, bulkTagIds)
        toast.success("Tags retirés")
      }
      setBulkTagIds([])
      setSelectedContacts([])
      await loadContacts()
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setBulkTagsOpen(false)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setSelectedTagFilters([])
    setTagMatch("all")
    setStatusFilter("all")
    setSourceFilter("")
    setCreatedAfter("")
    setCreatedBefore("")
    setSortBy("created_at")
    setSortOrder("desc")
    setPage(1)
  }

  useEffect(() => {
    if (!isInitialized.current) return
    const params = new URLSearchParams()
    if (searchQuery) params.set("q", searchQuery)
    if (selectedTagFilters.length > 0) params.set("tag_ids", selectedTagFilters.join(","))
    if (selectedTagFilters.length > 0) params.set("tag_match", tagMatch)
    if (statusFilter) params.set("status", statusFilter)
    if (sourceFilter) params.set("source", sourceFilter)
    if (createdAfter) params.set("created_after", createdAfter)
    if (createdBefore) params.set("created_before", createdBefore)
    if (sortBy) params.set("sort_by", sortBy)
    if (sortOrder) params.set("sort_order", sortOrder)
    params.set("limit", String(limit))
    params.set("offset", String((page - 1) * limit))
    const query = params.toString()
    router.replace(query ? `/contacts?${query}` : "/contacts")
  }, [
    searchQuery,
    selectedTagFilters,
    tagMatch,
    statusFilter,
    sourceFilter,
    createdAfter,
    createdBefore,
    sortBy,
    sortOrder,
    page,
    router,
  ])

  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Gérez vos contacts et leurs informations
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/contacts/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
          </Link>
          <Link href="/contacts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau contact
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou numéro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTagFilters.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer"
                style={{
                  backgroundColor: selectedTagFilters.includes(tag.id) ? tag.color : undefined,
                  borderColor: tag.color,
                }}
                onClick={() => {
                  if (selectedTagFilters.includes(tag.id)) {
                    setSelectedTagFilters(selectedTagFilters.filter((id) => id !== tag.id))
                  } else {
                    setSelectedTagFilters([...selectedTagFilters, tag.id])
                  }
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Statut</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="blocked">Bloqué</SelectItem>
                <SelectItem value="deleted">Supprimé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={sourceFilter || "all"} onValueChange={(value) => setSourceFilter(value === "all" ? "" : (value as typeof sourceFilter))}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tags (match)</Label>
            <Select value={tagMatch} onValueChange={(value) => setTagMatch(value as typeof tagMatch)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="any">Au moins un</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Trier par</Label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date de création</SelectItem>
                <SelectItem value="first_name">Prénom</SelectItem>
                <SelectItem value="last_name">Nom</SelectItem>
                <SelectItem value="phone_number">Téléphone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Ordre</Label>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Décroissant</SelectItem>
                <SelectItem value="asc">Croissant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Créé après</Label>
            <Input
              type="date"
              value={createdAfter}
              onChange={(e) => setCreatedAfter(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Créé avant</Label>
            <Input
              type="date"
              value={createdBefore}
              onChange={(e) => setCreatedBefore(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>

      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {selectedContacts.length} contact(s) sélectionné(s)
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedContacts([])}>
              Désélectionner
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBulkTagsMode("add")
                setBulkTagIds([])
                setBulkTagsOpen(true)
              }}
            >
              Ajouter tags
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBulkTagsMode("remove")
                setBulkTagIds([])
                setBulkTagsOpen(true)
              }}
            >
              Retirer tags
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              Supprimer
            </Button>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Aucun contact</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Aucun contact ne correspond à votre recherche"
                  : "Commencez par ajouter des contacts"}
              </p>
              {!searchQuery && (
                <Link href="/contacts/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau contact
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedContacts.length === contacts.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedContacts([...selectedContacts, contact.id])
                            } else {
                              setSelectedContacts(
                                selectedContacts.filter((id) => id !== contact.id)
                              )
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {contact.first_name || contact.last_name
                              ? `${contact.first_name || ""} ${contact.last_name || ""}`
                              : "—"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {contact.email || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatPhoneNumber(contact.phone_number)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              style={{ borderColor: tag.color, color: tag.color }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                          {contact.tags.length > 2 && (
                            <Badge variant="secondary">
                              +{contact.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(contact.messages_sent)}
                      </TableCell>
                      <TableCell>
                        {contact.is_blocked ? (
                          <Badge variant="destructive">Bloqué</Badge>
                        ) : contact.is_active ? (
                          <Badge variant="success">Actif</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/contacts/${contact.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleBlock(contact.id, contact.is_blocked)}
                            >
                              {contact.is_blocked ? (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Débloquer
                                </>
                              ) : (
                                <>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Bloquer
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteContactId(contact.id)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages} ({pagination?.total} contacts)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteContactId}
        onOpenChange={() => setDeleteContactId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le contact ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le contact sera retiré de la liste (soft delete) et pourra être
              restauré.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open)
          if (!open) {
            setBulkDeleteReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer des contacts</DialogTitle>
            <DialogDescription>
              Cette action supprimera {selectedContacts.length} contact(s).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Raison (optionnel)</Label>
              <Input
                placeholder="Ex: Nettoyage RGPD"
                value={bulkDeleteReason}
                onChange={(e) => setBulkDeleteReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkDeleteOpen(false)
                setBulkDeleteReason("")
              }}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk tags dialog */}
      <Dialog
        open={bulkTagsOpen}
        onOpenChange={(open) => {
          setBulkTagsOpen(open)
          if (!open) {
            setBulkTagIds([])
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkTagsMode === "add" ? "Ajouter des tags" : "Retirer des tags"}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les tags à {bulkTagsMode === "add" ? "ajouter" : "retirer"}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-auto rounded-md border p-3">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun tag disponible.</p>
            ) : (
              tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={bulkTagIds.includes(tag.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setBulkTagIds([...bulkTagIds, tag.id])
                      } else {
                        setBulkTagIds(bulkTagIds.filter((id) => id !== tag.id))
                      }
                    }}
                  />
                  <span
                    className="inline-flex items-center gap-2"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkTagsOpen(false)
                setBulkTagIds([])
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleBulkTags}
              disabled={bulkTagIds.length === 0 || selectedContacts.length === 0}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
