"use client"

import * as React from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parse,
} from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  isActive?: boolean
}

export function DatePicker({ value, onChange, placeholder = "Choisir", label, isActive }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [viewDate, setViewDate] = React.useState(() => {
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd", new Date())
      return isNaN(parsed.getTime()) ? new Date() : parsed
    }
    return new Date()
  })

  React.useEffect(() => {
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd", new Date())
      if (!isNaN(parsed.getTime())) setViewDate(parsed)
    }
  }, [value])

  const selectedDate = React.useMemo(() => {
    if (!value) return null
    const parsed = parse(value, "yyyy-MM-dd", new Date())
    return isNaN(parsed.getTime()) ? null : parsed
  }, [value])

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { locale: fr })
  const calEnd = endOfWeek(monthEnd, { locale: fr })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const weekDays = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"]

  const handleSelect = (day: Date) => {
    onChange(format(day, "yyyy-MM-dd"))
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
  }

  const active = isActive ?? !!value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition-colors hover:border-muted-foreground/40",
            active
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border bg-background text-muted-foreground"
          )}
        >
          <CalendarDays className="h-3 w-3 shrink-0 opacity-60" />
          {label && <span className={active ? "text-primary/60" : "text-muted-foreground"}>{label}</span>}
          <span className={cn("whitespace-nowrap", active ? "text-primary font-medium" : "text-muted-foreground")}>
            {selectedDate ? format(selectedDate, "d MMM yyyy", { locale: fr }) : placeholder}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="ml-0.5 rounded-sm p-0.5 hover:bg-primary/10 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            className="h-7 w-7 p-0 rounded-md"
            onClick={() => setViewDate(subMonths(viewDate, 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[13px] font-medium capitalize">
            {format(viewDate, "MMMM yyyy", { locale: fr })}
          </span>
          <Button
            variant="ghost"
            className="h-7 w-7 p-0 rounded-md"
            onClick={() => setViewDate(addMonths(viewDate, 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = isSameMonth(day, viewDate)
            const selected = selectedDate && isSameDay(day, selectedDate)
            const today = isToday(day)

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleSelect(day)}
                className={cn(
                  "h-8 w-8 rounded-md text-[12px] transition-colors",
                  !inMonth && "text-muted-foreground/30",
                  inMonth && !selected && "hover:bg-accent",
                  today && !selected && "font-semibold text-primary",
                  selected && "bg-primary text-primary-foreground font-medium"
                )}
              >
                {format(day, "d")}
              </button>
            )
          })}
        </div>

        {/* Today shortcut */}
        <div className="mt-2 pt-2 border-t flex justify-center">
          <Button
            variant="ghost"
            className="h-7 text-[11px] rounded-md"
            onClick={() => {
              const today = new Date()
              onChange(format(today, "yyyy-MM-dd"))
              setViewDate(today)
              setOpen(false)
            }}
          >
            Aujourd&apos;hui
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
