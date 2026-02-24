import type { ComponentType } from "react"
import {
  LayoutDashboard,
  Send,
  Users,
  Tags,
  FileText,
  MessageSquareMore,
  Radio,
  GitBranch,
  MessageSquare,
  Building2,
  Settings,
  Megaphone,
  Bot,
  Receipt,
} from "lucide-react"
import { featureFlags } from "@/config/features"

export interface NavigationItem {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
  smsOnly?: boolean
  children?: Array<{
    name: string
    href: string
  }>
}

export interface NavigationSection {
  title?: string
  icon?: ComponentType<{ className?: string }>
  items: NavigationItem[]
  position?: "default" | "bottom"
}

export const navigationSections: NavigationSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Communication",
    icon: Megaphone,
    items: [
      { name: "Campagnes", href: featureFlags.SMS_ENABLED ? "/campaigns" : "/campaigns/whatsapp", icon: Send },
      {
        name: "WhatsApp",
        href: "/conversations",
        icon: MessageSquareMore,
        children: [
          { name: "Conversations", href: "/conversations" },
          { name: "Templates", href: "/templates/whatsapp" },
          { name: "Configuration", href: "/whatsapp/config" },
        ],
      },
      { name: "Outils IA", href: "/whatsapp/ai-tools", icon: Bot },
      { name: "Services", href: "/services", icon: Radio, smsOnly: true },
      { name: "SMS Tools", href: "/tools", icon: MessageSquare, smsOnly: true },
    ],
  },
  {
    title: "Audience",
    icon: Users,
    items: [
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Tags", href: "/contacts/tags", icon: Tags },
    ],
  },
  {
    title: "Organisation & Gestion",
    icon: Building2,
    items: [
      { name: "Organisation", href: "/organization", icon: Building2 },
      {
        name: "Facturation",
        href: "/whatsapp/credits",
        icon: Receipt,
        children: [
          { name: "Crédits WhatsApp", href: "/whatsapp/credits" },
          { name: "Crédits IA", href: "/whatsapp/ai-credits" },
        ],
      },
      { name: "Paramètres", href: "/settings", icon: Settings },
    ],
  },
]

export const getFilteredNavigationSections = (): NavigationSection[] =>
  navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.smsOnly || featureFlags.SMS_ENABLED),
    }))
    .filter((s) => s.items.length > 0)

export const getActiveHref = (
  pathname: string,
  sections: NavigationSection[]
): string | null => {
  const allItems = sections.flatMap((section) => section.items)
  const activeItemHref = allItems.reduce<string | null>((current, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + "/")
    if (!matches) return current
    if (!current) return item.href
    return item.href.length > current.length ? item.href : current
  }, null)
  const activeChildHref = allItems
    .flatMap((item) => item.children || [])
    .reduce<string | null>((current, child) => {
      const matches = pathname === child.href || pathname.startsWith(child.href + "/")
      if (!matches) return current
      if (!current) return child.href
      return child.href.length > current.length ? child.href : current
    }, null)
  if (!activeItemHref) return activeChildHref
  if (!activeChildHref) return activeItemHref
  return activeChildHref.length > activeItemHref.length ? activeChildHref : activeItemHref
}
