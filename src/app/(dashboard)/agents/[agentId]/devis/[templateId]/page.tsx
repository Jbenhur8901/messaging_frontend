"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"
import { handleApiError } from "@/services/api"
import { pdfTemplatesService, type PdfTemplate } from "@/services/pdf-templates"
import { TemplateEditor } from "../_components/template-editor"

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ agentId: string; templateId: string }>
}) {
  const { agentId, templateId } = use(params)
  const router = useRouter()
  const [template, setTemplate] = useState<PdfTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    pdfTemplatesService.getTemplate(templateId)
      .then((t) => { if (active) setTemplate(t) })
      .catch((err) => {
        toast.error(handleApiError(err).message || "Modèle introuvable")
        if (active) router.replace(`/agents/${agentId}/devis`)
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId])

  if (isLoading || !template) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6 animate-spin text-primary" weight="bold" />
      </div>
    )
  }

  return (
    <TemplateEditor
      agentId={agentId}
      mode="edit"
      templateType={template.template_type}
      initialTemplate={template}
      onSaved={() => router.push(`/agents/${agentId}/devis`)}
      onDeleted={() => router.push(`/agents/${agentId}/devis`)}
    />
  )
}
