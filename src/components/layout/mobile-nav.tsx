"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Send,
  Users,
  FileText,
  CreditCard,
  Settings,
  MessageSquare,
  Tags,
  Radio,
  X,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campagnes", href: "/campaigns", icon: Send },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Paramétrage", href: "/contacts/tags", icon: Tags },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Services", href: "/services", icon: Radio },
  { name: "Crédits", href: "/credits", icon: CreditCard },
  { name: "SMS Tools", href: "/tools", icon: MessageSquare },
  { name: "Paramètres", href: "/settings", icon: Settings },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </TransitionChild>

        <div className="fixed inset-0 flex">
          <TransitionChild
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <DialogPanel className="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" />
                    <span className="sr-only">Fermer</span>
                  </Button>
                </div>
              </TransitionChild>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background/90 px-6 pb-6 pt-4 backdrop-blur">
                <div className="flex h-12 shrink-0 items-center">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3"
                    onClick={onClose}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-sm)]">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Flow</p>
                      <p className="text-xs text-muted-foreground">Messaging Platform</p>
                    </div>
                  </Link>
                </div>
                <DialogTitle className="sr-only">Navigation</DialogTitle>
                <nav className="flex flex-1 flex-col">
                  <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                    Navigation
                  </p>
                  <ul role="list" className="mt-3 flex flex-1 flex-col gap-y-1">
                    {navigation.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/")
                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              "group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-muted/60 text-muted-foreground transition-colors",
                                isActive
                                  ? "border-primary/20 bg-primary/10 text-primary"
                                  : "group-hover:border-border/80 group-hover:text-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                            </span>
                            <span>{item.name}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
