"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import { agentsService, type Agent } from "@/services/agents"
import { AGENT_CATALOG } from "./_catalog"
import { ProGate } from "@/components/ui/pro-gate"

const getPresentation = (agent: Agent) =>
  AGENT_CATALOG.find((item) => item.id === agent.slug || item.label === agent.name)

function AgentsPageContent() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      try {
        const [agentsResult, activeResult] = await Promise.all([
          agentsService.listAgents(),
          agentsService.getActiveAgent().catch(() => null),
        ])
        if (active) {
          setAgents(agentsResult)
          setActiveAgent(activeResult)
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Automatisation
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Agents IA</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-8 text-center">
          <p className="text-[14px] font-semibold text-foreground">Aucun agent</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Aucun agent WhatsApp n&apos;est disponible pour cette organisation.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const presentation = getPresentation(agent)
            const href = `/agents/${agent.slug || agent.id}`
            const capabilities = presentation?.capabilities || agent.ai_tools
            const isActive = activeAgent?.id === agent.id

            return (
              <Link
                key={agent.id}
                href={href}
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl"
              >
                <div className={`relative flex h-full flex-col rounded-2xl border-l-4 border border-border/50 bg-card/60 p-5 transition-all duration-200 hover:bg-card/80 hover:border-border/80 ${presentation?.accentClass || "border-l-sky-500/70"}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${presentation?.categoryClass || "text-sky-400"}`}>
                      {presentation?.category || agent.channel}
                    </p>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
                      isActive
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                        : "border-border/50 bg-muted/30 text-muted-foreground"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                      {isActive ? "Actif" : "Inactif"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl ring-1 ring-white/10">
                      {presentation?.emoji || "🤖"}
                    </div>
                    <p className="text-[15px] font-semibold text-foreground">{agent.name}</p>
                  </div>

                  <p className="mb-3 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                    {agent.description || presentation?.description || "Agent IA connecté à votre organisation."}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {capabilities.slice(0, 3).map((cap) => (
                        <span
                          key={cap}
                          className="inline-flex items-center rounded-full border border-border/40 bg-muted/25 px-2 py-0.5 text-[11px] text-muted-foreground/70"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary"
                      weight="bold"
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AgentsPage() {
  return <ProGate feature="Agents IA"><AgentsPageContent /></ProGate>
}
