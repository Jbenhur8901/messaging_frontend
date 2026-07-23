"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { tLabel, type SupportedLanguage } from "@/lib/app-language"

const DEFAULT_PREFIX = "+242"

export function PhoneDialInput({
  label,
  value,
  onChange,
  placeholder = "06 000 0000",
  language = "fr",
  locked = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  language?: SupportedLanguage
  locked?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="flex h-9 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-[13px] text-muted-foreground">
          {locked ? DEFAULT_PREFIX : DEFAULT_PREFIX}
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="tel"
          aria-label={tLabel(language, { fr: "Numéro de téléphone", en: "Phone number" })}
        />
      </div>
    </div>
  )
}
