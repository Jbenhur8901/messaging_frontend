"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuthStore } from "@/stores"
import { ChevronDown, PanelLeftClose } from "lucide-react"
import {
  getActiveHref,
  getFilteredNavigationSections,
} from "./navigation"

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const sections = getFilteredNavigationSections()
  const activeHref = getActiveHref(pathname, sections)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const userInitials = useMemo(() => {
    const first = user?.first_name?.[0] || ""
    const last = user?.last_name?.[0] || ""
    return `${first}${last}`.toUpperCase() || "U"
  }, [user?.first_name, user?.last_name])

  const mainSections = sections.filter((s) => s.position !== "bottom")
  const bottomSections = sections.filter((s) => s.position === "bottom")

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col",
          "transition-[width] duration-200 ease-in-out",
          collapsed ? "lg:w-[60px]" : "lg:w-56"
        )}
      >
        <div className="flex h-full flex-col border-r border-border/40 bg-white">
          {/* ── Header ── */}
          <div className="flex h-14 shrink-0 items-center border-b border-border/40 px-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-white transition-opacity hover:opacity-90"
                  >
                    <span className="text-xs font-bold">F</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Ouvrir le menu</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-white">
                    <span className="text-xs font-bold">F</span>
                  </div>
                  <p className="truncate text-sm font-semibold">Flow</p>
                </div>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Réduire la sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Navigation ── */}
          <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
            <div className="flex-1 space-y-1">
              {mainSections.map((section, sectionIndex) => {
                const isCollapsible =
                  !collapsed &&
                  !!section.title &&
                  !!section.icon &&
                  section.items.length > 1

                const sectionHasActive = section.items.some(
                  (item) =>
                    activeHref === item.href ||
                    item.children?.some((c) => activeHref === c.href)
                )

                const isSectionOpen = isCollapsible
                  ? (openGroups[`section:${section.title}`] ?? sectionHasActive)
                  : true

                return (
                  <div key={section.title || `section-${sectionIndex}`}>
                    {sectionIndex > 0 && (
                      <Separator className="my-2 bg-border/30" />
                    )}

                    {isCollapsible ? (
                      /* ── Collapsible section ── */
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenGroups((prev) => ({
                              ...prev,
                              [`section:${section.title}`]: !isSectionOpen,
                            }))
                          }
                          className={cn(
                            "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                            sectionHasActive
                              ? "text-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          {section.icon && (
                            <section.icon className="h-[18px] w-[18px] shrink-0" />
                          )}
                          <span className="flex-1 truncate text-left">
                            {section.title}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
                              !isSectionOpen && "-rotate-90"
                            )}
                          />
                        </button>

                        {isSectionOpen && (
                          <div className="relative mt-0.5 ml-[17px] border-l border-border/30 pl-3">
                            <div className="space-y-0.5">
                              {section.items.map((item) => {
                                const isActive = activeHref === item.href
                                const hasChildren =
                                  (item.children?.length || 0) > 0
                                const isGroupOpen =
                                  openGroups[item.name] ?? false
                                const hasActiveChild = (
                                  item.children || []
                                ).some((c) => activeHref === c.href)

                                return (
                                  <div key={item.name}>
                                    <div className="flex items-center">
                                      <Link
                                        href={item.href}
                                        className={cn(
                                          "relative flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-[6px] text-[13px] transition-colors",
                                          isActive || hasActiveChild
                                            ? "bg-primary/[0.06] font-medium text-primary"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                        )}
                                      >
                                        {(isActive || hasActiveChild) && (
                                          <span className="absolute -left-[13px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                                        )}
                                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                          {item.name}
                                        </span>
                                      </Link>
                                      {hasChildren && (
                                        <button
                                          type="button"
                                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-foreground"
                                          onClick={() =>
                                            setOpenGroups((prev) => ({
                                              ...prev,
                                              [item.name]: !isGroupOpen,
                                            }))
                                          }
                                          aria-label={
                                            isGroupOpen
                                              ? `Réduire ${item.name}`
                                              : `Déployer ${item.name}`
                                          }
                                        >
                                          <ChevronDown
                                            className={cn(
                                              "h-3 w-3 transition-transform duration-200",
                                              !isGroupOpen && "-rotate-90"
                                            )}
                                          />
                                        </button>
                                      )}
                                    </div>

                                    {hasChildren && isGroupOpen && (
                                      <div className="ml-5 mt-0.5 space-y-0.5">
                                        {item.children?.map((child) => {
                                          const isChildActive =
                                            activeHref === child.href
                                          return (
                                            <Link
                                              key={child.href}
                                              href={child.href}
                                              className={cn(
                                                "block rounded-md px-2 py-[5px] text-xs transition-colors",
                                                isChildActive
                                                  ? "font-medium text-primary"
                                                  : "text-muted-foreground hover:text-foreground"
                                              )}
                                            >
                                              {child.name}
                                            </Link>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* ── Direct items (Dashboard / Scenarios / collapsed mode) ── */
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const isActive = activeHref === item.href

                          if (collapsed) {
                            return (
                              <Tooltip key={item.name}>
                                <TooltipTrigger asChild>
                                  <Link
                                    href={item.href}
                                    className={cn(
                                      "relative flex h-9 w-full items-center justify-center rounded-md transition-colors",
                                      isActive
                                        ? "bg-primary/[0.06] text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                  >
                                    {isActive && (
                                      <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                                    )}
                                    <item.icon className="h-[18px] w-[18px]" />
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  {item.name}
                                </TooltipContent>
                              </Tooltip>
                            )
                          }

                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={cn(
                                "relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                                isActive
                                  ? "bg-primary/[0.06] text-primary"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              )}
                            >
                              {isActive && (
                                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                              )}
                              <item.icon className="h-[18px] w-[18px] shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Bottom (Paramètres) ── */}
            {bottomSections.length > 0 && (
              <div className="mt-auto pt-1">
                <Separator className="mb-2 bg-border/30" />
                {bottomSections.flatMap((s) => s.items).map((item) => {
                  const isActive = activeHref === item.href

                  if (collapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "relative flex h-9 w-full items-center justify-center rounded-md transition-colors",
                              isActive
                                ? "bg-primary/[0.06] text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                            )}
                            <item.icon className="h-[18px] w-[18px]" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.name}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-primary/[0.06] text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                      )}
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </nav>

          {/* ── User profile ── */}
          <div className="shrink-0 border-t border-border/40 p-2">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center py-1">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-accent text-[11px] font-medium text-muted-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user
                    ? `${user.first_name} ${user.last_name}`
                    : "Profil"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-accent text-[11px] font-medium text-muted-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-tight">
                    {user
                      ? `${user.first_name} ${user.last_name}`
                      : "User"}
                  </p>
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    {user?.email || "email@example.com"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
