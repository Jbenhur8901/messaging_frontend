import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function DashboardShell({
  children,
  maxWidth = "1180px",
  innerClassName,
}: {
  children: ReactNode
  maxWidth?: string
  innerClassName?: string
}) {
  return (
    <div className="mx-auto w-full" style={{ maxWidth }}>
      <div className={cn(innerClassName)}>{children}</div>
    </div>
  )
}

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="space-y-1">
      {eyebrow ? (
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-foreground sm:text-[24px]">
        {title}
      </h1>
      {description ? (
        <p className="max-w-2xl text-[13.5px] leading-6 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
