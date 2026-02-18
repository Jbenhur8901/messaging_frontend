import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("fr-FR").format(num)
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

export function formatPhoneNumber(phone?: string | null) {
  if (!phone) return ""

  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.startsWith("33") && cleaned.length === 11) {
    return `+33 ${cleaned.slice(2, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`
  }
  return phone
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "A l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays < 7) return `il y a ${diffDays}j`
  return formatDate(d)
}
