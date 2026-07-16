"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { tagsService, segmentsService, handleApiError } from "@/services"
import type { TriggerType, AutomationStep, StepType } from "@/services/automations"
import type { Tag } from "@/types"
import type { Segment } from "@/services/segments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  Tag as TagIcon,
  Clock,
  Calendar,
  MessageSquare,
  Timer,
  CheckCircle2,
} from "lucide-react"

// ── Step helpers ──────────────────────────────────────────────────────────────

const STEP_TYPES: { value: StepType; label: string; description: string }[] = [
  { value: "wait", label: "Attendre", description: "Pause avant l'étape suivante" },
  { value: "send_message", label: "Envoyer un message", description: "Envoyer un template WhatsApp" },
  { value: "add_tag", label: "Ajouter un tag", description: "Appliquer un tag au contact" },
  { value: "remove_tag", label: "Retirer un tag", description: "Supprimer un tag du contact" },
  { value: "end", label: "Fin", description: "Terminer la séquence" },
]

function defaultConfig(type: StepType): Record<string, unknown> {
  if (type === "wait") return { delay_value: 24, delay_unit: "hours" }
  if (type === "send_message") return { template_name: "", language_code: "fr", components: [] }
  if (type === "add_tag" || type === "remove_tag") return { tag_id: "" }
  return {}
}

// ── StepCard ──────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: AutomationStep
  index: number
  tags: Tag[]
  onChange: (s: AutomationStep) => void
  onRemove: () => void
}

function StepCard({ step, index, tags, onChange, onRemove }: StepCardProps) {
  const meta = STEP_TYPES.find((t) => t.value === step.step_type)!
  const cfg = step.step_config

  function setType(type: StepType) {
    onChange({ step_type: type, step_config: defaultConfig(type) })
  }

  return (
    <div className="border border-border/60 rounded-2xl bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm font-medium">{meta.label}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="size-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <Select value={step.step_type} onValueChange={(v) => setType(v as StepType)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STEP_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {step.step_type === "wait" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="h-8 text-xs w-20"
            min={1}
            value={String(cfg.delay_value ?? 24)}
            onChange={(e) => onChange({ ...step, step_config: { ...cfg, delay_value: Number(e.target.value) } })}
          />
          <Select
            value={String(cfg.delay_unit ?? "hours")}
            onValueChange={(v) => onChange({ ...step, step_config: { ...cfg, delay_unit: v } })}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">Heure(s)</SelectItem>
              <SelectItem value="days">Jour(s)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {step.step_type === "send_message" && (
        <div className="space-y-2">
          <Input
            className="h-8 text-xs"
            placeholder="Nom du template WhatsApp…"
            value={String(cfg.template_name ?? "")}
            onChange={(e) => onChange({ ...step, step_config: { ...cfg, template_name: e.target.value } })}
          />
          <Select
            value={String(cfg.language_code ?? "fr")}
            onValueChange={(v) => onChange({ ...step, step_config: { ...cfg, language_code: v } })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">Anglais</SelectItem>
              <SelectItem value="pt">Portugais</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(step.step_type === "add_tag" || step.step_type === "remove_tag") && (
        <Select
          value={String(cfg.tag_id ?? "")}
          onValueChange={(v) => onChange({ ...step, step_config: { ...cfg, tag_id: v } })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Choisir un tag…" />
          </SelectTrigger>
          <SelectContent>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {step.step_type === "end" && (
        <p className="text-xs text-muted-foreground">La séquence se termine ici.</p>
      )}
    </div>
  )
}

// ── AutomationEditor ──────────────────────────────────────────────────────────

export interface AutomationEditorProps {
  initial?: {
    name: string
    description: string
    trigger_type: TriggerType
    trigger_config: Record<string, unknown>
    steps: AutomationStep[]
    segment_id?: string
    allow_reentry: boolean
    reentry_days?: number
  }
  onSave: (payload: {
    name: string
    description: string
    trigger_type: TriggerType
    trigger_config: Record<string, unknown>
    steps: AutomationStep[]
    segment_id?: string
    allow_reentry: boolean
    reentry_days?: number
  }) => Promise<void>
}

const STEPS = ["Configuration", "Déclencheur", "Étapes", "Révision"]

export function AutomationEditor({ initial, onSave }: AutomationEditorProps) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [triggerType, setTriggerType] = useState<TriggerType>(initial?.trigger_type ?? "tag_added")
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(initial?.trigger_config ?? {})
  const [steps, setSteps] = useState<AutomationStep[]>(initial?.steps ?? [])
  const [segmentId, setSegmentId] = useState<string>(initial?.segment_id ?? "")
  const [allowReentry, setAllowReentry] = useState(initial?.allow_reentry ?? false)
  const [reentryDays, setReentryDays] = useState<number>(initial?.reentry_days ?? 30)

  // Metadata
  const [tags, setTags] = useState<Tag[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  useEffect(() => {
    Promise.all([tagsService.getTags(), segmentsService.listSegments({ limit: 100 })])
      .then(([tagsRes, segsRes]) => {
        setTags(tagsRes.tags)
        setSegments(segsRes.segments)
      })
      .catch(() => {})
      .finally(() => setLoadingMeta(false))
  }, [])

  function addStep() {
    setSteps((prev) => [...prev, { step_type: "wait", step_config: defaultConfig("wait") }])
  }

  function updateStep(i: number, s: AutomationStep) {
    setSteps((prev) => prev.map((x, j) => (j === i ? s : x)))
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, j) => j !== i))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        name,
        description,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        steps,
        segment_id: segmentId || undefined,
        allow_reentry: allowReentry,
        reentry_days: allowReentry ? reentryDays : undefined,
      })
    } catch {
      // error toast handled by caller
    } finally {
      setSaving(false)
    }
  }

  const canProceed = [
    () => !!name.trim(),
    () => {
      if (triggerType === "tag_added") return !!triggerConfig.tag_id
      if (triggerType === "no_reply") return Number(triggerConfig.days_since_last_message ?? 0) > 0
      if (triggerType === "scheduled") return !!triggerConfig.cron
      return false
    },
    () => true,
    () => true,
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link href="/automations">
            <ArrowLeft className="size-4" />
            Automations
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">{initial ? "Modifier l'automation" : "Nouvelle automation"}</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <button
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                i === step ? "text-primary" : i < step ? "text-primary/60" : "text-muted-foreground"
              }`}
              onClick={() => i < step && setStep(i)}
            >
              <span className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle2 className="size-3.5" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 transition-colors ${i < step ? "bg-primary/40" : "bg-border/40"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="space-y-4 min-h-64">
        {step === 0 && (
          <div className="border border-border/60 rounded-2xl bg-card p-5 space-y-4">
            <h2 className="font-semibold">Configuration générale</h2>
            <div className="space-y-1.5">
              <Label htmlFor="auto-name">Nom</Label>
              <Input id="auto-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Réactivation J+3" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auto-desc">Description <span className="text-muted-foreground">(optionnel)</span></Label>
              <Input id="auto-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description courte…" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/60">
              <div>
                <p className="text-sm font-medium">Réinscription autorisée</p>
                <p className="text-xs text-muted-foreground">Permettre à un contact de repasser dans cette séquence</p>
              </div>
              <Switch checked={allowReentry} onCheckedChange={setAllowReentry} />
            </div>
            {allowReentry && (
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-sm">Délai minimum entre réinscriptions</Label>
                <Input
                  type="number"
                  className="w-20 h-8 text-xs"
                  min={1}
                  value={reentryDays}
                  onChange={(e) => setReentryDays(Number(e.target.value))}
                />
                <span className="text-sm text-muted-foreground">jours</span>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Déclencheur</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { value: "tag_added" as TriggerType, label: "Tag ajouté", icon: TagIcon, desc: "Quand un tag est appliqué à un contact" },
                { value: "no_reply" as TriggerType, label: "Sans réponse", icon: Clock, desc: "Contacts sans message depuis N jours" },
                { value: "scheduled" as TriggerType, label: "Planifié", icon: Calendar, desc: "Selon un calendrier cron" },
              ]).map((opt) => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTriggerType(opt.value)
                      if (opt.value === "no_reply") setTriggerConfig({ days_since_last_message: 3 })
                      else setTriggerConfig({})
                    }}
                    className={`p-4 rounded-2xl border text-left transition-colors ${
                      triggerType === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:border-border bg-card"
                    }`}
                  >
                    <Icon className={`size-5 mb-2 ${triggerType === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                  </button>
                )
              })}
            </div>

            <div className="border border-border/60 rounded-2xl bg-card p-4 space-y-3">
              {loadingMeta ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : (
                <>
                  {triggerType === "tag_added" && (
                    <div className="space-y-1.5">
                      <Label>Tag déclencheur</Label>
                      <Select
                        value={String(triggerConfig.tag_id ?? "")}
                        onValueChange={(v) => setTriggerConfig({ tag_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un tag…" />
                        </SelectTrigger>
                        <SelectContent>
                          {tags.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <span className="flex items-center gap-2">
                                <span className="size-2 rounded-full" style={{ background: t.color }} />
                                {t.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {triggerType === "no_reply" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="shrink-0">Jours sans réponse</Label>
                        <Input
                          type="number"
                          className="w-20 h-8 text-xs"
                          min={1}
                          value={String(triggerConfig.days_since_last_message ?? 3)}
                          onChange={(e) => setTriggerConfig((c) => ({ ...c, days_since_last_message: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Segment <span className="text-muted-foreground">(optionnel)</span></Label>
                        <Select
                          value={segmentId || "__all__"}
                          onValueChange={(v) => setSegmentId(v === "__all__" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Tous les contacts actifs</SelectItem>
                            {segments.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {triggerType === "scheduled" && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Expression cron</Label>
                        <Input
                          placeholder="0 9 * * 1  (lundi à 9h)"
                          value={String(triggerConfig.cron ?? "")}
                          onChange={(e) => setTriggerConfig((c) => ({ ...c, cron: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Format: minute heure jour-du-mois mois jour-de-semaine</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Segment</Label>
                        <Select
                          value={segmentId || "__all__"}
                          onValueChange={(v) => setSegmentId(v === "__all__" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Tous les contacts actifs</SelectItem>
                            {segments.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Étapes de la séquence</h2>
            {steps.length === 0 && (
              <div className="border border-dashed border-border/60 rounded-2xl p-8 text-center text-sm text-muted-foreground">
                Aucune étape. Ajoutez des actions à exécuter dans l'ordre.
              </div>
            )}
            {steps.map((s, i) => (
              <StepCard
                key={i}
                step={s}
                index={i}
                tags={tags}
                onChange={(s2) => updateStep(i, s2)}
                onRemove={() => removeStep(i)}
              />
            ))}
            <Button variant="outline" className="w-full gap-2" onClick={addStep}>
              <Plus className="size-4" />
              Ajouter une étape
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="border border-border/60 rounded-2xl bg-card p-5 space-y-4">
            <h2 className="font-semibold">Révision</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Nom</p>
                <p className="font-medium">{name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Déclencheur</p>
                <p className="font-medium capitalize">{triggerType.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Étapes</p>
                <p className="font-medium">{steps.length} étape{steps.length !== 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Réinscription</p>
                <p className="font-medium">{allowReentry ? `Oui (${reentryDays}j)` : "Non"}</p>
              </div>
              {description && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p>{description}</p>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-border/40">
              <h3 className="text-sm font-medium mb-2">Séquence</h3>
              <div className="space-y-1.5">
                {steps.map((s, i) => {
                  const meta = STEP_TYPES.find((t) => t.value === s.step_type)!
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="size-5 rounded-full bg-muted text-muted-foreground font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="font-medium">{meta.label}</span>
                      {s.step_type === "wait" && (
                        <span className="text-muted-foreground">({String(s.step_config.delay_value)} {String(s.step_config.delay_unit)})</span>
                      )}
                      {s.step_type === "send_message" && (
                        <span className="text-muted-foreground">({String(s.step_config.template_name || "—")})</span>
                      )}
                    </div>
                  )
                })}
                {steps.length === 0 && <p className="text-xs text-muted-foreground">Aucune étape définie.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/40">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? null : setStep(step - 1))}
          disabled={step === 0}
          asChild={step === 0}
        >
          {step === 0 ? (
            <Link href="/automations"><ArrowLeft className="size-4 mr-2" />Annuler</Link>
          ) : (
            <><ArrowLeft className="size-4 mr-2" />Précédent</>
          )}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed[step]?.()}
          >
            Suivant <ArrowRight className="size-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        )}
      </div>
    </div>
  )
}
