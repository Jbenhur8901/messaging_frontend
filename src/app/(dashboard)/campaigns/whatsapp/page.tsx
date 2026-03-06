"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { whatsappService } from "@/services"
import type { WhatsAppBroadcast, WhatsAppBroadcastStatus, Pagination } from "@/types"
import { formatNumber, formatDate } from "@/lib/utils"
import { ChannelTabs } from "@/components/channel-tabs"
import { BroadcastStatusBadge } from "@/components/whatsapp/whatsapp-status-badge"
import { useOrganizationStore } from "@/stores"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Eye, RefreshCw, MessageSquareMore, AlertTriangle, Settings, ChevronLeft, ChevronRight } from "lucide-react"
import { featureFlags } from "@/config/features"

/* ── Stagger animation ── */
const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

const PAGE_SIZE = 15
const FETCH_LIMIT = 100

const STATUS_FILTERS: { label: string; value: WhatsAppBroadcastStatus | "all" }[] = [
  { label: "Tous", value: "all" },
  { label: "Terminé", value: "completed" },
  { label: "En cours", value: "processing" },
  { label: "En attente", value: "pending" },
  { label: "Échoué", value: "failed" },
]

export default function WhatsAppCampaignsPage() {
  const { currentOrganization } = useOrganizationStore()
  const [broadcasts, setBroadcasts] = useState<WhatsAppBroadcast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [statusFilter, setStatusFilter] = useState<WhatsAppBroadcastStatus | "all">("all")
  const [page, setPage] = useState(0)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  useEffect(() => {
    if (!currentOrganization?.id) {
      setIsConfigured(false)
      setIsLoading(false)
      return
    }
    checkConfigAndLoadBroadcasts()
  }, [currentOrganization?.id])

  const checkConfigAndLoadBroadcasts = async () => {
    try {
      if (!currentOrganization?.id) return
      const configResult = await whatsappService.getConfig(currentOrganization.id)
      setIsConfigured(configResult.is_configured)
      if (configResult.is_configured) {
        await loadBroadcasts(0, "all")
      }
    } catch {
      setIsConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBroadcasts = useCallback(async (p: number, status: WhatsAppBroadcastStatus | "all") => {
    setIsLoading(true)
    try {
      const absoluteOffset = p * PAGE_SIZE
      const fetchOffset = Math.floor(absoluteOffset / FETCH_LIMIT) * FETCH_LIMIT
      const pageStartInChunk = absoluteOffset - fetchOffset
      const result = await whatsappService.getBroadcasts(
        FETCH_LIMIT,
        fetchOffset,
        status === "all" ? undefined : status
      )
      const chunkItems = result.broadcasts || []
      setBroadcasts(chunkItems.slice(pageStartInChunk, pageStartInChunk + PAGE_SIZE))
      setPagination(result.pagination || null)
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleFilterChange = (status: WhatsAppBroadcastStatus | "all") => {
    setStatusFilter(status)
    setPage(0)
    loadBroadcasts(0, status)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    loadBroadcasts(newPage, statusFilter)
  }

  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 0

  /* ── Loading skeleton ── */
  if (isLoading && isConfigured === null) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  /* ── Not configured ── */
  if (isConfigured === false) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between" style={stagger(0)}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Campagnes WhatsApp</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Gérez vos campagnes et suivez leurs performances.
            </p>
          </div>
          {featureFlags.SMS_ENABLED && <ChannelTabs basePath="campaigns" />}
        </div>

        <Card className="border-transparent" style={stagger(1)}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-[15px] font-medium">WhatsApp non configuré</p>
            <p className="text-[13px] text-muted-foreground mb-4 text-center max-w-md">
              Configurez vos credentials WhatsApp Business API pour créer des campagnes
            </p>
            <Link href="/whatsapp/config">
              <Button size="sm" className="h-8 gap-1.5 text-[13px] rounded-lg">
                <Settings className="h-3.5 w-3.5" />
                Configurer WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between" style={stagger(0)}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Campagnes WhatsApp</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Gérez vos campagnes et suivez leurs performances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {featureFlags.SMS_ENABLED && <ChannelTabs basePath="campaigns" />}
          <Link href="/campaigns/whatsapp/new">
            <Button size="sm" className="h-8 gap-1.5 text-[13px] rounded-lg">
              <Plus className="h-3.5 w-3.5" />
              Nouvelle campagne
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => loadBroadcasts(page, statusFilter)}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-1.5" style={stagger(1)}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleFilterChange(f.value)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <Card className="border-transparent" style={stagger(2)}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquareMore className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-[15px] font-medium">
              {statusFilter === "all" ? "Aucune campagne" : "Aucune campagne avec ce statut"}
            </p>
            <p className="text-[13px] text-muted-foreground mb-4">
              {statusFilter === "all"
                ? "Créez votre première campagne WhatsApp"
                : "Essayez un autre filtre"}
            </p>
            {statusFilter === "all" && (
              <Link href="/campaigns/whatsapp/new">
                <Button size="sm" className="h-8 gap-1.5 text-[13px] rounded-lg">
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle campagne
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div style={stagger(2)}>
          {/* ── Column headers ── */}
          <div className="flex items-center gap-4 px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <div className="min-w-0 flex-1">Campagne</div>
            <div className="hidden sm:block w-20 text-right">Dest.</div>
            <div className="hidden sm:block w-20 text-right" style={{ color: "#10b981" }}>Livrés</div>
            <div className="hidden sm:block w-16 text-right" style={{ color: "#0ea5e9" }}>Lus</div>
            <div className="hidden sm:block w-16 text-right" style={{ color: "#ef4444" }}>Échoués</div>
            <div className="hidden lg:block w-20 text-right">Date</div>
            <div className="w-24 text-center">Statut</div>
            <div className="w-4" />
          </div>

          {/* ── Rows ── */}
          <div className="space-y-0.5">
            {broadcasts.map((broadcast, i) => (
              <Link
                key={broadcast.id}
                href={`/campaigns/whatsapp/${broadcast.id}`}
                className="group block"
                style={stagger(i + 3)}
              >
                <div className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors duration-200 hover:bg-accent/50">
                  {/* Name + template */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate group-hover:text-foreground transition-colors">
                      {broadcast.campaign_name || "Sans nom"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground truncate">
                        {broadcast.template_name}
                      </span>
                      {broadcast.template_language && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-border/50">
                          {broadcast.template_language}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Destinataires */}
                  <span className="hidden sm:block text-[12px] text-muted-foreground w-20 text-right tabular-nums">
                    {formatNumber(broadcast.total_recipients)}
                  </span>

                  {/* Livrés */}
                  <span className="hidden sm:block text-[12px] w-20 text-right tabular-nums" style={{ color: "#10b981" }}>
                    {formatNumber(broadcast.delivered_count)}
                  </span>

                  {/* Lus */}
                  <span className="hidden sm:block text-[12px] w-16 text-right tabular-nums" style={{ color: "#0ea5e9" }}>
                    {formatNumber(broadcast.read_count)}
                  </span>

                  {/* Échoués */}
                  <span className="hidden sm:block text-[12px] w-16 text-right tabular-nums" style={{ color: broadcast.failed_count > 0 ? "#ef4444" : undefined }}>
                    {broadcast.failed_count > 0 ? formatNumber(broadcast.failed_count) : "—"}
                  </span>

                  {/* Date */}
                  <span className="hidden lg:block text-[11px] text-muted-foreground shrink-0 w-20 text-right">
                    {formatDate(broadcast.created_at)}
                  </span>

                  {/* Status */}
                  <div className="w-24 flex justify-center shrink-0">
                    <BroadcastStatusBadge status={broadcast.status} />
                  </div>

                  {/* Arrow */}
                  <Eye className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 px-4">
              <span className="text-[12px] text-muted-foreground">
                {pagination?.total ?? 0} campagne{(pagination?.total ?? 0) > 1 ? "s" : ""} · Page {page + 1} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page === 0 || isLoading}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page >= totalPages - 1 || isLoading}
                  onClick={() => handlePageChange(page + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
