"use client"
import dynamic from "next/dynamic"

const Agentation =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("agentation").then((m) => ({ default: m.Agentation })), { ssr: false })
    : null

export function DevAgentation() {
  if (!Agentation) return null
  return <Agentation />
}
