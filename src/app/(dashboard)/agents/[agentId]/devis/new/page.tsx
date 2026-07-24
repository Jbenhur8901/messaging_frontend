"use client"

import { use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { TemplateEditor } from "../_components/template-editor"
import type { PdfTemplateType } from "@/services/pdf-templates"

export default function NewTemplatePage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type")
  const templateType: PdfTemplateType = typeParam === "kyc" ? "kyc" : "facturation"

  return (
    <TemplateEditor
      agentId={agentId}
      mode="create"
      templateType={templateType}
      onSaved={() => router.push(`/agents/${agentId}/devis`)}
    />
  )
}
