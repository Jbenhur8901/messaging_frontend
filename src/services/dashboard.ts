import { api } from "./api"
import type { DashboardOverview, DailyStat, Broadcast } from "@/types"

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const { data } = await api.get<DashboardOverview>("/v1/dashboard/overview")
    return data
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
