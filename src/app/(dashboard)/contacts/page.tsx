"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { contactsService, tagsService, handleApiError } from "@/services"
import type { Contact, Tag, Pagination } from "@/types"
import { formatNumber, formatDate, formatPhoneNumber } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
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
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)
  const limit = 50

  const loadContacts = async () => {
    setIsLoading(true)
    try {
      const offset = (page - 1) * limit
      const result = await contactsService.getContacts(limit, offset, searchQuery, selectedTagFilters)
      setContacts(result.contacts)
      setPagination(result.pagination)
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
  }, [searchQuery, selectedTagFilters])

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
      await contactsService.deleteContact(deleteContactId)
      setContacts(contacts.filter((c) => c.id !== deleteContactId))
      setSelectedContacts(selectedContacts.filter((id) => id !== deleteContactId))
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
      </div>

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
              Cette action est irréversible. Le contact sera définitivement
              supprimé.
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
    </div>
  )
}
