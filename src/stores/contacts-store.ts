import { create } from "zustand"
import type { Contact, Tag, Pagination } from "@/types"
import { contactsService } from "@/services/contacts"
import { tagsService } from "@/services/tags"

interface ContactsState {
  contacts: Contact[]
  tags: Tag[]
  selectedContacts: string[]
  pagination: Pagination | null
  isLoading: boolean
  error: string | null
  searchQuery: string

  // Actions
  fetchContacts: (limit?: number, offset?: number, search?: string) => Promise<void>
  fetchTags: () => Promise<void>
  setSearchQuery: (query: string) => void
  selectContact: (contactId: string) => void
  deselectContact: (contactId: string) => void
  selectAllContacts: () => void
  clearSelection: () => void
  deleteContact: (contactId: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  tags: [],
  selectedContacts: [],
  pagination: null,
  isLoading: false,
  error: null,
  searchQuery: "",

  fetchContacts: async (limit = 50, offset = 0, search) => {
    set({ isLoading: true, error: null })
    try {
      const result = await contactsService.getContacts(limit, offset, search || get().searchQuery)
      set({
        contacts: result.contacts,
        pagination: result.pagination,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur de chargement",
        isLoading: false,
      })
    }
  },

  fetchTags: async () => {
    try {
      const result = await tagsService.getTags()
      set({ tags: result.tags })
    } catch {
      set({ error: "Impossible de charger les tags" })
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  selectContact: (contactId) => {
    const { selectedContacts } = get()
    if (!selectedContacts.includes(contactId)) {
      set({ selectedContacts: [...selectedContacts, contactId] })
    }
  },

  deselectContact: (contactId) => {
    const { selectedContacts } = get()
    set({ selectedContacts: selectedContacts.filter((id) => id !== contactId) })
  },

  selectAllContacts: () => {
    const { contacts } = get()
    set({ selectedContacts: contacts.map((c) => c.id) })
  },

  clearSelection: () => set({ selectedContacts: [] }),

  deleteContact: async (contactId) => {
    try {
      await contactsService.deleteContact(contactId)
      const { contacts, selectedContacts } = get()
      set({
        contacts: contacts.filter((c) => c.id !== contactId),
        selectedContacts: selectedContacts.filter((id) => id !== contactId),
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Erreur de suppression",
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    contacts: [],
    tags: [],
    selectedContacts: [],
    pagination: null,
    isLoading: false,
    error: null,
    searchQuery: "",
  }),
}))
