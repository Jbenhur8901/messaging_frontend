import { api } from "./api"
import type { DashboardOverview, DailyStat, Broadcast } from "@/types"

export type DashboardChannel = "sms" | "whatsapp" | undefined

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = toNumber(value)
    if (parsed > 0) return parsed
  }
  return 0
}

const unwrapBroadcastsPayload = (data: unknown) => {
  const root = data as any
  return (
    (Array.isArray(root) ? root : null) ??
    root?.broadcasts ??
    root?.whatsapp_broadcasts ??
    root?.sms_broadcasts ??
    root?.data?.broadcasts ??
    root?.data?.whatsapp_broadcasts ??
    root?.data?.sms_broadcasts ??
    root?.result?.broadcasts ??
    root?.result?.whatsapp_broadcasts ??
    root?.result?.sms_broadcasts ??
    root?.payload?.broadcasts ??
    root?.payload?.whatsapp_broadcasts ??
    root?.payload?.sms_broadcasts ??
    []
  )
}

const normalizeBroadcast = (broadcast: any): Broadcast => {
  const totalRecipients = pickNumber(
    broadcast?.total_recipients,
    broadcast?.recipients_count,
    broadcast?.recipient_count,
    broadcast?.total
  )
  const sentCount = pickNumber(
    broadcast?.sent_count,
    broadcast?.messages_sent,
    broadcast?.total_sent,
    broadcast?.sent,
    totalRecipients
  )
  const deliveredCount = pickNumber(
    broadcast?.delivered_count,
    broadcast?.messages_delivered,
    broadcast?.total_delivered,
    broadcast?.delivered
  )
  const readCount = pickNumber(
    broadcast?.read_count,
    broadcast?.messages_read,
    broadcast?.total_read,
    broadcast?.read
  )
  const failedCount = pickNumber(
    broadcast?.failed_count,
    broadcast?.messages_failed,
    broadcast?.total_failed,
    broadcast?.failed
  )
  const deliveryRate = pickNumber(
    broadcast?.delivery_rate,
    broadcast?.delivery_rate_percent,
    broadcast?.delivered_rate
  ) || (sentCount > 0 ? (deliveredCount / sentCount) * 100 : 0)
  const readRate = pickNumber(
    broadcast?.read_rate,
    broadcast?.read_rate_percent
  ) || (sentCount > 0 ? (readCount / sentCount) * 100 : 0)

  return {
    ...broadcast,
    broadcast_id: broadcast?.broadcast_id || broadcast?.id,
    status: broadcast?.status ?? "pending",
    total_recipients: totalRecipients,
    sent_count: sentCount,
    failed_count: failedCount,
    pending_count: toNumber(broadcast?.pending_count ?? broadcast?.pending),
    progress_percent: toNumber(broadcast?.progress_percent ?? broadcast?.progress),
    segments_per_message: toNumber(broadcast?.segments_per_message) || 1,
    total_segments: toNumber(broadcast?.total_segments),
    credits_consumed: toNumber(broadcast?.credits_consumed ?? broadcast?.credits_used),
    credits_reserved: toNumber(broadcast?.credits_reserved),
    message_encoding: broadcast?.message_encoding ?? "GSM-7",
    campaign_name: broadcast?.campaign_name ?? broadcast?.name ?? broadcast?.title ?? null,
    created_at: broadcast?.created_at ?? broadcast?.createdAt ?? "",
    completed_at: broadcast?.completed_at ?? broadcast?.completedAt ?? null,
    channel: broadcast?.channel ?? "whatsapp",
    template_name: broadcast?.template_name,
    delivered_count: deliveredCount,
    read_count: readCount,
    delivery_rate: deliveryRate,
    read_rate: readRate,
  }
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
      stat?.messages_sent ?? stat?.whatsapp_messages_sent ?? stat?.sent ?? stat?.sent_count ?? stat?.messages ?? stat?.total_sent
    )
    const messagesDelivered = toNumber(
      stat?.messages_delivered ?? stat?.whatsapp_messages_delivered ?? stat?.delivered ?? stat?.delivered_count ?? stat?.total_delivered
    )
    const messagesFailed = toNumber(
      stat?.messages_failed ?? stat?.whatsapp_messages_failed ?? stat?.failed ?? stat?.failed_count ?? stat?.total_failed
    )
    const messagesRead = toNumber(
      stat?.messages_read ?? stat?.whatsapp_messages_read ?? stat?.read ?? stat?.read_count ?? stat?.total_read
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
      messages_read: messagesRead,
      delivery_rate: deliveryRate || (messagesSent > 0 ? (messagesDelivered / messagesSent) * 100 : 0),
      credits_consumed: toNumber(stat?.credits_consumed ?? stat?.credits ?? stat?.credits_used),
    }
  })
}

export const dashboardService = {
  async getOverview(channel?: DashboardChannel): Promise<DashboardOverview> {
    const { data } = await api.get("/v1/dashboard/overview", {
      params: { ...(channel && { channel }) },
    })
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

  async getDailyStats(days = 30, channel?: DashboardChannel): Promise<{
    stats: DailyStat[]
    period_days: number
    whatsapp_totals?: {
      messages_sent: number
      messages_delivered: number
      messages_read: number
      messages_failed: number
      delivery_rate: number
      read_rate: number
    }
  }> {
    const { data } = await api.get("/v1/dashboard/daily-stats", {
      params: { days, ...(channel && { channel }) },
    })
    const stats = normalizeDailyStats(data)
    const periodDays =
      (data as any)?.period_days ?? (data as any)?.data?.period_days ?? (data as any)?.result?.period_days ?? days
    const waTotals = (data as any)?.whatsapp_totals
    return { stats, period_days: periodDays, ...(waTotals && { whatsapp_totals: waTotals }) }
  },

  async getDeliveryBreakdown(days = 7, channel?: DashboardChannel): Promise<{
    delivered: number
    failed: number
    pending: number
    total: number
    delivery_rate: number
  }> {
    const { data } = await api.get("/v1/dashboard/delivery-breakdown", {
      params: { days, ...(channel && { channel }) },
    })
    return data
  },

  async getRecentBroadcasts(limit = 10, channel?: DashboardChannel): Promise<{ broadcasts: Broadcast[] }> {
    const { data } = await api.get("/v1/dashboard/recent-broadcasts", {
      params: { limit, ...(channel && { channel }) },
    })
    const raw = unwrapBroadcastsPayload(data)
    const broadcasts = Array.isArray(raw) ? raw.map(normalizeBroadcast) : []
    return { broadcasts }
  },

  async getHourlyDistribution(days = 7, channel?: DashboardChannel): Promise<{
    distribution: Array<{ hour: number; count: number }>
  }> {
    const { data } = await api.get("/v1/dashboard/hourly-distribution", {
      params: { days, ...(channel && { channel }) },
    })
    return data
  },

  async getErrorBreakdown(days = 30, channel?: DashboardChannel): Promise<{
    errors: Array<{ error_code: string; count: number; description: string }>
  }> {
    const { data } = await api.get("/v1/dashboard/error-breakdown", {
      params: { days, ...(channel && { channel }) },
    })
    return data
  },

  async getCreditPackages(channel?: DashboardChannel): Promise<{
    packages: Array<{
      id: string
      name: string
      credits: number
      price: number
      currency: string
      bonus_percent?: number
    }>
  }> {
    const { data } = await api.get("/v1/dashboard/credit-packages", {
      params: { ...(channel && { channel }) },
    })
    return data
  },
}
