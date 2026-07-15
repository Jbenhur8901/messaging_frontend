import { useOrganizationStore } from "@/stores"

export function usePlan() {
  const { currentOrganization } = useOrganizationStore()
  const plan = (currentOrganization as { plan?: string } | null)?.plan ?? "base"
  const isPro = plan === "pro"

  return { plan, isPro }
}
