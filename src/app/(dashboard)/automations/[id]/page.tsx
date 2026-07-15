"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { automationsService, handleApiError } from "@/services"
import type { Automation } from "@/services/automations"
import { AutomationEditor } from "../_components/automation-editor"
import type { AutomationEditorProps } from "../_components/automation-editor"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { ProGate } from "@/components/ui/pro-gate"

function EditAutomationPageContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [automation, setAutomation] = useState<Automation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    automationsService.getAutomation(id)
      .then(setAutomation)
      .catch(() => toast.error("Automation introuvable"))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave: AutomationEditorProps["onSave"] = async (payload) => {
    try {
      await automationsService.updateAutomation(id, payload)
      toast.success("Automation mise à jour")
      router.push("/automations")
    } catch (err) {
      toast.error(handleApiError(err).message)
      throw err
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (!automation) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Automation introuvable.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/automations"><ArrowLeft className="size-4 mr-2" />Retour</Link>
        </Button>
      </div>
    )
  }

  return (
    <AutomationEditor
      initial={{
        name: automation.name,
        description: automation.description ?? "",
        trigger_type: automation.trigger_type,
        trigger_config: automation.trigger_config,
        steps: automation.steps ?? [],
        segment_id: automation.segment_id,
        allow_reentry: automation.allow_reentry,
        reentry_days: automation.reentry_days,
      }}
      onSave={handleSave}
    />
  )
}

export default function EditAutomationPage() {
  return <ProGate feature="Automatisations"><EditAutomationPageContent /></ProGate>
}
