"use client"

import { useRouter } from "next/navigation"
import { automationsService, handleApiError } from "@/services"
import { AutomationEditor } from "../_components/automation-editor"
import type { AutomationEditorProps } from "../_components/automation-editor"
import { ProGate } from "@/components/ui/pro-gate"
import { toast } from "sonner"

export default function NewAutomationPage() {
  const router = useRouter()

  const handleSave: AutomationEditorProps["onSave"] = async (payload) => {
    try {
      await automationsService.createAutomation(payload)
      toast.success("Automation créée")
      router.push("/automations")
    } catch (err) {
      toast.error(handleApiError(err).message)
      throw err
    }
  }

  return <ProGate feature="Automatisations"><AutomationEditor onSave={handleSave} /></ProGate>
}
