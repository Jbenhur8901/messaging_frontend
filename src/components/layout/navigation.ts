import type { Icon } from "@phosphor-icons/react"
import {
  Buildings,
  ChatCircleDots,
  Gear,
  GridFour,
  MegaphoneSimple,
  Note,
  PaperPlaneRight,
  Receipt,
  Robot,
  Sliders,
  Tag,
  Users,
  Funnel,
  Lightning,
} from "@phosphor-icons/react"

export interface NavigationItem {
  name: string
  href: string
  icon: Icon
  ownerOnly?: boolean
  proOnly?: boolean
  children?: Array<{
    name: string
    href: string
  }>
}

export interface NavigationSection {
  title?: string
  icon?: Icon
  items: NavigationItem[]
  position?: "default" | "bottom"
}

export const navigationSections: NavigationSection[] = [
  {
    items: [{ name: "Tableau de bord", href: "/dashboard", icon: GridFour }],
  },
  {
    title: "Communication",
    icon: MegaphoneSimple,
    items: [
      { name: "Campagnes", href: "/campaigns/whatsapp", icon: PaperPlaneRight },
      { name: "Automatisations", href: "/automations", icon: Lightning, proOnly: true },
      { name: "Conversations", href: "/conversations", icon: ChatCircleDots },
      { name: "Modèle de message", href: "/templates/whatsapp", icon: Note },
      { name: "Canaux", href: "/whatsapp/config", icon: Sliders },
      { name: "Agents IA", href: "/agents", icon: Robot, proOnly: true },
    ],
  },
  {
    title: "Audience",
    icon: Users,
    items: [
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Segments", href: "/contacts/segments", icon: Funnel, proOnly: true },
      { name: "Tags", href: "/contacts/tags", icon: Tag },
    ],
  },
  {
    title: "Organisation & Gestion",
    icon: Buildings,
    items: [
      { name: "Organisation", href: "/organization", icon: Buildings, ownerOnly: true },
      { name: "Facturation", href: "/whatsapp/credits", icon: Receipt, ownerOnly: true },
      { name: "Paramètres", href: "/settings", icon: Gear },
    ],
  },
]

export const getFilteredNavigationSections = (isOwner = false): NavigationSection[] =>
  navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.ownerOnly && !isOwner) return false
        return true
      }),
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
