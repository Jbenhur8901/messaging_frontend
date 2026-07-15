"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { segmentsService, tagsService, customFieldsService, handleApiError } from "@/services"
import type { SegmentCriteria, RuleGroup, SegmentRule, GroupOperator } from "@/services/segments"
import type { Tag, CustomField } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Users,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ── Helpers ─────────────────────────────────────────────────────────────────

const SUPPORTED_FIELDS = [
  { value: "is_active", label: "Actif", type: "boolean" },
  { value: "is_blocked", label: "Bloqué", type: "boolean" },
  { value: "source", label: "Source", type: "text" },
  { value: "created_at", label: "Date de création", type: "date" },
  { value: "last_message_at", label: "Dernier message", type: "date" },
  { value: "messages_delivered", label: "Messages délivrés", type: "number" },
  { value: "messages_sent", label: "Messages envoyés", type: "number" },
]

const TEXT_OPS = [
  { value: "eq", label: "est" },
  { value: "neq", label: "n'est pas" },
  { value: "in", label: "est parmi" },
]

const NUMBER_OPS = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "between", label: "entre" },
]

const DATE_OPS = [
  { value: "gte", label: "après le" },
  { value: "lte", label: "avant le" },
  { value: "between", label: "entre" },
]

const BOOLEAN_OPS = [{ value: "eq", label: "est" }]

const CUSTOM_OPS = [
  { value: "eq", label: "est" },
  { value: "neq", label: "n'est pas" },
  { value: "contains", label: "contient" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
]

function getOpsForField(fieldMeta: (typeof SUPPORTED_FIELDS)[number] | undefined) {
  if (!fieldMeta) return TEXT_OPS
  if (fieldMeta.type === "boolean") return BOOLEAN_OPS
  if (fieldMeta.type === "number") return NUMBER_OPS
  if (fieldMeta.type === "date") return DATE_OPS
  return TEXT_OPS
}

function emptyGroup(): RuleGroup {
  return { operator: "and", rules: [] }
}

function emptyFieldRule(): SegmentRule {
  return { type: "field", field: "is_active", op: "eq", value: "true" }
}

// ── RuleRow ──────────────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: SegmentRule
  tags: Tag[]
  customFields: CustomField[]
  onChange: (r: SegmentRule) => void
  onRemove: () => void
}

function RuleRow({ rule, tags, customFields, onChange, onRemove }: RuleRowProps) {
  const fieldMeta = rule.type === "field" ? SUPPORTED_FIELDS.find((f) => f.value === (rule as { field: string }).field) : undefined

  function setType(type: string) {
    if (type === "tag_include") onChange({ type: "tag_include", tag_id: tags[0]?.id ?? "" })
    else if (type === "tag_exclude") onChange({ type: "tag_exclude", tag_id: tags[0]?.id ?? "" })
    else if (type === "field") onChange({ type: "field", field: "is_active", op: "eq", value: "true" })
    else onChange({ type: "custom_field", custom_field_key: customFields[0]?.field_key ?? "", op: "eq", value: "" })
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/40">
      {/* Rule type */}
      <Select value={rule.type} onValueChange={setType}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tag_include">Tag inclus</SelectItem>
          <SelectItem value="tag_exclude">Tag exclu</SelectItem>
          <SelectItem value="field">Champ</SelectItem>
          <SelectItem value="custom_field">Champ perso</SelectItem>
        </SelectContent>
      </Select>

      {/* Tag picker */}
      {(rule.type === "tag_include" || rule.type === "tag_exclude") && (
        <Select
          value={rule.tag_id}
          onValueChange={(v) => onChange({ ...rule, tag_id: v })}
        >
          <SelectTrigger className="flex-1 h-8 text-xs">
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

      {/* Field rule */}
      {rule.type === "field" && (
        <>
          <Select
            value={rule.field}
            onValueChange={(v) => {
              const meta = SUPPORTED_FIELDS.find((f) => f.value === v)
              const defaultOp = getOpsForField(meta)[0].value as typeof rule.op
              const defaultVal = meta?.type === "boolean" ? "true" : meta?.type === "number" ? 0 : ""
              onChange({ ...rule, field: v, op: defaultOp, value: defaultVal as string | number | boolean | string[] | number[] })
            }}
          >
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={rule.op}
            onValueChange={(v) => onChange({ ...rule, op: v as typeof rule.op })}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getOpsForField(fieldMeta).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldValueInput rule={rule} fieldMeta={fieldMeta} onChange={onChange} />
        </>
      )}

      {/* Custom field rule */}
      {rule.type === "custom_field" && (
        <>
          <Select
            value={rule.custom_field_key}
            onValueChange={(v) => onChange({ ...rule, custom_field_key: v })}
          >
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Champ…" />
            </SelectTrigger>
            <SelectContent>
              {customFields.map((cf) => (
                <SelectItem key={cf.field_key} value={cf.field_key}>{cf.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={rule.op}
            onValueChange={(v) => onChange({ ...rule, op: v as typeof rule.op })}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_OPS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="flex-1 h-8 text-xs"
            placeholder="Valeur…"
            value={String(rule.value ?? "")}
            onChange={(e) => onChange({ ...rule, value: e.target.value })}
          />
        </>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="size-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

function FieldValueInput({
  rule,
  fieldMeta,
  onChange,
}: {
  rule: Extract<SegmentRule, { type: "field" }>
  fieldMeta: (typeof SUPPORTED_FIELDS)[number] | undefined
  onChange: (r: SegmentRule) => void
}) {
  if (fieldMeta?.type === "boolean") {
    return (
      <Select
        value={String(rule.value)}
        onValueChange={(v) => onChange({ ...rule, value: v })}
      >
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Oui</SelectItem>
          <SelectItem value="false">Non</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (rule.op === "between") {
    const vals = Array.isArray(rule.value) ? rule.value as string[] : ["", ""]
    return (
      <div className="flex items-center gap-1 flex-1">
        <Input
          className="h-8 text-xs"
          type={fieldMeta?.type === "number" ? "number" : "date"}
          value={vals[0] ?? ""}
          onChange={(e) => onChange({ ...rule, value: [e.target.value, vals[1] ?? ""] })}
        />
        <span className="text-xs text-muted-foreground">et</span>
        <Input
          className="h-8 text-xs"
          type={fieldMeta?.type === "number" ? "number" : "date"}
          value={vals[1] ?? ""}
          onChange={(e) => onChange({ ...rule, value: [vals[0] ?? "", e.target.value] })}
        />
      </div>
    )
  }

  return (
    <Input
      className="flex-1 h-8 text-xs"
      type={fieldMeta?.type === "number" ? "number" : fieldMeta?.type === "date" ? "date" : "text"}
      placeholder="Valeur…"
      value={String(rule.value ?? "")}
      onChange={(e) => {
        const v = fieldMeta?.type === "number" ? Number(e.target.value) : e.target.value
        onChange({ ...rule, value: v })
      }}
    />
  )
}

// ── GroupCard ─────────────────────────────────────────────────────────────────

interface GroupCardProps {
  group: RuleGroup
  index: number
  tags: Tag[]
  customFields: CustomField[]
  onChange: (g: RuleGroup) => void
  onRemove: () => void
  showOperatorLabel: boolean
  topOp: GroupOperator
}

function GroupCard({ group, index, tags, customFields, onChange, onRemove, showOperatorLabel, topOp }: GroupCardProps) {
  function updateRule(i: number, rule: SegmentRule) {
    const rules = [...group.rules]
    rules[i] = rule
    onChange({ ...group, rules })
  }

  function removeRule(i: number) {
    onChange({ ...group, rules: group.rules.filter((_, j) => j !== i) })
  }

  function addRule() {
    onChange({ ...group, rules: [...group.rules, emptyFieldRule()] })
  }

  return (
    <div className="relative">
      {showOperatorLabel && (
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px flex-1 bg-border/40" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
            {topOp === "and" ? "ET" : "OU"}
          </span>
          <div className="h-px flex-1 bg-border/40" />
        </div>
      )}
      <div className="border border-border/60 rounded-2xl bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Groupe {index + 1}</span>
            <div className="flex rounded-lg overflow-hidden border border-border/60">
              {(["and", "or"] as GroupOperator[]).map((op) => (
                <button
                  key={op}
                  className={`px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    group.operator === op
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => onChange({ ...group, operator: op })}
                >
                  {op === "and" ? "ET" : "OU"}
                </button>
              ))}
            </div>
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

        {group.rules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Aucune règle — ce groupe inclut tous les contacts actifs.</p>
        ) : (
          <div className="space-y-2">
            {group.rules.map((rule, i) => (
              <RuleRow
                key={i}
                rule={rule}
                tags={tags}
                customFields={customFields}
                onChange={(r) => updateRule(i, r)}
                onRemove={() => removeRule(i)}
              />
            ))}
          </div>
        )}

        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={addRule}>
          <Plus className="size-3" />
          Ajouter une règle
        </Button>
      </div>
    </div>
  )
}

// ── LivePreview ───────────────────────────────────────────────────────────────

interface LivePreviewProps {
  criteria: SegmentCriteria
}

function LivePreview({ criteria }: LivePreviewProps) {
  const [count, setCount] = useState<number | null>(null)
  const [sample, setSample] = useState<{ id: string; first_name?: string; last_name?: string; phone_number: string }[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await segmentsService.previewCount(criteria)
        if (res.ok) {
          setCount(res.count)
          setSample(res.sample_contacts)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }, 600)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [criteria])

  return (
    <div className="border border-border/60 rounded-2xl bg-card p-5 sticky top-6 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Users className="size-4 text-primary" />
        Aperçu
      </h3>

      <div className="text-center py-4">
        {loading ? (
          <Skeleton className="h-10 w-24 mx-auto rounded-xl" />
        ) : count != null ? (
          <p className="text-4xl font-bold tabular-nums">{count.toLocaleString()}</p>
        ) : (
          <p className="text-4xl font-bold text-muted-foreground">—</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">contacts correspondants</p>
      </div>

      {sample.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Exemples</p>
          {sample.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/40">
              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-[10px]">
                {(c.first_name?.[0] ?? c.phone_number[0]).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.phone_number}
                </p>
                {(c.first_name || c.last_name) && (
                  <p className="truncate text-muted-foreground">{c.phone_number}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && count === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Aucun contact ne correspond à ces critères.
        </p>
      )}
    </div>
  )
}

// ── SegmentEditor ─────────────────────────────────────────────────────────────

export interface SegmentEditorProps {
  initial?: {
    name: string
    description: string
    criteria: SegmentCriteria
  }
  onSave: (name: string, description: string, criteria: SegmentCriteria) => Promise<void>
}

export function SegmentEditor({ initial, onSave }: SegmentEditorProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [criteria, setCriteria] = useState<SegmentCriteria>(
    initial?.criteria ?? { operator: "and", groups: [] }
  )
  const [saving, setSaving] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  useEffect(() => {
    Promise.all([tagsService.getTags(), customFieldsService.getCustomFields()])
      .then(([tagsRes, cfRes]) => {
        setTags(tagsRes.tags)
        setCustomFields((cfRes as { custom_fields: CustomField[] }).custom_fields ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingMeta(false))
  }, [])

  function updateGroup(i: number, g: RuleGroup) {
    const groups = [...criteria.groups]
    groups[i] = g
    setCriteria({ ...criteria, groups })
  }

  function removeGroup(i: number) {
    setCriteria({ ...criteria, groups: criteria.groups.filter((_, j) => j !== i) })
  }

  function addGroup() {
    setCriteria({ ...criteria, groups: [...criteria.groups, emptyGroup()] })
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Nom requis"); return }
    setSaving(true)
    try {
      await onSave(name.trim(), description, criteria)
    } catch {
      // error toast handled by caller
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link href="/contacts/segments">
            <ArrowLeft className="size-4" />
            Segments
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">{initial ? "Modifier le segment" : "Nouveau segment"}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Left: builder */}
        <div className="space-y-6">
          {/* Name + description */}
          <div className="border border-border/60 rounded-2xl bg-card p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="seg-name">Nom du segment</Label>
              <Input
                id="seg-name"
                placeholder="Ex: Clients actifs Brazzaville"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seg-desc">Description <span className="text-muted-foreground">(optionnel)</span></Label>
              <Input
                id="seg-desc"
                placeholder="Description courte…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Top-level operator */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Combiner les groupes avec</span>
            <div className="flex rounded-lg overflow-hidden border border-border/60">
              {(["and", "or"] as GroupOperator[]).map((op) => (
                <button
                  key={op}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    criteria.operator === op
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setCriteria({ ...criteria, operator: op })}
                >
                  {op === "and" ? "ET (tous)" : "OU (n'importe lequel)"}
                </button>
              ))}
            </div>
          </div>

          {/* Groups */}
          {loadingMeta ? (
            <div className="space-y-3">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-3">
              {criteria.groups.length === 0 && (
                <div className="border border-dashed border-border/60 rounded-2xl p-8 text-center text-sm text-muted-foreground">
                  Aucun groupe — le segment inclura tous les contacts actifs.
                  <br />
                  Ajoutez un groupe pour filtrer.
                </div>
              )}
              {criteria.groups.map((g, i) => (
                <GroupCard
                  key={i}
                  group={g}
                  index={i}
                  tags={tags}
                  customFields={customFields}
                  onChange={(g2) => updateGroup(i, g2)}
                  onRemove={() => removeGroup(i)}
                  showOperatorLabel={i > 0}
                  topOp={criteria.operator}
                />
              ))}
              <Button variant="outline" className="w-full gap-2" onClick={addGroup}>
                <Plus className="size-4" />
                Ajouter un groupe de règles
              </Button>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/contacts/segments">Annuler</Link>
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>

        {/* Right: live preview */}
        <div>
          <LivePreview criteria={criteria} />
        </div>
      </div>
    </div>
  )
}
