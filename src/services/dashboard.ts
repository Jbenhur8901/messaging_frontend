import { api } from "./api"
import type { DashboardOverview, DailyStat, Broadcast } from "@/types"

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const { data } = await api.get("/v1/dashboard/overview")
    const overview = (data as { overview?: DashboardOverview }).overview ?? data
    const normalized = {
      credits: {
        balance:
          (overview as any)?.credits?.balance ??
          (overview as any)?.credits?.credit_balance ??
          (overview as any)?.credits_balance ??
          0,
        reserved:
          (overview as any)?.credits?.reserved ??
          (overview as any)?.credits?.credit_reserved ??
          (overview as any)?.credits_reserved ??
          0,
        available:
          (overview as any)?.credits?.available ??
          (overview as any)?.credits?.credit_available ??
          (overview as any)?.credits_available ??
          0,
        expiring_soon:
          (overview as any)?.credits?.expiring_soon ??
          (overview as any)?.credits?.expiringSoon ??
          (overview as any)?.expiring_soon ??
          0,
        expiring_in_days:
          (overview as any)?.credits?.expiring_in_days ??
          (overview as any)?.credits?.expiringInDays ??
          (overview as any)?.expiring_in_days ??
          0,
      },
      today: {
        messages_sent: (overview as any)?.today?.messages_sent ?? (overview as any)?.today_messages_sent ?? 0,
        messages_delivered: (overview as any)?.today?.messages_delivered ?? (overview as any)?.today_messages_delivered ?? 0,
        delivery_rate: (overview as any)?.today?.delivery_rate ?? (overview as any)?.today_delivery_rate ?? 0,
      },
      week: {
        messages_sent: (overview as any)?.week?.messages_sent ?? (overview as any)?.week_messages_sent ?? 0,
        messages_delivered: (overview as any)?.week?.messages_delivered ?? (overview as any)?.week_messages_delivered ?? 0,
        delivery_rate: (overview as any)?.week?.delivery_rate ?? (overview as any)?.week_delivery_rate ?? 0,
      },
      broadcasts: {
        active: (overview as any)?.broadcasts?.active ?? (overview as any)?.active_broadcasts ?? 0,
      },
      generated_at: (overview as any)?.generated_at ?? new Date().toISOString(),
    } satisfies DashboardOverview
    return normalized
  },

  async getDailyStats(days = 30): Promise<{ stats: DailyStat[]; period_days: number }> {
    const { data } = await api.get("/v1/dashboard/daily-stats", {
      params: { days },
    })
    return data
  },

  async getDeliveryBreakdown(days = 7): Promise<{
    delivered: number
    failed: number
    pending: number
    total: number
    delivery_rate: number
  }> {
    const { data } = await api.get("/v1/dashboard/delivery-breakdown", {
      params: { days },
    })
    return data
  },

  async getRecentBroadcasts(limit = 10): Promise<{ broadcasts: Broadcast[] }> {
    const { data } = await api.get("/v1/dashboard/recent-broadcasts", {
      params: { limit },
    })
    const broadcasts = (data.broadcasts || []).map((b: Broadcast & { id?: string }) => ({
      ...b,
      broadcast_id: b.broadcast_id || b.id,
    }))
    return { broadcasts }
  },

  async getHourlyDistribution(days = 7): Promise<{
    distribution: Array<{ hour: number; count: number }>
  }> {
    const { data } = await api.get("/v1/dashboard/hourly-distribution", {
      params: { days },
    })
    return data
  },

  async getErrorBreakdown(days = 30): Promise<{
    errors: Array<{ error_code: string; count: number; description: string }>
  }> {
    const { data } = await api.get("/v1/dashboard/error-breakdown", {
      params: { days },
    })
    return data
  },

  async getCreditPackages(): Promise<{
    packages: Array<{
      id: string
      name: string
      credits: number
      price: number
      currency: string
      bonus_percent?: number
    }>
  }> {
    const { data } = await api.get("/v1/dashboard/credit-packages")
    return data
  },
}
