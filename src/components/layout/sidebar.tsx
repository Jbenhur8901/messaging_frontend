"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { FlowLogo } from "@/components/brand/flow-logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuthStore, useOrganizationStore } from "@/stores"
import { CaretDown, SignOut, SidebarSimple } from "@phosphor-icons/react"
import {
  getActiveHref,
  getFilteredNavigationSections,
} from "./navigation"
import { NavIcon } from "./nav-icon"
import { ProBadge } from "@/components/ui/pro-gate"
import { usePlan } from "@/hooks"

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { organizations, currentOrganization } = useOrganizationStore()
  const currentRole = organizations.find((org) => org.id === currentOrganization?.id)?.role
  const sections = getFilteredNavigationSections(currentRole === "owner")
  const { isPro } = usePlan()
  const activeHref = getActiveHref(pathname, sections)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const userInitials = useMemo(() => {
    const first = user?.first_name?.[0] || ""
    const last = user?.last_name?.[0] || ""
    return `${first}${last}`.toUpperCase() || "U"
  }, [user?.first_name, user?.last_name])

  const displayName = useMemo(() => {
    const fullName = [user?.first_name, user?.last_name]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ")

    if (fullName) return fullName
    if (user?.email) return user.email
    return "Utilisateur"
  }, [user?.email, user?.first_name, user?.last_name])

  const mainSections = sections.filter((s) => s.position !== "bottom")
  const bottomSections = sections.filter((s) => s.position === "bottom")

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col",
          "transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          collapsed ? "lg:w-[60px]" : "lg:w-[248px]"
        )}
      >
        <div className="flex h-full flex-col border-r border-white/[0.07] bg-gradient-to-b from-[#141414] via-[#0f0f0f] to-[#0a0a0a]">
          <div className="flex h-[3.75rem] shrink-0 items-center border-b border-white/[0.07] px-3 backdrop-blur-sm">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="mx-auto flex h-8 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/10 transition-opacity hover:opacity-90"
                  >
                    <FlowLogo size={28} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Ouvrir le menu</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex w-full items-center justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10 px-0.5">
                    <FlowLogo size={28} />
                  </div>
                  <p className="truncate text-sm font-semibold text-white">Flow</p>
                </div>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                  aria-label="Réduire la sidebar"
                >
                  <SidebarSimple className="h-4 w-4 text-white/50" weight="regular" />
                </button>
              </div>
            )}
          </div>

          <nav className="min-h-0 flex flex-1 flex-col overflow-y-auto px-2.5 py-4">
            <div className="flex-1 space-y-1.5">
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
                            "group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium tracking-tight transition-all duration-200",
                            sectionHasActive
                              ? "bg-white/[0.04] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                              : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                          )}
                        >
                          {section.icon && (
                            <NavIcon
                              icon={section.icon}
                              active={sectionHasActive}
                              className="h-[18px] w-[18px] shrink-0"
                            />
                          )}
                          <span className="flex-1 truncate text-left">
                            {section.title}
                          </span>
                          <CaretDown
                            weight="bold"
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-white/35 transition-transform duration-200",
                              !isSectionOpen && "-rotate-90"
                            )}
                          />
                        </button>

                        {isSectionOpen && (
                          <div className="relative mt-2 ml-2 border-l border-white/[0.08] pl-3">
                            <div className="space-y-0.5 pt-0.5">
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
                                          "relative flex min-h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] tracking-tight transition-all duration-200",
                                          isActive || hasActiveChild
                                            ? "bg-gradient-to-r from-[#E0D112]/18 to-[#E0D112]/[0.07] font-semibold text-[#E0D112]"
                                            : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                                        )}
                                      >
                                        <NavIcon
                                          icon={item.icon}
                                          active={isActive || hasActiveChild}
                                          className="h-3.5 w-3.5 shrink-0"
                                        />
                                        <span className="truncate">{item.name}</span>
                                        {item.proOnly && !isPro && <ProBadge />}
                                      </Link>
                                      {hasChildren && (
                                        <button
                                          type="button"
                                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/30 transition-colors hover:text-white"
                                          onClick={() =>
                                            setOpenGroups((prev) => ({
                                              ...prev,
                                              [item.name]: !isGroupOpen,
                                            }))
                                          }
                                        >
                                          <CaretDown
                                            weight="bold"
                                            className={cn(
                                              "h-3 w-3 transition-transform duration-200",
                                              !isGroupOpen && "-rotate-90"
                                            )}
                                          />
                                        </button>
                                      )}
                                    </div>

                                    {hasChildren && isGroupOpen && (
                                      <div className="ml-1 mt-1 space-y-0.5 border-l border-white/[0.06] pl-3">
                                        {item.children?.map((child) => {
                                          const isChildActive = activeHref === child.href
                                          return (
                                            <Link
                                              key={child.href}
                                              href={child.href}
                                              className={cn(
                                                "block rounded-md py-1.5 pl-2 pr-2 text-[12px] leading-snug transition-colors duration-200",
                                                isChildActive
                                                  ? "font-semibold text-[#E0D112]"
                                                  : "text-white/45 hover:bg-white/[0.04] hover:text-white"
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
                                      "relative flex h-10 w-full items-center justify-center rounded-xl transition-all duration-200",
                                      isActive
                                        ? "bg-gradient-to-br from-[#E0D112]/22 to-[#E0D112]/8 text-[#E0D112]"
                                        : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                                    )}
                                  >
                                    {isActive && (
                                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#E0D112]" />
                                    )}
                                    <NavIcon icon={item.icon} active={isActive} className="h-[18px] w-[18px]" />
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
                                "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium tracking-tight transition-all duration-200",
                                isActive
                                  ? "bg-gradient-to-r from-[#E0D112]/18 to-[#E0D112]/[0.07] font-semibold text-[#E0D112]"
                                  : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                              )}
                            >
                              <NavIcon icon={item.icon} active={isActive} className="h-[18px] w-[18px] shrink-0" />
                              <span className="truncate">{item.name}</span>
                              {item.proOnly && !isPro && <ProBadge />}
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
              <div className="mt-4 border-t border-white/[0.07] pt-3">
                {bottomSections.flatMap((s) => s.items).map((item) => {
                  const isActive = activeHref === item.href

                  if (collapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "relative flex h-10 w-full items-center justify-center rounded-xl transition-all duration-200",
                              isActive
                                ? "bg-gradient-to-br from-[#E0D112]/22 to-[#E0D112]/8 text-[#E0D112]"
                                : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#E0D112]" />
                            )}
                            <NavIcon icon={item.icon} active={isActive} className="h-[18px] w-[18px]" />
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
                        "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium tracking-tight transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-[#E0D112]/18 to-[#E0D112]/[0.07] font-semibold text-[#E0D112]"
                          : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <NavIcon icon={item.icon} active={isActive} className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </nav>

          <div className="shrink-0 border-t border-white/[0.07] p-2.5">
            {collapsed ? (
              <div className="space-y-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center py-1">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-white/[0.08] text-[11px] font-medium text-white/60">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {user ? displayName : "Profil"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex h-9 w-full items-center justify-center rounded-md text-rose-400 transition-colors hover:bg-rose-500/10"
                    >
                      <SignOut className="h-4 w-4" weight="regular" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Se déconnecter</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-white/[0.08] text-[11px] font-medium text-white/60">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium leading-tight text-white">
                      {user ? displayName : "Utilisateur"}
                    </p>
                    {user?.email && (
                      <p className="truncate text-[11px] text-white/40 leading-tight">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                >
                  <SignOut className="h-3.5 w-3.5" weight="regular" />
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
