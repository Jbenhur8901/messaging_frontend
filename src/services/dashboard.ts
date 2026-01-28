import { api } from "./api"
import type { DashboardOverview, DailyStat, Broadcast } from "@/types"

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const unwrapDashboardPayload = (data: unknown) => {
  const root = data as any
  return (
    root?.overview ??
    root?.data?.overview ??
    root?.result?.overview ??
    root?.payload?.overview ??
    root?.dashboard?.overview ??
    root?.dashboard ??
    root?.data ??
    root?.result ??
    root?.payload ??
    root
  )
}

const normalizeDailyStats = (data: unknown): DailyStat[] => {
  const root = data as any
  const stats =
    (Array.isArray(root) ? root : null) ??
    root?.stats ??
    root?.daily ??
    root?.daily_stats ??
    root?.data?.stats ??
    root?.data?.daily ??
    root?.data?.daily_stats ??
    root?.result?.stats ??
    root?.result?.daily ??
    root?.result?.daily_stats ??
    root?.payload?.stats ??
    root?.payload?.daily ??
    root?.payload?.daily_stats ??
    []
  if (!Array.isArray(stats)) return []
  return stats.map((stat) => {
    let messagesSent = toNumber(
      stat?.messages_sent ?? stat?.sent ?? stat?.sent_count ?? stat?.messages ?? stat?.total_sent
    )
    const messagesDelivered = toNumber(
      stat?.messages_delivered ?? stat?.delivered ?? stat?.delivered_count ?? stat?.total_delivered
    )
    const messagesFailed = toNumber(
      stat?.messages_failed ?? stat?.failed ?? stat?.failed_count ?? stat?.total_failed
    )
    const deliveryRate = toNumber(
      stat?.delivery_rate ??
        stat?.delivery_rate_percent ??
        stat?.delivered_rate ??
        stat?.success_rate
    )
    if (messagesSent === 0 && messagesDelivered > 0) {
      messagesSent = messagesDelivered
    }
    return {
      date: stat?.date ?? stat?.day ?? stat?.stat_date ?? "",
      messages_sent: messagesSent,
      messages_delivered: messagesDelivered,
      messages_failed: messagesFailed,
      delivery_rate: deliveryRate || (messagesSent > 0 ? (messagesDelivered / messagesSent) * 100 : 0),
      credits_consumed: toNumber(stat?.credits_consumed ?? stat?.credits ?? stat?.credits_used),
    }
  })
}

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const { data } = await api.get("/v1/dashboard/overview")
    const overview = unwrapDashboardPayload(data)
    const normalized = {
      credits: {
        balance:
          toNumber(
            (overview as any)?.credits?.balance ??
              (overview as any)?.credits?.credit_balance ??
              (overview as any)?.credits_balance ??
              (overview as any)?.credit_balance
          ),
        reserved:
          toNumber(
            (overview as any)?.credits?.reserved ??
              (overview as any)?.credits?.credit_reserved ??
              (overview as any)?.credits_reserved ??
              (overview as any)?.credit_reserved
          ),
        available:
          toNumber(
            (overview as any)?.credits?.available ??
              (overview as any)?.credits?.credit_available ??
              (overview as any)?.credits_available ??
              (overview as any)?.credit_available
          ),
        expiring_soon:
          toNumber(
            (overview as any)?.credits?.expiring_soon ??
              (overview as any)?.credits?.expiringSoon ??
              (overview as any)?.expiring_soon ??
              (overview as any)?.expiring_credits
          ),
        expiring_in_days:
          toNumber(
            (overview as any)?.credits?.expiring_in_days ??
              (overview as any)?.credits?.expiringInDays ??
              (overview as any)?.expiring_in_days ??
              (overview as any)?.expiring_days
          ),
      },
      today: {
        messages_sent: toNumber(
          (overview as any)?.today?.messages_sent ??
            (overview as any)?.today?.sent ??
            (overview as any)?.today?.sent_count ??
            (overview as any)?.today_messages_sent ??
            (overview as any)?.today_sent
        ),
        messages_delivered: toNumber(
          (overview as any)?.today?.messages_delivered ??
            (overview as any)?.today?.delivered ??
            (overview as any)?.today?.delivered_count ??
            (overview as any)?.today_messages_delivered ??
            (overview as any)?.today_delivered
        ),
        delivery_rate: toNumber(
          (overview as any)?.today?.delivery_rate ??
            (overview as any)?.today?.delivery_rate_percent ??
            (overview as any)?.today_delivery_rate ??
            (overview as any)?.today_delivery_rate_percent
        ),
      },
      week: {
        messages_sent: toNumber(
          (overview as any)?.week?.messages_sent ??
            (overview as any)?.week?.sent ??
            (overview as any)?.week?.sent_count ??
            (overview as any)?.week_messages_sent ??
            (overview as any)?.week_sent
        ),
        messages_delivered: toNumber(
          (overview as any)?.week?.messages_delivered ??
            (overview as any)?.week?.delivered ??
            (overview as any)?.week?.delivered_count ??
            (overview as any)?.week_messages_delivered ??
            (overview as any)?.week_delivered
        ),
        delivery_rate: toNumber(
          (overview as any)?.week?.delivery_rate ??
            (overview as any)?.week?.delivery_rate_percent ??
            (overview as any)?.week_delivery_rate ??
            (overview as any)?.week_delivery_rate_percent
        ),
      },
      broadcasts: {
        active: toNumber(
          (overview as any)?.broadcasts?.active ??
            (overview as any)?.active_broadcasts ??
            (overview as any)?.broadcasts_active
        ),
      },
      generated_at: (overview as any)?.generated_at ?? new Date().toISOString(),
    } satisfies DashboardOverview
    return normalized
  },

  async getDailyStats(days = 30): Promise<{ stats: DailyStat[]; period_days: number }> {
    const { data } = await api.get("/v1/dashboard/daily-stats", {
      params: { days },
    })
    const stats = normalizeDailyStats(data)
    const periodDays =
      (data as any)?.period_days ?? (data as any)?.data?.period_days ?? (data as any)?.result?.period_days ?? days
    return { stats, period_days: periodDays }
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
