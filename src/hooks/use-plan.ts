import { useOrganizationStore } from "@/stores"

export function usePlan() {
  const { currentOrganization } = useOrganizationStore()
  const plan = currentOrganization?.plan ?? "base"
  const isPro = plan === "pro"

  return {
    plan,
    isPro,
    planExpiresAt: currentOrganization?.plan_expires_at ?? null,
    planStartedAt: currentOrganization?.plan_started_at ?? null,
    billingPeriod: currentOrganization?.billing_period ?? null,
  }
}
