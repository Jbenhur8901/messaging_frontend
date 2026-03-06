"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

type PaginationControlsProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
  compact?: boolean
}

const buildVisiblePages = (page: number, totalPages: number): (number | "...")[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (page <= 3) return [1, 2, 3, 4, "...", totalPages]
  if (page >= totalPages - 2) return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  return [1, "...", page - 1, page, page + 1, "...", totalPages]
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  compact = false,
}: PaginationControlsProps) {
  const currentPage = Math.min(Math.max(1, page), Math.max(1, totalPages))
  const pages = buildVisiblePages(currentPage, totalPages)
  const buttonSize = compact ? "h-7 w-7" : "h-8 w-8"

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        className={`${buttonSize} p-0 rounded-lg`}
        disabled={disabled || currentPage === 1}
        onClick={() => onPageChange(1)}
        title="Première page"
      >
        <ChevronsLeft className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        className={`${buttonSize} p-0 rounded-lg`}
        disabled={disabled || currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        title="Page précédente"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {pages.map((entry, index) =>
        entry === "..." ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex w-6 items-center justify-center text-xs text-muted-foreground"
          >
            ...
          </span>
        ) : (
          <Button
            key={entry}
            variant={entry === currentPage ? "default" : "outline"}
            size="sm"
            className={`${buttonSize} p-0 rounded-lg text-xs`}
            disabled={disabled}
            onClick={() => onPageChange(entry)}
          >
            {entry}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        className={`${buttonSize} p-0 rounded-lg`}
        disabled={disabled || currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        title="Page suivante"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        className={`${buttonSize} p-0 rounded-lg`}
        disabled={disabled || currentPage >= totalPages}
        onClick={() => onPageChange(totalPages)}
        title="Dernière page"
      >
        <ChevronsRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
