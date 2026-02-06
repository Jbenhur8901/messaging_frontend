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
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border/60 bg-card px-5 pb-6 pt-4">
        <div className="flex h-14 shrink-0 items-center">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-[var(--shadow-sm)] transition-transform group-hover:scale-105">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">Flow</p>
              <p className="text-xs text-muted-foreground">Messaging Platform</p>
            </div>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
            Navigation
          </p>
          <ul role="list" className="flex flex-1 flex-col gap-y-0.5">
            {navigation.map((item) => {
              const isActive = activeHref === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
                    )}
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
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
    </aside>
  )
}
