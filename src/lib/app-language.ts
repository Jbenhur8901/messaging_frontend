"use client"

import { useMemo } from "react"

export type SupportedLanguage = "fr" | "en"

export function useAppLanguage() {
  const language: SupportedLanguage = useMemo(() => {
    if (typeof document === "undefined") return "fr"
    return document.documentElement.lang?.startsWith("en") ? "en" : "fr"
  }, [])
  return { language }
}

export function tLabel(
  language: SupportedLanguage,
  labels: { fr: string; en: string },
): string {
  return language.startsWith("en") ? labels.en : labels.fr
}

export function formatAppNumber(value: number, language: SupportedLanguage = "fr") {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "fr-FR").format(value)
}

export function formatAppDateTime(
  value: string,
  language: SupportedLanguage = "fr",
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(language === "en" ? "en-US" : "fr-FR", options ?? {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
