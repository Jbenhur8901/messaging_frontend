"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ChevronDown, LogOut } from "lucide-react"
import { useAuthStore, useOrganizationStore } from "@/stores"
import {
  getActiveHref,
  getFilteredNavigationSections,
} from "./navigation"

const BRAND_ICON_URL =
  "https://phwyhgzcnnjffovepbrt.supabase.co/storage/v1/object/public/file/2.png"

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { organizations, currentOrganization } = useOrganizationStore()
  const currentRole = organizations.find((org) => org.id === currentOrganization?.id)?.role
  const sections = getFilteredNavigationSections(currentRole === "owner")
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

  const handleLogout = async () => {
    onClose()
    try {
      await logout()
    } catch {
      // Silently fail
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="left"
        className="flex h-full w-64 flex-col overflow-hidden p-0 sm:max-w-64 [&>button]:hidden"
        style={{ background: "#0f0f0f" }}
      >
        <div className="flex min-h-16 shrink-0 items-center border-b border-white/[0.06] px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            onClick={onClose}
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white/10">
              <Image
                src={BRAND_ICON_URL}
                alt="Flow"
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <SheetTitle className="text-sm font-semibold leading-tight text-white">
                Flow
              </SheetTitle>
            </div>
          </Link>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <div className="flex-1 space-y-1">
            {mainSections.map((section, sectionIndex) => {
              const isCollapsible =
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
                            ? "text-white"
                            : "text-white/50 hover:bg-white/[0.06] hover:text-white"
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
                            "h-3.5 w-3.5 text-white/30 transition-transform duration-200",
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
                                      onClick={onClose}
                                      className={cn(
                                        "relative flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                                        isActive || hasActiveChild
                                          ? "bg-[#E0D112]/10 font-medium text-[#E0D112]"
                                          : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                                      )}
                                    >
                                      {(isActive || hasActiveChild) && (
                                        <span className="absolute -left-[13px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[#E0D112]" />
                                      )}
                                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">{item.name}</span>
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
                                            onClick={onClose}
                                            className={cn(
                                              "block rounded-lg px-3 py-2 text-xs transition-colors",
                                                isChildActive
                                                  ? "font-medium text-[#E0D112]"
                                                  : "text-white/50 hover:text-white"
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
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              "relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                              isActive
                                ? "bg-[#E0D112]/10 text-[#E0D112]"
                                : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#E0D112]" />
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
            <div className="mt-4 border-t border-white/[0.06] pt-3">
              {bottomSections.flatMap((s) => s.items).map((item) => {
                const isActive = activeHref === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-[#E0D112]/10 text-[#E0D112]"
                        : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#E0D112]" />
                    )}
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </nav>

        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
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
              onClick={handleLogout}
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
