"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { ChevronDown } from "lucide-react"
import {
  getActiveHref,
  getFilteredNavigationSections,
} from "./navigation"

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const sections = getFilteredNavigationSections()
  const activeHref = getActiveHref(pathname, sections)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const mainSections = sections.filter((s) => s.position !== "bottom")
  const bottomSections = sections.filter((s) => s.position === "bottom")

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="left"
        className="w-64 bg-white p-0 sm:max-w-64 [&>button]:hidden"
      >
        {/* Header */}
        <div className="flex h-14 items-center px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            onClick={onClose}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-white">
              <span className="text-xs font-bold">F</span>
            </div>
            <div>
              <SheetTitle className="text-sm font-semibold leading-tight">
                Flow
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground">
                Messaging Platform
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
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
                  {sectionIndex > 0 && (
                    <div className="my-2" />
                  )}

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
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
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
                        <div className="relative mt-0.5 ml-[17px] pl-3">
                          <div className="space-y-0.5">
                            {section.items.map((item) => {
                              const isActive = activeHref === item.href
                              const hasActiveChild = (
                                item.children || []
                              ).some((c) => activeHref === c.href)

                              return (
                                <Link
                                  key={item.name}
                                  href={item.href}
                                  onClick={onClose}
                                  className={cn(
                                    "relative flex items-center gap-2 rounded-md px-2 py-[6px] text-[13px] transition-colors",
                                    isActive || hasActiveChild
                                      ? "bg-primary/[0.06] font-medium text-primary"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                  )}
                                >
                                  {(isActive || hasActiveChild) && (
                                    <span className="absolute -left-[13px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                                  )}
                                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{item.name}</span>
                                </Link>
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
                              "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                              isActive
                                ? "bg-primary/[0.06] text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                            )}
                            <item.icon className="h-[18px] w-[18px] shrink-0" />
                            <span>{item.name}</span>
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
            <div className="mt-auto pt-1">
              {bottomSections.flatMap((s) => s.items).map((item) => {
                const isActive = activeHref === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-primary/[0.06] text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
