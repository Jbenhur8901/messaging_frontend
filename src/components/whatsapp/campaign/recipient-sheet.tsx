"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Check } from "lucide-react"
import type { Contact } from "@/types"

interface RecipientSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  contactsLoading: boolean
  contactsLoadedCount: number
  contactsTotalCount: number | null
  selectedContactIds: string[]
  onToggleContact: (id: string) => void
  onSelectAllContacts: () => void
  onDeselectAllContacts: () => void
}

export function RecipientSheet({
  open,
  onOpenChange,
  contacts,
  contactsLoading,
  contactsLoadedCount,
  contactsTotalCount,
  selectedContactIds,
  onToggleContact,
  onSelectAllContacts,
  onDeselectAllContacts,
}: RecipientSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-[15px]">Sélectionner les contacts</SheetTitle>
          <SheetDescription className="text-[12px]">
            Choisissez les contacts destinataires de votre campagne.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 pb-2 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">
              {contactsLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {contactsLoadedCount}{contactsTotalCount !== null ? ` / ${contactsTotalCount}` : ""}
                </span>
              ) : (
                `${selectedContactIds.length} / ${contacts.length} sélectionné(s)`
              )}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[11px] px-2"
                onClick={onSelectAllContacts}
                disabled={contactsLoading}
              >
                Tout
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[11px] px-2"
                onClick={onDeselectAllContacts}
                disabled={contactsLoading}
              >
                Aucun
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 px-5 pb-5">
            <div className="space-y-0.5">
              {contacts.map((contact) => {
                const selected = selectedContactIds.includes(contact.id)
                return (
                  <button
                    key={contact.id}
                    type="button"
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      selected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => onToggleContact(contact.id)}
                  >
                    <div
                      className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                        selected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">
                        {contact.first_name || contact.last_name
                          ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
                          : contact.phone_number}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {contact.phone_number}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
