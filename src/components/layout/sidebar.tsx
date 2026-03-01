"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuthStore } from "@/stores"
import { ChevronDown, LogOut, PanelLeftClose } from "lucide-react"
import {
  getActiveHref,
  getFilteredNavigationSections,
} from "./navigation"

const BRAND_ICON_URL =
  "https://phwyhgzcnnjffovepbrt.supabase.co/storage/v1/object/public/file/2.png"

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
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
        <div className="flex h-full flex-col border-r border-black/5 bg-[#f9fafb]">
          <div className="flex h-14 shrink-0 items-center border-b border-black/5 px-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="mx-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white transition-opacity hover:opacity-90"
                  >
                    <Image
                      src={BRAND_ICON_URL}
                      alt="Flow"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Ouvrir le menu</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                    <Image
                      src={BRAND_ICON_URL}
                      alt="Flow"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
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

          <nav className="min-h-0 flex flex-1 flex-col overflow-y-auto px-2.5 py-3">
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
                    {sectionIndex > 0 && <div className="my-2" />}

                    {isCollapsible ? (
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
                            "group flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
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
                          <div className="relative mt-1 ml-[17px] pl-3">
                            <div className="space-y-1">
                              {section.items.map((item) => {
                                const isActive = activeHref === item.href
                                const hasChildren = (item.children?.length || 0) > 0
                                const isGroupOpen = openGroups[item.name] ?? false
                                const hasActiveChild = (item.children || []).some(
                                  (c) => activeHref === c.href
                                )

                                return (
                                  <div key={item.name}>
                                    <div className="flex items-center">
                                      <Link
                                        href={item.href}
                                        className={cn(
                                          "relative flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                                          isActive || hasActiveChild
                                            ? "bg-primary/[0.06] font-medium text-primary"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                        )}
                                      >
                                        {(isActive || hasActiveChild) && (
                                          <span className="absolute -left-[13px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                                        )}
                                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{item.name}</span>
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
                                      <div className="ml-5 mt-1 space-y-1">
                                        {item.children?.map((child) => {
                                          const isChildActive = activeHref === child.href
                                          return (
                                            <Link
                                              key={child.href}
                                              href={child.href}
                                              className={cn(
                                                "block rounded-lg px-3 py-2 text-xs transition-colors",
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
                                      "relative flex h-10 w-full items-center justify-center rounded-lg transition-colors",
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
                                "relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
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

            {bottomSections.length > 0 && (
              <div className="mt-4 border-t border-black/5 pt-3">
                {bottomSections.flatMap((s) => s.items).map((item) => {
                  const isActive = activeHref === item.href

                  if (collapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "relative flex h-10 w-full items-center justify-center rounded-lg transition-colors",
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
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
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

          <div className="shrink-0 border-t border-black/5 p-2.5">
            {collapsed ? (
              <div className="space-y-1">
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
                    {user ? `${user.first_name} ${user.last_name}` : "Profil"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex h-9 w-full items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Se déconnecter</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-accent text-[11px] font-medium text-muted-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium leading-tight">
                      {user ? `${user.first_name} ${user.last_name}` : "User"}
                    </p>
                    {user?.email && (
                      <p className="truncate text-[11px] text-muted-foreground leading-tight">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-rose-500 transition-colors hover:bg-rose-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
