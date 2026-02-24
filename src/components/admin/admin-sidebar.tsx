"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CreditCard,
  Sparkles,
  Building2,
  Shield,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Demandes de crédits", href: "/admin/credit-requests", icon: CreditCard },
  { name: "Demandes IA", href: "/admin/ai-credit-requests", icon: Sparkles },
  { name: "Organisations", href: "/admin/organizations", icon: Building2 },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const activeHref = navigation.reduce<string | null>((current, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + "/")
    if (!matches) return current
    if (!current) return item.href
    return item.href.length > current.length ? item.href : current
  }, null)

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-6 overflow-y-auto border-r border-border/60 bg-background/85 px-6 pb-6 pt-4 backdrop-blur">
        <div className="flex h-12 shrink-0 items-center">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-sm)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Admin</p>
              <p className="text-xs text-muted-foreground">Flow Console</p>
            </div>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            Navigation
          </p>
          <ul role="list" className="mt-3 flex flex-1 flex-col gap-y-1">
            {navigation.map((item) => {
              const isActive = activeHref === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
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
    </aside>
  )
}
