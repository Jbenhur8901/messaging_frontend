"use client"

import { useRouter } from "next/navigation"
import { segmentsService, handleApiError } from "@/services"
import type { SegmentCriteria } from "@/services/segments"
import { SegmentEditor } from "../_components/segment-editor"
import { ProGate } from "@/components/ui/pro-gate"
import { toast } from "sonner"

export default function NewSegmentPage() {
  const router = useRouter()

  async function handleSave(name: string, description: string, criteria: SegmentCriteria) {
    try {
      await segmentsService.createSegment({ name, description: description || undefined, criteria })
      toast.success("Segment créé")
      router.push("/contacts/segments")
    } catch (err) {
      toast.error(handleApiError(err).message)
      throw err
    }
  }

  return <ProGate feature="Segments"><SegmentEditor onSave={handleSave} /></ProGate>
}
