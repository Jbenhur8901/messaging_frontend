"use client"

import {
  CaretDown,
  CreditCard,
  FileText,
  Invoice,
  Storefront,
  Tag,
  Trash,
  Wallet,
  X,
  type IconProps,
} from "@phosphor-icons/react"
import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

export type IconName =
  | "business"
  | "creditCard"
  | "document"
  | "invoice"
  | "billing"
  | "trash"
  | "tag"
  | "chevronDown"
  | "close"

const ICON_MAP: Record<IconName, ComponentType<IconProps>> = {
  business: Storefront,
  creditCard: CreditCard,
  document: FileText,
  invoice: Invoice,
  billing: Wallet,
  trash: Trash,
  tag: Tag,
  chevronDown: CaretDown,
  close: X,
}

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const Component = ICON_MAP[name]
  return <Component size={size} className={cn("shrink-0", className)} />
}
