"use client"

import { use, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { agentsService, handleApiError } from "@/services"
import type { Agent } from "@/services/agents"
import { aiToolsService } from "@/services/ai-tools"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Pencil,
  Spinner,
} from "@phosphor-icons/react"
import { AGENT_CATALOG, TOOLS_CATALOG, DEFAULT_ENABLED_TOOLS } from "../_catalog"
import { ProGate } from "@/components/ui/pro-gate"

type Tab = "configuration" | "capacites"

const CREATIVITY_OPTIONS = [
  { value: "0.1", label: "Précis" },
  { value: "0.3", label: "Stable" },
  { value: "0.5", label: "Équilibré (recommandé)" },
  { value: "0.8", label: "Créatif" },
  { value: "1.0", label: "Très créatif" },
]

const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
]

function AgentDetailPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params)
  const router = useRouter()

  const fallbackPresentation = useMemo(() => AGENT_CATALOG.find((a) => a.id === agentId), [agentId])

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("configuration")
  const [isSaving, setIsSaving] = useState(false)
  const [isTogglingActive, setIsTogglingActive] = useState(false)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null)

  const [agentName, setAgentName] = useState("")
  const [instructions, setInstructions] = useState("")
  const [model, setModel] = useState("gpt-4o-mini")
  const [creativity, setCreativity] = useState("0.5")
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set(DEFAULT_ENABLED_TOOLS))
  const [vectorStoreIds, setVectorStoreIds] = useState("")
  const [vectorStores, setVectorStores] = useState<Array<{ id: string; name: string }>>([])
  const [whatsappDocsCount, setWhatsappDocsCount] = useState<number>(0)

  const presentation = useMemo(
    () => AGENT_CATALOG.find((a) => a.id === agent?.slug || a.label === agent?.name) || fallbackPresentation,
    [agent?.slug, agent?.name, fallbackPresentation]
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      try {
        const [resolvedAgent, resolvedActiveAgent] = await Promise.all([
          agentsService.getAgentByIdOrSlug(agentId),
          agentsService.getActiveAgent().catch(() => null),
        ])
        if (!active) return

        setAgent(resolvedAgent)
        setActiveAgent(resolvedActiveAgent)
        setAgentName(resolvedAgent.name)
        setInstructions(resolvedAgent.ai_instructions || fallbackPresentation?.defaultInstructions || resolvedAgent.description || "")
        setModel(resolvedAgent.ai_model || "gpt-4o-mini")
        setCreativity(resolvedAgent.ai_temperature || "0.5")
        setVectorStoreIds(resolvedAgent.ai_vector_store_ids.join(","))
        setEnabledTools(new Set(resolvedAgent.ai_tools.length ? resolvedAgent.ai_tools : DEFAULT_ENABLED_TOOLS))

        const [toolsResult, vsResult, docsResult] = await Promise.allSettled([
          agentsService.getTools(resolvedAgent.id),
          aiToolsService.listVectorStores(),
          agentsService.listDocuments(resolvedAgent.id),
        ])

        if (!active) return

        if (toolsResult.status === "fulfilled") {
          setEnabledTools(new Set(toolsResult.value.length ? toolsResult.value : DEFAULT_ENABLED_TOOLS))
        }
        if (vsResult.status === "fulfilled") {
          const stores = (vsResult.value.vector_stores || []).map((vs) => ({
            id: (vs.vector_store_id || vs.id || "") as string,
            name: (vs.name || (vs.vector_store_id || vs.id || "")) as string,
          }))
          setVectorStores(stores)
        }
        if (docsResult.status === "fulfilled") setWhatsappDocsCount(docsResult.value.documents?.length ?? 0)
      } catch (error) {
        toast.error(handleApiError(error).message)
        router.replace("/agents")
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [agentId, fallbackPresentation?.defaultInstructions, router])

  const handleSaveSettings = async () => {
    if (!agent) return
    setIsSaving(true)
    try {
      const optionalTools = Array.from(enabledTools).filter(
        (code) => !TOOLS_CATALOG.find((tool) => tool.code === code && tool.required)
      )
      const nextTools = [
        ...TOOLS_CATALOG.filter((tool) => tool.required).map((tool) => tool.code),
        ...optionalTools,
      ]
      const nextVectorStoreIds = vectorStoreIds.split(",").map((id) => id.trim()).filter(Boolean)
      const updatedAgent = await agentsService.updateAgent(agent.id, {
        name: agentName,
        ai_instructions: instructions,
        ai_model: model,
        ai_temperature: creativity,
        ai_vector_store_ids: nextVectorStoreIds,
      })
      const updatedTools = await agentsService.updateTools(agent.id, nextTools)
      setAgent({ ...updatedAgent, ai_tools: updatedTools, ai_vector_store_ids: nextVectorStoreIds })
      setEnabledTools(new Set(updatedTools))
      setVectorStoreIds(nextVectorStoreIds.join(","))
      toast.success("Réglages enregistrés")
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleActiveChange = async (nextActive: boolean) => {
    if (!agent) return
    setIsTogglingActive(true)
    try {
      if (nextActive) {
        const nextActiveAgent = await agentsService.activateAgent(agent.id)
        setActiveAgent(nextActiveAgent)
        toast.success("Agent activé")
      } else {
        await agentsService.deactivateActiveAgent()
        setActiveAgent(null)
        toast.success("Agent désactivé")
      }
    } catch (error) {
      toast.error(handleApiError(error).message)
    } finally {
      setIsTogglingActive(false)
    }
  }

  const toggleTool = (code: string) => {
    setEnabledTools((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const activeToolCount =
    TOOLS_CATALOG.filter((t) => t.required).length +
    Array.from(enabledTools).filter(
      (code) => !TOOLS_CATALOG.find((t) => t.code === code && t.required)
    ).length
  const isCurrentAgentActive = activeAgent?.id === agent?.id
  const activationLabel = isCurrentAgentActive ? "Désactiver l'agent" : "Activer l'agent"

  if (!agent && !isLoading) return null

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1080px] space-y-8 px-2 xl:px-6">
        <Skeleton className="h-5 w-72 bg-white/10" />
        <div className="grid gap-7 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Skeleton className="h-[520px] rounded-[18px] bg-white/10" />
          <div className="space-y-6">
            <Skeleton className="h-20 rounded-[18px] bg-white/10" />
            <Skeleton className="h-[560px] rounded-[18px] bg-white/10" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1080px] space-y-8 px-2 xl:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-3 text-sm font-normal text-muted-foreground">
        <Link href="/agents" className="transition-colors hover:text-foreground">
          Agents IA
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="font-medium text-foreground">{agent?.name || presentation?.label || agentId}</span>
      </nav>

      {/* Two-panel layout */}
      <div className="grid gap-7 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">

        {/* ── Left sidebar ── */}
        <aside className="flex w-full flex-col gap-7 rounded-2xl border border-border/60 bg-card p-7 xl:sticky xl:top-4 xl:min-h-[520px]">
          {/* Agent identity */}
          <div>
            <div className="mb-7 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-3xl ring-1 ring-white/10">
                {presentation?.emoji || "🤖"}
              </div>
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${presentation?.categoryClass || "text-sky-400"}`}>
                  {presentation?.category || agent?.channel || "whatsapp"}
                </p>
                <p className="text-[22px] font-semibold leading-tight text-foreground">{agent?.name || presentation?.label}</p>
              </div>
            </div>

            {/* Toggle */}
            <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 transition-colors ${
              isCurrentAgentActive
                ? "border-emerald-500/25 bg-emerald-500/10"
                : "border-transparent bg-muted"
            }`}>
              <span className={`h-2.5 w-2.5 rounded-full ${isCurrentAgentActive ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" : "bg-muted-foreground/40"}`} />
              <span className="flex-1 text-sm font-medium text-foreground">
                {isCurrentAgentActive ? "Actif" : "Inactif"}
              </span>
              <Switch
                checked={isCurrentAgentActive}
                onCheckedChange={handleActiveChange}
                disabled={isTogglingActive}
                className="h-6 w-11 data-[state=checked]:bg-primary data-[state=unchecked]:bg-border [&>span]:h-5 [&>span]:w-5 [&>span]:bg-white [&>span]:data-[state=checked]:translate-x-5"
              />
            </div>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {agent?.description || presentation?.description}
          </p>

          {/* Meta */}
          <div className="space-y-4 border-y border-border/60 py-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Modèle</span>
              <span className="text-sm font-semibold text-foreground">{model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Capacités actives</span>
              <span className="text-sm font-semibold text-foreground">
                {activeToolCount} / {presentation?.totalTools || TOOLS_CATALOG.length}
              </span>
            </div>
          </div>

          {/* Save button */}
          <Button
            onClick={() => handleActiveChange(!isCurrentAgentActive)}
            disabled={isTogglingActive}
            size="lg"
            className="mt-auto w-full"
            variant={isCurrentAgentActive ? "outline" : "default"}
          >
            {isTogglingActive && <Spinner className="h-4 w-4 animate-spin" weight="bold" />}
            {activationLabel}
          </Button>
        </aside>

        {/* ── Right content ── */}
        <div className="min-w-0 space-y-6">
          {/* Tabs */}
          <div className="grid overflow-hidden rounded-2xl border border-border/60 bg-card p-1 sm:grid-cols-2">
            {(["configuration", "capacites"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`h-10 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-10px_rgba(224,209,18,0.6)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab === "configuration" ? "Configuration" : "Capacités"}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">

          {/* Configuration tab */}
          {activeTab === "configuration" && (
            <div>
              <div className="border-b border-border/60 px-8 py-7">
                <h2 className="text-base font-semibold text-foreground">Configuration</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Personnalisez le comportement de cet agent.
                </p>
              </div>

              <div className="space-y-8 px-8 py-8">
                {/* Nom */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">
                    Nom de l&apos;agent
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-[#1a1a1a] px-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Instructions */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">
                    Instructions
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Décrivez comment l&apos;agent doit se comporter et quand passer la main à votre équipe.
                  </p>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={9}
                    className="min-h-[220px] w-full resize-y rounded-xl border border-border bg-[#1a1a1a] px-4 py-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Bottom row: Model + Creativity */}
                <div className="grid gap-6 border-b border-border/60 pb-8 lg:grid-cols-2 lg:items-start">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Modèle IA</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="h-12 w-full rounded-xl border border-border bg-[#1a1a1a] px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {MODEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Créativité</label>
                    <select
                      value={creativity}
                      onChange={(e) => setCreativity(e.target.value)}
                      className="h-12 w-full rounded-xl border border-border bg-[#1a1a1a] px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {CREATIVITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end px-8 pb-8">
                <Button
                  variant="outline"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  {isSaving && <Spinner className="h-4 w-4 animate-spin" weight="bold" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

          {/* Capacités tab */}
          {activeTab === "capacites" && (
            <div>
              <div className="flex items-start justify-between gap-4 border-b border-border/60 px-8 py-7">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Capacités</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Activez les outils disponibles pour cet agent.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                  {activeToolCount} / {presentation?.totalTools || TOOLS_CATALOG.length}
                </span>
              </div>

              <div className="divide-y divide-border/40 px-8 py-4">
                {TOOLS_CATALOG.map((tool) => {
                  const isRequired = Boolean(tool.required)
                  const isEnabled = isRequired || enabledTools.has(tool.code)
                  const isFileSearch = tool.code === "file_search"
                  const isWhatsappDoc = tool.code === "send_document"
                  const isPdfQuote = tool.code === "generate_pdf_quote"
                  const connectedVsId = vectorStoreIds.split(",").filter(Boolean)[0]
                  const connectedVs = vectorStores.find((vs) => vs.id === connectedVsId)
                  const toolConfigHref = isFileSearch
                    ? `/agents/${agentId}/connaissances`
                    : isWhatsappDoc
                      ? `/agents/${agentId}/documents`
                      : isPdfQuote
                        ? `/agents/${agentId}/devis`
                        : null

                  const handleToggle = () => {
                    if (isRequired) return
                    if (!isEnabled) {
                      if (isFileSearch && (!connectedVsId || !connectedVs)) {
                        router.push(`/agents/${agentId}/connaissances`)
                        return
                      }
                      if (isWhatsappDoc && whatsappDocsCount === 0) {
                        router.push(`/agents/${agentId}/documents`)
                        return
                      }
                    }
                    toggleTool(tool.code)
                  }

                  return (
                    <div key={tool.code} className="flex items-start gap-5 py-5">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{tool.label}</span>
                          {tool.obligatoire && (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                              Obligatoire
                            </span>
                          )}
                        </div>
                        <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">
                          {tool.description}
                        </p>
                        {isFileSearch && isEnabled && connectedVs && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <Link
                              href={`/agents/${agentId}/connaissances`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {connectedVs.id.slice(0, 18)}…
                              <Pencil className="h-3 w-3" weight="regular" />
                            </Link>
                          </div>
                        )}
                        {isWhatsappDoc && isEnabled && whatsappDocsCount > 0 && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <Link
                              href={`/agents/${agentId}/documents`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {whatsappDocsCount} document{whatsappDocsCount !== 1 ? "s" : ""} configuré{whatsappDocsCount !== 1 ? "s" : ""}
                              <Pencil className="h-3 w-3" weight="regular" />
                            </Link>
                          </div>
                        )}
                        {isPdfQuote && isEnabled && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <Link
                              href={`/agents/${agentId}/devis`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                            >
                              Configurer le template
                              <Pencil className="h-3 w-3" weight="regular" />
                            </Link>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {toolConfigHref && (
                          <Link
                            href={toolConfigHref}
                            aria-label={`Configurer ${tool.label}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/50 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" weight="regular" />
                          </Link>
                        )}
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={handleToggle}
                          disabled={isRequired}
                          className={`h-6 w-11 data-[state=checked]:bg-primary data-[state=unchecked]:bg-border [&>span]:h-5 [&>span]:w-5 [&>span]:bg-white [&>span]:data-[state=checked]:translate-x-5 ${isRequired ? "opacity-40" : ""}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-end border-t border-border/60 px-8 pb-8 pt-4">
                <Button
                  variant="outline"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  {isSaving && <Spinner className="h-4 w-4 animate-spin" weight="bold" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

</div>
        </div>
      </div>
    </div>
  )
}

export default function AgentDetailPage({ params }: { params: Promise<{ agentId: string }> }) {
  return <ProGate feature="Agents IA"><AgentDetailPageContent params={params} /></ProGate>
}
