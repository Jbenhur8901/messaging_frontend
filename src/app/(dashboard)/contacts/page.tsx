"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { contactsService, tagsService, handleApiError } from "@/services"
import type { Contact, Tag, Pagination } from "@/types"
import { formatNumber, formatPhoneNumber } from "@/lib/utils"
import { fetchAllContactsPaged, getCachedContacts, setCachedContacts } from "@/lib/contacts-cache"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
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
  Download,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Filter,
  ArrowUpDown,
} from "lucide-react"
import { useOrganizationStore } from "@/stores"

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

type TagFilterMode = "include" | "exclude"

export default function ContactsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentOrganization } = useOrganizationStore()
  const isInitialized = useRef(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [tagFilters, setTagFilters] = useState<Map<string, TagFilterMode>>(new Map())
  const [tagMatch, setTagMatch] = useState<"all" | "any">("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "blocked" | "all">("all")
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
  const contactsPerPage = 100

  const includedTags = useMemo(
    () => [...tagFilters.entries()].filter(([, mode]) => mode === "include").map(([id]) => id),
    [tagFilters]
  )
  const excludedTags = useMemo(
    () => [...tagFilters.entries()].filter(([, mode]) => mode === "exclude").map(([id]) => id),
    [tagFilters]
  )

  const cycleTagFilter = (tagId: string) => {
    setTagFilters((prev) => {
      const next = new Map(prev)
      const current = next.get(tagId)
      if (!current) {
        next.set(tagId, "include")
      } else if (current === "include") {
        next.set(tagId, "exclude")
      } else {
        next.delete(tagId)
      }
      return next
    })
  }

  const loadAllContacts = async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
    setIsLoading(true)
    try {
      const result = await fetchAllContactsPaged({
        fetchPage: (pageLimit, offset) => contactsService.getContacts(pageLimit, offset),
        pageSize: contactsPerPage,
      })

      setContacts(result.contacts)
      setCachedContacts(result.contacts, currentOrganization?.id)
      setPagination({
        total: result.contacts.length,
        limit: contactsPerPage,
        offset: 0,
        has_more: false,
      })
      setSelectedContacts([])
    } catch (error) {
      if (!forceRefresh) {
        const cachedContacts = getCachedContacts(currentOrganization?.id)
        if (cachedContacts) {
          setContacts(cachedContacts)
          setPagination({
            total: cachedContacts.length,
            limit: contactsPerPage,
            offset: 0,
            has_more: false,
          })
          setSelectedContacts([])
          toast.error("API indisponible, affichage des contacts en cache")
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

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
    if (tagIds.length > 0) {
      const map = new Map<string, TagFilterMode>()
      tagIds.forEach((id) => map.set(id, "include"))
      setTagFilters(map)
    }
    if (tagMatchParam === "all" || tagMatchParam === "any") setTagMatch(tagMatchParam)
    if (
      statusParam === "active" ||
      statusParam === "blocked" ||
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
        setPage(Math.floor(offset / contactsPerPage) + 1)
      }
    }
    isInitialized.current = true
  }, [searchParams])

  useEffect(() => {
    loadAllContacts()
  }, [currentOrganization?.id])

  useEffect(() => {
    setPage(1)
  }, [
    searchQuery,
    tagFilters,
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
      }
    }
    loadTags()
  }, [])

  const handleDelete = async () => {
    if (!deleteContactId) return

    try {
      await contactsService.bulkDelete([deleteContactId], "hard")
      await loadAllContacts({ forceRefresh: true })
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
      setContacts((prev) => {
        const next = prev.map((c) => (c.id === contactId ? { ...c, is_blocked: !isBlocked } : c))
        setCachedContacts(next, currentOrganization?.id)
        return next
      })
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    }
  }

  const toggleSelectAll = () => {
    if (selectedContacts.length === pagedContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(pagedContacts.map((c) => c.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return
    try {
      await contactsService.bulkDelete(selectedContacts, "hard", bulkDeleteReason || undefined)
      toast.success(`${selectedContacts.length} contact(s) supprimé(s)`)
      setSelectedContacts([])
      await loadAllContacts({ forceRefresh: true })
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
      await loadAllContacts({ forceRefresh: true })
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setBulkTagsOpen(false)
    }
  }

  const handleExport = () => {
    const rows = filteredContacts.map((contact) => ({
      prénom: contact.first_name || "",
      nom: contact.last_name || "",
      téléphone: contact.phone_number || "",
      email: contact.email || "",
      tags: contact.tags.map((t) => t.name).join(", "),
      statut: contact.is_blocked ? "Bloqué" : contact.is_active ? "Actif" : "Inactif",
      messages_envoyés: contact.messages_sent ?? 0,
      créé_le: contact.created_at || "",
    }))

    if (rows.length === 0) {
      toast.error("Aucun contact à exporter")
      return
    }

    const headers = Object.keys(rows[0])
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const value = String(row[h as keyof typeof row])
            return value.includes(",") || value.includes('"') || value.includes("\n")
              ? `"${value.replace(/"/g, '""')}"`
              : value
          })
          .join(",")
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`${rows.length} contact(s) exporté(s)`)
  }

  const resetFilters = () => {
    setSearchQuery("")
    setTagFilters(new Map())
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
    if (includedTags.length > 0) params.set("tag_ids", includedTags.join(","))
    if (includedTags.length > 0) params.set("tag_match", tagMatch)
    if (statusFilter) params.set("status", statusFilter)
    if (sourceFilter) params.set("source", sourceFilter)
    if (createdAfter) params.set("created_after", createdAfter)
    if (createdBefore) params.set("created_before", createdBefore)
    if (sortBy) params.set("sort_by", sortBy)
    if (sortOrder) params.set("sort_order", sortOrder)
    params.set("limit", String(contactsPerPage))
    params.set("offset", String((page - 1) * contactsPerPage))
    const query = params.toString()
    router.replace(query ? `/contacts?${query}` : "/contacts")
  }, [
    searchQuery,
    includedTags,
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

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    tagFilters.size > 0 ||
    statusFilter !== "all" ||
    sourceFilter !== "" ||
    createdAfter !== "" ||
    createdBefore !== "" ||
    sortBy !== "created_at" ||
    sortOrder !== "desc"

  const filteredContacts = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().trim()
    const q = normalize(searchQuery)
    const after = createdAfter ? new Date(createdAfter) : null
    const before = createdBefore ? new Date(createdBefore) : null

    let list = [...contacts]

    if (q) {
      list = list.filter((contact) => {
        const name = `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
        return (
          normalize(name).includes(q) ||
          normalize(contact.email || "").includes(q) ||
          normalize(contact.phone_number || "").includes(q)
        )
      })
    }

    if (includedTags.length > 0) {
      list = list.filter((contact) => {
        const contactTagIds = contact.tags.map((tag) => tag.id)
        if (tagMatch === "all") {
          return includedTags.every((id) => contactTagIds.includes(id))
        }
        return includedTags.some((id) => contactTagIds.includes(id))
      })
    }

    if (excludedTags.length > 0) {
      list = list.filter((contact) => {
        const contactTagIds = contact.tags.map((tag) => tag.id)
        return !excludedTags.some((id) => contactTagIds.includes(id))
      })
    }

    if (statusFilter !== "all") {
      list = list.filter((contact) => {
        if (statusFilter === "blocked") return contact.is_blocked
        if (statusFilter === "active") return contact.is_active && !contact.is_blocked
        return true
      })
    }

    if (sourceFilter) {
      list = list.filter((contact) => {
        const source = (contact as Contact & { source?: string }).source
        return source === sourceFilter
      })
    }

    if (after || before) {
      list = list.filter((contact) => {
        if (!contact.created_at) return false
        const createdAt = new Date(contact.created_at)
        if (Number.isNaN(createdAt.getTime())) return false
        if (after && createdAt < after) return false
        if (before && createdAt > before) return false
        return true
      })
    }

    const compareString = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" })
    list.sort((a, b) => {
      let result = 0
      if (sortBy === "created_at") {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        result = aTime - bTime
      } else if (sortBy === "first_name") {
        result = compareString(a.first_name || "", b.first_name || "")
      } else if (sortBy === "last_name") {
        result = compareString(a.last_name || "", b.last_name || "")
      } else if (sortBy === "phone_number") {
        result = compareString(a.phone_number || "", b.phone_number || "")
      }
      return sortOrder === "asc" ? result : -result
    })

    return list
  }, [
    contacts,
    searchQuery,
    includedTags,
    excludedTags,
    tagMatch,
    statusFilter,
    sourceFilter,
    createdAfter,
    createdBefore,
    sortBy,
    sortOrder,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / contactsPerPage))

  const pagedContacts = useMemo(() => {
    const start = (page - 1) * contactsPerPage
    return filteredContacts.slice(start, start + contactsPerPage)
  }, [filteredContacts, page])

  const getInitials = (contact: Contact) => {
    const first = contact.first_name?.[0] || ""
    const last = contact.last_name?.[0] || ""
    return (first + last).toUpperCase() || "?"
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Gérez vos contacts et leurs informations.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" onClick={handleExport} className="h-8 text-[13px] rounded-lg gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Exporter
          </Button>
          <Link href="/contacts/import">
            <Button variant="outline" className="h-8 text-[13px] rounded-lg gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Importer
            </Button>
          </Link>
          <Link href="/contacts/new">
            <Button className="h-8 text-[13px] rounded-lg gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nouveau contact
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, email ou numéro..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 text-[13px] pl-9 rounded-lg"
        />
      </div>

      {/* Tag filters with 3 states */}
      {tags.length > 0 && (
        <div className="space-y-2">
          {(includedTags.length > 0 || excludedTags.length > 0) && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {includedTags.length > 0 && (
                <span>{includedTags.length} inclus</span>
              )}
              {includedTags.length > 0 && excludedTags.length > 0 && <span>·</span>}
              {excludedTags.length > 0 && (
                <span>{excludedTags.length} exclu{excludedTags.length > 1 ? "s" : ""}</span>
              )}
              <button
                onClick={() => setTagFilters(new Map())}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Réinitialiser
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const mode = tagFilters.get(tag.id)
              return (
                <Badge
                  key={tag.id}
                  variant={mode ? "default" : "outline"}
                  className="cursor-pointer text-[10px] h-6 gap-1 transition-all duration-200 select-none"
                  style={
                    mode === "include"
                      ? { backgroundColor: tag.color, color: "#fff", borderColor: tag.color }
                      : mode === "exclude"
                        ? { backgroundColor: "hsl(var(--destructive))", color: "#fff", borderColor: "hsl(var(--destructive))", textDecoration: "line-through" }
                        : { borderColor: tag.color, color: tag.color }
                  }
                  onClick={() => cycleTagFilter(tag.id)}
                >
                  {mode === "include" && <Check className="h-2.5 w-2.5" />}
                  {mode === "exclude" && <X className="h-2.5 w-2.5" />}
                  {tag.name}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* ── Filter group ── */}
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger
            className={`h-8 w-auto min-w-0 gap-1.5 rounded-lg border px-2.5 text-[12px] transition-colors ${
              statusFilter !== "all"
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border"
            }`}
          >
            <Filter className="h-3 w-3 shrink-0 opacity-50" />
            <span className="text-muted-foreground">Statut:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[12px]">Tous</SelectItem>
            <SelectItem value="active" className="text-[12px]">Actif</SelectItem>
            <SelectItem value="blocked" className="text-[12px]">Bloqué</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter || "all"} onValueChange={(value) => setSourceFilter(value === "all" ? "" : (value as typeof sourceFilter))}>
          <SelectTrigger
            className={`h-8 w-auto min-w-0 gap-1.5 rounded-lg border px-2.5 text-[12px] transition-colors ${
              sourceFilter !== ""
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border"
            }`}
          >
            <Filter className="h-3 w-3 shrink-0 opacity-50" />
            <span className="text-muted-foreground">Source:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[12px]">Toutes</SelectItem>
            <SelectItem value="api" className="text-[12px]">API</SelectItem>
            <SelectItem value="csv" className="text-[12px]">CSV</SelectItem>
            <SelectItem value="manual" className="text-[12px]">Manuel</SelectItem>
          </SelectContent>
        </Select>

        {(includedTags.length > 0 || excludedTags.length > 0) && (
          <Select value={tagMatch} onValueChange={(value) => setTagMatch(value as typeof tagMatch)}>
            <SelectTrigger
              className="h-8 w-auto min-w-0 gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-2.5 text-[12px] text-primary transition-colors"
            >
              <Filter className="h-3 w-3 shrink-0 opacity-50" />
              <span className="text-primary/60">Tags:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">Tous</SelectItem>
              <SelectItem value="any" className="text-[12px]">Au moins un</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Separator */}
        <div className="mx-1 h-4 w-px bg-border/60" />

        {/* ── Sort group ── */}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
          <SelectTrigger
            className={`h-8 w-auto min-w-0 gap-1.5 rounded-lg border px-2.5 text-[12px] transition-colors ${
              sortBy !== "created_at"
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border"
            }`}
          >
            <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" />
            <span className="text-muted-foreground">Tri:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at" className="text-[12px]">Date création</SelectItem>
            <SelectItem value="first_name" className="text-[12px]">Prénom</SelectItem>
            <SelectItem value="last_name" className="text-[12px]">Nom</SelectItem>
            <SelectItem value="phone_number" className="text-[12px]">Téléphone</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className={`h-8 w-8 p-0 rounded-lg transition-colors ${
            sortOrder !== "desc"
              ? "border-primary/40 bg-primary/5 text-primary"
              : ""
          }`}
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          title={sortOrder === "asc" ? "Croissant" : "Décroissant"}
        >
          <ArrowUpDown className={`h-3.5 w-3.5 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
        </Button>

        {/* Separator */}
        <div className="mx-1 h-4 w-px bg-border/60" />

        {/* ── Date group ── */}
        <DatePicker
          value={createdAfter}
          onChange={setCreatedAfter}
          label="Après:"
          placeholder="Date début"
        />
        <DatePicker
          value={createdBefore}
          onChange={setCreatedBefore}
          label="Avant:"
          placeholder="Date fin"
        />

        {/* ── Reset ── */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="h-8 text-[12px] rounded-lg gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-card px-3 py-2">
          <p className="text-[13px] text-muted-foreground">
            {selectedContacts.length} contact(s) sélectionné(s)
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" className="h-7 text-[12px] rounded-lg" onClick={() => setSelectedContacts([])}>
              Désélectionner
            </Button>
            <Button
              variant="outline"
              className="h-7 text-[12px] rounded-lg"
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
              className="h-7 text-[12px] rounded-lg"
              onClick={() => {
                setBulkTagsMode("remove")
                setBulkTagIds([])
                setBulkTagsOpen(true)
              }}
            >
              Retirer tags
            </Button>
            <Button variant="destructive" className="h-7 text-[12px] rounded-lg" onClick={() => setBulkDeleteOpen(true)}>
              Supprimer
            </Button>
          </div>
        </div>
      )}

      {/* Contact list */}
      {isLoading ? (
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-[13px] font-medium">Aucun contact</p>
          <p className="text-[13px] text-muted-foreground mb-4">
            {hasActiveFilters
              ? "Aucun contact ne correspond à votre recherche"
              : "Commencez par ajouter des contacts"}
          </p>
          {!hasActiveFilters && (
            <Link href="/contacts/new">
              <Button className="h-8 text-[13px] rounded-lg gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Nouveau contact
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Select all row */}
          <div className="flex items-center gap-3 px-4 py-1">
            <Checkbox
              checked={
                pagedContacts.length > 0 &&
                selectedContacts.length === pagedContacts.length
              }
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
              {pagedContacts.length} contact{pagedContacts.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-1">
            {pagedContacts.map((contact, i) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-accent/50 transition-colors duration-200"
                style={stagger(i)}
              >
                {/* Checkbox */}
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

                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                  {getInitials(contact)}
                </div>

                {/* Name + email */}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">
                    {contact.first_name || contact.last_name
                      ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
                      : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {contact.email || "—"}
                  </p>
                </div>

                {/* Phone */}
                <span className="hidden sm:block text-[11px] font-mono text-muted-foreground shrink-0">
                  {formatPhoneNumber(contact.phone_number)}
                </span>

                {/* Tags */}
                <div className="hidden md:flex flex-wrap gap-1 shrink-0 max-w-[200px]">
                  {contact.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-[10px] h-5"
                      style={{ borderColor: tag.color, color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {contact.tags.length > 2 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      +{contact.tags.length - 2}
                    </Badge>
                  )}
                </div>

                {/* Status */}
                <div className="hidden lg:block shrink-0">
                  {contact.is_blocked ? (
                    <Badge variant="destructive" className="text-[10px] h-5">Bloqué</Badge>
                  ) : contact.is_active ? (
                    <Badge variant="success" className="text-[10px] h-5">Actif</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] h-5">Inactif</Badge>
                  )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="text-[13px]">
                      <Link href={`/contacts/${contact.id}`}>
                        <Edit className="mr-2 h-3.5 w-3.5" />
                        Modifier
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-[13px]"
                      onClick={() => handleBlock(contact.id, contact.is_blocked)}
                    >
                      {contact.is_blocked ? (
                        <>
                          <CheckCircle className="mr-2 h-3.5 w-3.5" />
                          Débloquer
                        </>
                      ) : (
                        <>
                          <Ban className="mr-2 h-3.5 w-3.5" />
                          Bloquer
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive text-[13px]"
                      onClick={() => setDeleteContactId(contact.id)}
                    >
                      <Trash className="mr-2 h-3.5 w-3.5" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2">
              <p className="text-[12px] text-muted-foreground">
                Page {page} sur {totalPages} ({filteredContacts.length} contacts)
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  className="h-7 w-7 p-0 rounded-lg"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  className="h-7 w-7 p-0 rounded-lg"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteContactId}
        onOpenChange={() => setDeleteContactId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Supprimer le contact ?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              Cette action est irréversible. Le contact sera définitivement
              supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-[13px] rounded-lg">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-8 text-[13px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            <DialogTitle className="text-[15px]">Supprimer des contacts</DialogTitle>
            <DialogDescription className="text-[13px]">
              Cette action est irréversible et supprimera définitivement {selectedContacts.length} contact(s).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className="text-[13px]">Raison (optionnel)</Label>
              <Input
                placeholder="Ex: Nettoyage RGPD"
                value={bulkDeleteReason}
                onChange={(e) => setBulkDeleteReason(e.target.value)}
                className="h-9 text-[13px] rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-8 text-[13px] rounded-lg"
              onClick={() => {
                setBulkDeleteOpen(false)
                setBulkDeleteReason("")
              }}
            >
              Annuler
            </Button>
            <Button variant="destructive" className="h-8 text-[13px] rounded-lg" onClick={handleBulkDelete}>
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
            <DialogTitle className="text-[15px]">
              {bulkTagsMode === "add" ? "Ajouter des tags" : "Retirer des tags"}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Sélectionnez les tags à {bulkTagsMode === "add" ? "ajouter" : "retirer"}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-auto rounded-lg border p-3">
            {tags.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Aucun tag disponible.</p>
            ) : (
              tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 text-[13px]"
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
                  <span className="inline-flex items-center gap-2">
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
              className="h-8 text-[13px] rounded-lg"
              onClick={() => {
                setBulkTagsOpen(false)
                setBulkTagIds([])
              }}
            >
              Annuler
            </Button>
            <Button
              className="h-8 text-[13px] rounded-lg"
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
