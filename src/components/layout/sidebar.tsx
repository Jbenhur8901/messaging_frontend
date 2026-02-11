"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Send,
  Users,
  FileText,
  CreditCard,
  Settings,
  MessageSquare,
  MessageSquareMore,
  Tags,
  Radio,
  Building2,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campagnes", href: "/campaigns", icon: Send },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Tags", href: "/contacts/tags", icon: Tags },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "WhatsApp", href: "/whatsapp/config", icon: MessageSquareMore },
  { name: "Services", href: "/services", icon: Radio },
  { name: "Crédits", href: "/credits", icon: CreditCard },
  { name: "SMS Tools", href: "/tools", icon: MessageSquare },
  { name: "Organisation", href: "/organization", icon: Building2 },
  { name: "Paramètres", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const activeHref = navigation.reduce<string | null>((current, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + "/")
    if (!matches) return current
    if (!current) return item.href
    return item.href.length > current.length ? item.href : current
  }, null)

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-16 lg:flex-col">
      <div className="flex grow flex-col gap-y-3 overflow-y-auto border-r border-border/60 bg-[#2f2fd3] px-2 pb-4 pt-3 text-white">
        <div className="flex h-12 shrink-0 items-center justify-center">
          <Link href="/dashboard" className="group" aria-label="Dashboard">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 shadow-[var(--shadow-sm)] transition-transform group-hover:scale-105">
              <Send className="h-4.5 w-4.5" />
            </div>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col items-center gap-y-1.5">
            {navigation.map((item) => {
              const isActive = activeHref === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    aria-label={item.name}
                    title={item.name}
                    className={cn(
                      "group relative flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white text-[#2f2fd3] shadow-[var(--shadow-sm)]"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
