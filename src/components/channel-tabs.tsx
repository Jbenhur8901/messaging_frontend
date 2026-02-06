"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { MessageSquare, MessageSquareMore } from "lucide-react"

interface ChannelTabsProps {
  basePath: "campaigns" | "templates"
}

export function ChannelTabs({ basePath }: ChannelTabsProps) {
  const pathname = usePathname()

  const tabs = [
    {
      name: "SMS",
      href: `/${basePath}`,
      icon: MessageSquare,
      isActive: pathname === `/${basePath}` || (pathname.startsWith(`/${basePath}/`) && !pathname.includes("/whatsapp")),
    },
    {
      name: "WhatsApp",
      href: `/${basePath}/whatsapp`,
      icon: MessageSquareMore,
      isActive: pathname.startsWith(`/${basePath}/whatsapp`),
    },
  ]

  return (
    <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background/70 p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab.isActive
              ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <tab.icon className="h-4 w-4" />
          {tab.name}
        </Link>
      ))}
    </div>
  )
}
