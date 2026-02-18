"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  hasError?: boolean
  className?: string
}

export const OTPInput = React.forwardRef<HTMLInputElement, OTPInputProps>(
  (
    {
      length = 6,
      value,
      onChange,
      onComplete,
      disabled = false,
      hasError = false,
      className,
    },
    ref
  ) => {
    const inputRefs = React.useRef<Array<HTMLInputElement | null>>([])
    const values = Array.from({ length }, (_, index) => value[index] || "")

    React.useImperativeHandle(ref, () => inputRefs.current[0] as HTMLInputElement, [])

    const focusAt = (index: number) => {
      const safeIndex = Math.max(0, Math.min(index, length - 1))
      inputRefs.current[safeIndex]?.focus()
      inputRefs.current[safeIndex]?.select()
    }

    const emitChange = (next: string[]) => {
      const nextValue = next.join("").slice(0, length)
      onChange(nextValue)
      if (next.length === length && next.every((d) => d.length === 1)) {
        onComplete?.(nextValue)
      }
    }

    const handleChange = (index: number, rawValue: string) => {
      if (disabled) return
      const digit = rawValue.replace(/\D/g, "").slice(-1)
      const next = [...values]
      next[index] = digit
      emitChange(next)
      if (digit && index < length - 1) focusAt(index + 1)
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return
      if (e.key === "Backspace") {
        e.preventDefault()
        const next = [...values]
        if (next[index]) {
          next[index] = ""
          emitChange(next)
          return
        }
        if (index > 0) {
          next[index - 1] = ""
          emitChange(next)
          focusAt(index - 1)
        }
      }
      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault()
        focusAt(index - 1)
      }
      if (e.key === "ArrowRight" && index < length - 1) {
        e.preventDefault()
        focusAt(index + 1)
      }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (disabled) return
      e.preventDefault()
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
      if (!pasted) return
      const next = Array.from({ length }, (_, idx) => pasted[idx] || "")
      emitChange(next)
      const focusIndex = Math.min(pasted.length, length - 1)
      focusAt(focusIndex)
    }

    return (
      <div className={cn("flex items-center justify-center gap-2", hasError && "animate-shake", className)}>
        {values.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={cn(
              "h-11 w-10 rounded-lg border text-center text-[15px] font-mono",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              "disabled:cursor-not-allowed disabled:opacity-60",
              hasError && "border-destructive/60"
            )}
          />
        ))}
      </div>
    )
  }
)

OTPInput.displayName = "OTPInput"
