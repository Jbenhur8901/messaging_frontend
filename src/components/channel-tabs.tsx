"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { MessageSquare, MessageSquareMore } from "lucide-react"
import { featureFlags } from "@/config/features"

interface ChannelTabsProps {
  basePath: "campaigns" | "templates"
}

export function ChannelTabs({ basePath }: ChannelTabsProps) {
  const pathname = usePathname()

  const allTabs = [
    {
      name: "SMS",
      href: `/${basePath}`,
      icon: MessageSquare,
      isActive: pathname === `/${basePath}` || (pathname.startsWith(`/${basePath}/`) && !pathname.includes("/whatsapp")),
      smsOnly: true,
    },
    {
      name: "WhatsApp",
      href: `/${basePath}/whatsapp`,
      icon: MessageSquareMore,
      isActive: pathname.startsWith(`/${basePath}/whatsapp`),
    },
  ]

  const tabs = allTabs.filter((tab) => !tab.smsOnly || featureFlags.SMS_ENABLED)

  if (tabs.length <= 1) return null

  return (
    <div className="flex items-center gap-1 rounded-md border border-border/40 bg-background p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            tab.isActive
              ? "bg-white text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.name}
        </Link>
      ))}
    </div>
  )
}
