"use client"

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { scenariosService, handleApiError } from "@/services"
import type {
  ConversationScenario,
  ScenarioGlobalVariable,
  ScenarioNode,
  ScenarioNodeType,
} from "@/types"
import { formatDate, formatNumber } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  Bot,
  CheckCircle2,
  Copy,
  Ellipsis,
  Eye,
  FileText,
  GitBranch,
  ImageIcon,
  Link,
  Loader2,
  MapPin,
  MessageSquare,
  Play,
  Plus,
  Search,
  Send,
  Globe,
  Save,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

type DragState = {
  nodeId: string
  offsetX: number
  offsetY: number
} | null

type PanState = {
  startX: number
  startY: number
  originX: number
  originY: number
} | null

type ConnectionDraft = {
  sourceId: string
  x: number
  y: number
  screenX: number
  screenY: number
} | null

type CreateNodeMenuState = {
  sourceId: string
  graphX: number
  graphY: number
  screenX: number
  screenY: number
} | null

type MessageButtonDraft = {
  label: string
  nextStepLabel: string
  nextStepId: string
  targetNodeId: string | null
  websiteUrl: string
}

const NODE_TYPES: Array<{ value: ScenarioNodeType; label: string; group: string }> = [
  { value: "trigger_incoming", label: "Déclencheur: message entrant", group: "Déclencheurs" },
  { value: "trigger_keyword", label: "Déclencheur: mot-clé", group: "Déclencheurs" },
  { value: "trigger_webhook", label: "Déclencheur: webhook", group: "Déclencheurs" },
  { value: "message_text", label: "Message texte", group: "Messages" },
  { value: "message_image", label: "Message image", group: "Messages" },
  { value: "message_audio", label: "Message audio", group: "Messages" },
  { value: "message_video", label: "Message vidéo", group: "Messages" },
  { value: "message_document", label: "Message document", group: "Messages" },
  { value: "message_buttons", label: "Message boutons", group: "Messages" },
  { value: "message_quick_reply", label: "Message réponses rapides", group: "Messages" },
  { value: "message_template", label: "Message template WhatsApp", group: "Messages" },
  { value: "condition_if", label: "Condition IF/ELSE", group: "Logique" },
  { value: "action_tag", label: "Action: attribuer tag", group: "Actions" },
  { value: "action_update_field", label: "Action: mise à jour champ", group: "Actions" },
  { value: "action_api_call", label: "Action: appel API", group: "Actions" },
  { value: "end", label: "Fin", group: "Actions" },
]

const NODE_TYPE_LABELS = Object.fromEntries(NODE_TYPES.map((item) => [item.value, item.label]))

const getNodeTypeIcon = (type: ScenarioNodeType) => {
  if (type.startsWith("trigger_")) return Bot
  if (type.startsWith("message_")) return MessageSquare
  if (type === "condition_if") return GitBranch
  if (type.startsWith("action_")) return Zap
  return CheckCircle2
}

const NODE_GLOBE_SIZE = 96
const NODE_TOTAL_WIDTH = 140
const NODE_TOTAL_HEIGHT = 140

const getNodeBarColor = (type: ScenarioNodeType) => {
  if (type.startsWith("trigger_")) return "bg-blue-500"
  if (type.startsWith("message_")) return "bg-emerald-500"
  if (type === "condition_if") return "bg-amber-500"
  if (type.startsWith("action_")) return "bg-violet-500"
  return "bg-slate-400"
}

const getNodeGlobeStyle = (type: ScenarioNodeType) => {
  if (type.startsWith("trigger_")) return { bg: "bg-blue-500", ring: "ring-blue-200", shadow: "shadow-blue-300/40" }
  if (type.startsWith("message_")) return { bg: "bg-emerald-500", ring: "ring-emerald-200", shadow: "shadow-emerald-300/40" }
  if (type === "condition_if") return { bg: "bg-amber-500", ring: "ring-amber-200", shadow: "shadow-amber-300/40" }
  if (type.startsWith("action_")) return { bg: "bg-violet-500", ring: "ring-violet-200", shadow: "shadow-violet-300/40" }
  return { bg: "bg-slate-400", ring: "ring-slate-200", shadow: "shadow-slate-300/40" }
}

const getNodeBadgeStyle = (type: ScenarioNodeType) => {
  if (type.startsWith("trigger_")) return "bg-blue-100 text-blue-700"
  if (type.startsWith("message_")) return "bg-emerald-100 text-emerald-700"
  if (type === "condition_if") return "bg-amber-100 text-amber-700"
  if (type.startsWith("action_")) return "bg-violet-100 text-violet-700"
  return "bg-slate-100 text-slate-600"
}

const getNodeFamilyLabel = (type: ScenarioNodeType) => {
  if (type.startsWith("trigger_")) return "Déclencheur"
  if (type.startsWith("message_")) return "Message"
  if (type === "condition_if") return "Condition"
  if (type === "end") return "Fin"
  if (type.startsWith("action_")) return "Action"
  return "Noeud"
}

const getNodeConnectorColor = (type: ScenarioNodeType) => {
  if (type.startsWith("trigger_")) return "hover:border-blue-500 hover:bg-blue-500"
  if (type.startsWith("message_")) return "hover:border-emerald-500 hover:bg-emerald-500"
  if (type === "condition_if") return "hover:border-amber-500 hover:bg-amber-500"
  if (type.startsWith("action_")) return "hover:border-violet-500 hover:bg-violet-500"
  return "hover:border-slate-400 hover:bg-slate-400"
}

const getNodeLabel = (type: ScenarioNodeType, index: number) => {
  if (type.startsWith("trigger_")) return `Déclencheur #${index}`
  if (type.startsWith("message_")) return `Message #${index}`
  if (type === "condition_if") return `Condition #${index}`
  if (type.startsWith("action_")) return `Action #${index}`
  return `Fin #${index}`
}

const getNodePreviewText = (node: ScenarioNode) => {
  const t = node.type
  if (t === "trigger_incoming") return "Se déclenche à chaque message entrant"
  if (t === "trigger_keyword") return node.config.keyword ? `Mot-clé: ${node.config.keyword}` : "Mot-clé non configuré"
  if (t === "trigger_webhook") return node.config.endpoint ? `Webhook: ${node.config.endpoint}` : "Webhook"
  if (t === "action_tag") {
    const action = node.config.tag_action === "remove" ? "Retirer" : "Ajouter"
    return node.config.tag ? `${action} tag: ${node.config.tag}` : "Tag non configuré"
  }
  if (t === "action_update_field") return node.config.field ? `${node.config.field} = ${node.config.value || "…"}` : "Champ non configuré"
  if (t === "action_api_call") {
    const method = node.config.method || "GET"
    return node.config.url ? `${method} ${node.config.url}` : "Appel API non configuré"
  }
  if (t === "end") return "Ce noeud termine le flux"
  if (t === "condition_if") return ""
  // Messages
  const contents = Array.isArray(node.config.message_item_contents)
    ? node.config.message_item_contents.filter((item): item is string => typeof item === "string")
    : []
  const preview = contents.find((item) => item.trim().length > 0)
  return preview || (node.config.content ? String(node.config.content) : "")
}

const edgePath = (source: ScenarioNode, target: { x: number; y: number }, edgeLabel?: string) => {
  const globeCenterX = source.position.x + NODE_TOTAL_WIDTH / 2
  const globeCenterY = source.position.y + NODE_GLOBE_SIZE / 2
  const sourceX = globeCenterX + NODE_GLOBE_SIZE / 2

  // For condition nodes, offset Y based on Oui (up) / Non (down)
  let sourceY = globeCenterY
  if (source.type === "condition_if" && edgeLabel) {
    const lbl = edgeLabel.toLowerCase()
    if (lbl === "oui" || lbl === "yes") sourceY = globeCenterY - NODE_GLOBE_SIZE * 0.3
    else if (lbl === "non" || lbl === "no") sourceY = globeCenterY + NODE_GLOBE_SIZE * 0.3
  }

  const targetX = target.x
  const targetY = target.y
  const dx = Math.abs(targetX - sourceX)
  const controlOffset = Math.max(50, Math.min(dx * 0.4, 180))

  return `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`
}

const edgePathToNode = (source: ScenarioNode, target: ScenarioNode, edgeLabel?: string) =>
  edgePath(source, {
    x: target.position.x + NODE_TOTAL_WIDTH / 2 - NODE_GLOBE_SIZE / 2,
    y: target.position.y + NODE_GLOBE_SIZE / 2,
  }, edgeLabel)

const CREATION_OPTIONS = [
  {
    id: "send-message",
    label: "Envoyer un message",
    icon: MessageSquare,
    type: "message_text" as ScenarioNodeType,
    title: "Envoyer un message",
    config: { content: "" },
    globeBg: "bg-emerald-500",
    globeShadow: "shadow-emerald-400/30",
  },
  {
    id: "action",
    label: "Agent IA",
    icon: Bot,
    type: "action_api_call" as ScenarioNodeType,
    title: "Agent IA",
    config: {
      ai_enabled: true,
      ai_instructions: "",
      ai_msg: "{{message}}",
      ai_model: "gpt-4o",
      ai_session_id: "",
      ai_timeline: "3600",
    },
    globeBg: "bg-violet-500",
    globeShadow: "shadow-violet-400/30",
  },
]

const MAIN_TRIGGER_ICONS = [
  { type: "trigger_incoming" as ScenarioNodeType, icon: MessageSquare, label: "Message entrant" },
  { type: "trigger_keyword" as ScenarioNodeType, icon: Tag, label: "Mots-clés" },
  { type: "trigger_webhook" as ScenarioNodeType, icon: Globe, label: "Webhook" },
]

const SECONDARY_TRIGGER_ICONS = [
  { type: "trigger_incoming" as ScenarioNodeType, icon: Play, label: "Début" },
]


const getNodeFamily = (type: ScenarioNodeType) => {
  if (type.startsWith("trigger_")) return "trigger" as const
  if (type.startsWith("message_")) return "message" as const
  if (type.startsWith("action_") || type === "end") return "action" as const
  return "logic" as const
}

const TRIGGER_TYPE_OPTIONS = NODE_TYPES.filter((item) => item.group === "Déclencheurs")

const MESSAGE_COMPONENT_OPTIONS = [
  { id: "text", label: "Texte", icon: MessageSquare },
  { id: "rich_media", label: "Média enrichi", icon: Eye },
  { id: "message_template", label: "Modèle de message", icon: Save },
  { id: "whatsapp_flow", label: "WhatsApp Flow", icon: GitBranch },
]

const RICH_MEDIA_OPTIONS = [
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "file", label: "Fichiers", icon: FileText },
  { id: "video", label: "Vidéos", icon: Video },
  { id: "location", label: "Localisation", icon: MapPin },
]


const EMOJI_OPTIONS = [
  "😀",
  "😊",
  "😍",
  "👍",
  "🙏",
  "🎉",
  "✅",
  "🔥",
  "📩",
  "💬",
  "🚀",
  "❤️",
]

const NEXT_STEP_OPTIONS = [
  { id: "open_website", label: "Ouvrir un site web", icon: Globe, tone: "bg-blue-100" },
  { id: "send_message", label: "Envoyer un message", icon: Send, tone: "bg-lime-100" },
  { id: "action", label: "Agent IA", icon: Bot, tone: "bg-violet-100" },
  { id: "goto", label: "Aller à", icon: Ellipsis, tone: "bg-slate-100" },
]

const simulatePath = (scenario: ConversationScenario): string[] => {
  const startNode = scenario.flow.nodes.find((node) => node.type.startsWith("trigger_"))
  if (!startNode) return []

  const visited: string[] = [startNode.id]
  let currentId = startNode.id

  for (let i = 0; i < 14; i += 1) {
    const candidates = scenario.flow.edges.filter((edge) => edge.source === currentId)
    if (candidates.length === 0) break

    const preferred =
      candidates.find((edge) => edge.label?.toLowerCase() === "oui") ??
      candidates.find((edge) => edge.label?.toLowerCase() === "yes") ??
      candidates[0]

    currentId = preferred.target
    if (visited.includes(currentId)) break
    visited.push(currentId)
  }

  return visited
}

const findNode = (scenario: ConversationScenario, nodeId: string) =>
  scenario.flow.nodes.find((node) => node.id === nodeId)

export default function ScenarioBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const messageTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const resolvedParams = use(params)

  const [scenario, setScenario] = useState<ConversationScenario | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<DragState>(null)
  const [panning, setPanning] = useState<PanState>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft>(null)
  const [createNodeMenu, setCreateNodeMenu] = useState<CreateNodeMenuState>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [previewPath, setPreviewPath] = useState<string[]>([])
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [showScenarioOverlay, setShowScenarioOverlay] = useState(false)
  const [hoveredInputNodeId, setHoveredInputNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [showTokenPickerIndex, setShowTokenPickerIndex] = useState<number | null>(null)
  const [tokenPickerView, setTokenPickerView] = useState<"variables" | "emoji">("variables")
  const [showRichMediaMenuIndex, setShowRichMediaMenuIndex] = useState<number | null>(null)
  const [isButtonModalOpen, setIsButtonModalOpen] = useState(false)
  const [isNextStepModalOpen, setIsNextStepModalOpen] = useState(false)
  const [existingStepQuery, setExistingStepQuery] = useState("")
  const [messageButtonDraft, setMessageButtonDraft] = useState<MessageButtonDraft>({
    label: "",
    nextStepLabel: "",
    nextStepId: "",
    targetNodeId: null,
    websiteUrl: "",
  })
  const [draggingMessageCardIndex, setDraggingMessageCardIndex] = useState<number | null>(null)
  const [dragOverMessageCardIndex, setDragOverMessageCardIndex] = useState<number | null>(null)
  const [floatingActionNodeId, setFloatingActionNodeId] = useState<string | null>(null)
  const connectionDroppedOnInputRef = useRef(false)

  const floatingActionNode = useMemo(() => {
    if (!scenario || !floatingActionNodeId) return null
    return findNode(scenario, floatingActionNodeId) ?? null
  }, [scenario, floatingActionNodeId])

  const selectedNode = useMemo(() => {
    if (!scenario || !selectedNodeId) return null
    return findNode(scenario, selectedNodeId) ?? null
  }, [scenario, selectedNodeId])


  const loadScenario = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await scenariosService.getScenarioById(resolvedParams.id)
      setScenario(data)
      setZoom(data.flow.viewport?.zoom ?? 1)
      setPan({
        x: data.flow.viewport?.panX ?? 0,
        y: data.flow.viewport?.panY ?? 0,
      })
      setValidationErrors([])
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
      router.replace("/scenarios")
    } finally {
      setIsLoading(false)
    }
  }, [resolvedParams.id, router])

  useEffect(() => {
    loadScenario()
  }, [loadScenario])

  useEffect(() => {
    if (!scenario) return
    if (scenario.flow.nodes.length > 0) return
    updateScenario((draft) => {
      const startNode: ScenarioNode = {
        id: crypto.randomUUID(),
        type: "trigger_incoming",
        title: NODE_TYPE_LABELS.trigger_incoming,
        description: "Point d'entrée du flow",
        position: { x: 80, y: 160 },
        config: {},
      }
      return {
        ...draft,
        flow: {
          ...draft.flow,
          nodes: [startNode],
        },
      }
    })
  }, [scenario])

  useEffect(() => {
    if (!scenario || !isDirty) return

    const timeout = setTimeout(async () => {
      try {
        setIsSaving(true)
        const updated = await scenariosService.updateScenario(scenario.id, {
          name: scenario.name,
          description: scenario.description,
          flow: {
            ...scenario.flow,
            viewport: {
              zoom,
              panX: pan.x,
              panY: pan.y,
            },
          },
          global_variables: scenario.global_variables,
        })
        setScenario(updated)
        setLastSavedAt(new Date().toISOString())
        setIsDirty(false)
      } catch {
        toast.error("Échec de la sauvegarde automatique")
      } finally {
        setIsSaving(false)
      }
    }, 900)

    return () => clearTimeout(timeout)
  }, [scenario, isDirty, zoom, pan])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      if (connectionDraft) {
        const graphX = (event.clientX - rect.left - pan.x) / zoom
        const graphY = (event.clientY - rect.top - pan.y) / zoom
        setConnectionDraft((prev) =>
          prev
            ? {
                ...prev,
                x: graphX,
                y: graphY,
                screenX: event.clientX - rect.left,
                screenY: event.clientY - rect.top,
              }
            : prev
        )
      }

      if (!scenario) return

      if (dragging) {
        const graphX = (event.clientX - rect.left - pan.x) / zoom
        const graphY = (event.clientY - rect.top - pan.y) / zoom

        setScenario((prev) => {
          if (!prev) return prev
          const nodes = prev.flow.nodes.map((node) => {
            if (node.id !== dragging.nodeId) return node
            return {
              ...node,
              position: {
                x: graphX - dragging.offsetX,
                y: graphY - dragging.offsetY,
              },
            }
          })

          return {
            ...prev,
            flow: {
              ...prev.flow,
              nodes,
            },
          }
        })
        setIsDirty(true)
      }

      if (panning) {
        setPan({
          x: panning.originX + (event.clientX - panning.startX),
          y: panning.originY + (event.clientY - panning.startY),
        })
        setIsDirty(true)
      }
    }

    const onMouseUp = () => {
      if (connectionDroppedOnInputRef.current) {
        connectionDroppedOnInputRef.current = false
        setConnectionDraft(null)
      } else if (connectionDraft) {
        setCreateNodeMenu({
          sourceId: connectionDraft.sourceId,
          graphX: connectionDraft.x,
          graphY: connectionDraft.y,
          screenX: connectionDraft.screenX,
          screenY: connectionDraft.screenY,
        })
        setConnectionDraft(null)
      }
      setDragging(null)
      setPanning(null)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [connectionDraft, dragging, panning, scenario, pan, zoom])

  const updateScenario = (updater: (draft: ConversationScenario) => ConversationScenario) => {
    setScenario((prev) => {
      if (!prev) return prev
      const next = updater(prev)
      return next
    })
    setIsDirty(true)
  }

  const handleNodeMouseDown = (event: React.MouseEvent, node: ScenarioNode) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const graphX = (event.clientX - rect.left - pan.x) / zoom
    const graphY = (event.clientY - rect.top - pan.y) / zoom

    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)
    setDragging({
      nodeId: node.id,
      offsetX: graphX - node.position.x,
      offsetY: graphY - node.position.y,
    })
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only pan when clicking directly on the canvas or its transform wrapper
    if (event.target !== event.currentTarget) return
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setCreateNodeMenu(null)
    setPanning({
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    })
  }

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) {
      // Zoom avec Ctrl+scroll
      const delta = event.deltaY > 0 ? -0.08 : 0.08
      setZoomValue(zoom + delta)
    } else {
      // Pan avec scroll
      setPan((prev) => ({
        x: prev.x - event.deltaX,
        y: prev.y - event.deltaY,
      }))
      setIsDirty(true)
    }
  }

  const addNode = (
    nodeType: ScenarioNodeType,
    position?: { x: number; y: number },
    title?: string,
    config?: Record<string, string | number | boolean | string[] | null | undefined>
  ) => {
    let createdNodeId: string | null = null
    updateScenario((draft) => {
      const id = crypto.randomUUID()
      createdNodeId = id
      const resolvedType = draft.flow.nodes.length === 0 ? "trigger_incoming" : nodeType
      const nextNode: ScenarioNode = {
        id,
        type: resolvedType,
        title: title ?? NODE_TYPE_LABELS[resolvedType],
        description: "",
        position: position ?? {
          x: 120 + draft.flow.nodes.length * 25,
          y: 120 + draft.flow.nodes.length * 20,
        },
        config: config ?? (resolvedType.startsWith("message_")
          ? { content: "" }
          : resolvedType === "condition_if"
            ? { expression: "" }
            : {}),
      }
      return {
        ...draft,
        flow: {
          ...draft.flow,
          nodes: [...draft.flow.nodes, nextNode],
        },
      }
    })
    return createdNodeId
  }

  const duplicateNode = (nodeId: string) => {
    updateScenario((draft) => {
      const source = draft.flow.nodes.find((node) => node.id === nodeId)
      if (!source) return draft

      const duplicate: ScenarioNode = {
        ...source,
        id: crypto.randomUUID(),
        title: `${source.title} copie`,
        position: {
          x: source.position.x + 30,
          y: source.position.y + 30,
        },
      }

      return {
        ...draft,
        flow: {
          ...draft.flow,
          nodes: [...draft.flow.nodes, duplicate],
        },
      }
    })
  }

  const removeNode = (nodeId: string) => {
    let blocked = false
    updateScenario((draft) => {
      const nodeToDelete = draft.flow.nodes.find((node) => node.id === nodeId)
      if (!nodeToDelete) return draft
      const triggerCount = draft.flow.nodes.filter((node) => node.type.startsWith("trigger_")).length
      if (nodeToDelete.type.startsWith("trigger_") && triggerCount === 1) {
        blocked = true
        return draft
      }
      return {
        ...draft,
        flow: {
          ...draft.flow,
          nodes: draft.flow.nodes.filter((node) => node.id !== nodeId),
          edges: draft.flow.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        },
      }
    })
    if (blocked) {
      toast.error("Le flow doit toujours contenir un déclencheur.")
      return
    }
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
  }

  const connectNodes = (sourceId: string, targetId: string, forcedLabel?: string) => {
    if (sourceId === targetId) return
    updateScenario((draft) => {
      const exists = draft.flow.edges.some(
        (edge) =>
          edge.source === sourceId &&
          edge.target === targetId &&
          (forcedLabel ? edge.label === forcedLabel : true)
      )
      if (exists) return draft

      const sourceNode = draft.flow.nodes.find((node) => node.id === sourceId)
      const label = forcedLabel ?? (sourceNode?.type === "condition_if" && draft.flow.edges.filter((edge) => edge.source === sourceId).length === 0
        ? "Oui"
        : sourceNode?.type === "condition_if"
          ? "Non"
          : undefined)

      return {
        ...draft,
        flow: {
          ...draft.flow,
          edges: [
            ...draft.flow.edges,
            {
              id: crypto.randomUUID(),
              source: sourceId,
              target: targetId,
              label,
            },
          ],
        },
      }
    })
  }

  const startConnection = (event: React.MouseEvent, sourceId: string) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const graphX = (event.clientX - rect.left - pan.x) / zoom
    const graphY = (event.clientY - rect.top - pan.y) / zoom
    setCreateNodeMenu(null)
    setConnectionDraft({
      sourceId,
      x: graphX,
      y: graphY,
      screenX: event.clientX - rect.left,
      screenY: event.clientY - rect.top,
    })
  }

  const finishConnectionOnInput = (event: React.MouseEvent, targetId: string) => {
    event.stopPropagation()
    if (!connectionDraft) return
    connectionDroppedOnInputRef.current = true
    connectNodes(connectionDraft.sourceId, targetId)
    setCreateNodeMenu(null)
    setHoveredInputNodeId(null)
  }

  const createNodeFromMenu = (optionId: string) => {
    if (!createNodeMenu) return
    const option = CREATION_OPTIONS.find((item) => item.id === optionId)
    if (!option) return
    const condX = Math.max(20, createNodeMenu.graphX)
    const condY = Math.max(20, createNodeMenu.graphY - NODE_GLOBE_SIZE / 2)
    const nodeId = addNode(
      option.type,
      { x: condX, y: condY },
      option.title,
      option.config
    )
    if (nodeId) {
      if (createNodeMenu.sourceId) {
        connectNodes(createNodeMenu.sourceId, nodeId)
      }

      setSelectedNodeId(nodeId)
    }
    setCreateNodeMenu(null)
  }

  const removeEdge = (edgeId: string) => {
    updateScenario((draft) => ({
      ...draft,
      flow: {
        ...draft.flow,
        edges: draft.flow.edges.filter((edge) => edge.id !== edgeId),
      },
    }))
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null)
    }
  }

  const updateSelectedNode = (updater: (node: ScenarioNode) => ScenarioNode) => {
    if (!selectedNodeId) return
    updateScenario((draft) => ({
      ...draft,
      flow: {
        ...draft.flow,
        nodes: draft.flow.nodes.map((node) =>
          node.id === selectedNodeId ? updater(node) : node
        ),
      },
    }))
  }

  const updateNodeById = (nodeId: string, updater: (node: ScenarioNode) => ScenarioNode) => {
    updateScenario((draft) => ({
      ...draft,
      flow: {
        ...draft.flow,
        nodes: draft.flow.nodes.map((node) =>
          node.id === nodeId ? updater(node) : node
        ),
      },
    }))
  }

  const updateGlobalVariable = (variableId: string, patch: Partial<ScenarioGlobalVariable>) => {
    updateScenario((draft) => ({
      ...draft,
      global_variables: draft.global_variables.map((variable) =>
        variable.id === variableId ? { ...variable, ...patch } : variable
      ),
    }))
  }

  const addGlobalVariable = () => {
    updateScenario((draft) => ({
      ...draft,
      global_variables: [
        ...draft.global_variables,
        {
          id: crypto.randomUUID(),
          key: "",
          value: "",
        },
      ],
    }))
  }

  const removeGlobalVariable = (variableId: string) => {
    updateScenario((draft) => ({
      ...draft,
      global_variables: draft.global_variables.filter((variable) => variable.id !== variableId),
    }))
  }

  const validateCurrentScenario = () => {
    if (!scenario) return
    const errors = scenariosService.validateScenarioFlow(scenario.flow)
    setValidationErrors(errors)
    if (errors.length === 0) {
      toast.success("Validation réussie")
    } else {
      toast.error(errors[0])
    }
  }

  const publishScenario = async () => {
    if (!scenario) return
    const errors = scenariosService.validateScenarioFlow(scenario.flow)
    setValidationErrors(errors)
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    try {
      setIsSaving(true)
      const published = await scenariosService.publishScenario(scenario.id)
      setScenario(published)
      setIsDirty(false)
      toast.success("Scénario publié")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDraftMode = async (isPublished: boolean) => {
    if (!scenario) return
    try {
      setIsSaving(true)
      if (isPublished) {
        await publishScenario()
        return
      }
      const updated = await scenariosService.updateScenario(scenario.id, { status: "draft" })
      setScenario(updated)
      setValidationErrors([])
      toast.success("Mode brouillon activé")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const saveVersion = async () => {
    if (!scenario) return
    try {
      setIsSaving(true)
      const updated = await scenariosService.addVersion(scenario.id, "Sauvegarde manuelle")
      setScenario(updated)
      toast.success("Version enregistrée")
    } catch (error) {
      const apiError = handleApiError(error)
      toast.error(apiError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const runPreview = async () => {
    if (!scenario) return
    const path = simulatePath(scenario)
    setPreviewPath(path)
    try {
      const updated = await scenariosService.recordTrigger(scenario.id)
      setScenario(updated)
    } catch {
      // no-op
    }
    if (path.length === 0) {
      toast.error("Impossible de simuler ce flow. Ajoute un déclencheur.")
    } else {
      toast.success("Preview générée")
    }
  }

  const setZoomValue = (value: number) => {
    const next = Math.min(1.8, Math.max(0.5, value))
    setZoom(next)
    setIsDirty(true)
  }

  const selectedNodeFamily = selectedNode ? getNodeFamily(selectedNode.type) : null
  const selectedMessageItems = selectedNode && Array.isArray(selectedNode.config.message_items)
    ? selectedNode.config.message_items.filter((item): item is string => typeof item === "string")
    : []
  const selectedMessageContents = selectedNode && Array.isArray(selectedNode.config.message_item_contents)
    ? selectedNode.config.message_item_contents.filter((item): item is string => typeof item === "string")
    : []
  const selectedMessageMediaTypes = selectedNode && Array.isArray(selectedNode.config.message_item_media_types)
    ? selectedNode.config.message_item_media_types.filter((item): item is string => typeof item === "string")
    : []
  const existingSteps = useMemo(() => {
    if (!scenario || !selectedNode) return []
    return scenario.flow.nodes
      .filter((node) => node.id !== selectedNode.id)
      .filter((node) => node.title.toLowerCase().includes(existingStepQuery.toLowerCase()))
  }, [existingStepQuery, scenario, selectedNode])

  const insertInMessageText = (value: string, index: number) => {
    if (!selectedNode) return
    const input = messageTextareaRef.current
    const current = selectedMessageContents[index] ?? ""
    if (!input) {
      updateSelectedNode((node) => ({
        ...node,
        config: {
          ...node.config,
          message_item_contents: selectedMessageItems.map((_, i) =>
            i === index ? `${current}${value}` : (selectedMessageContents[i] ?? "")
          ),
        },
      }))
      return
    }
    const start = input.selectionStart ?? current.length
    const end = input.selectionEnd ?? current.length
    const next = `${current.slice(0, start)}${value}${current.slice(end)}`
    updateSelectedNode((node) => ({
      ...node,
      config: {
        ...node.config,
        message_item_contents: selectedMessageItems.map((_, i) =>
          i === index ? next : (selectedMessageContents[i] ?? "")
        ),
      },
    }))
    requestAnimationFrame(() => {
      input.focus()
      const cursor = start + value.length
      input.setSelectionRange(cursor, cursor)
    })
  }

  const saveMessageButtonDraft = () => {
    if (!selectedNode) return
    if (!messageButtonDraft.label.trim()) {
      toast.error("Le titre du bouton est requis.")
      return
    }
    if (!messageButtonDraft.nextStepLabel.trim() && !messageButtonDraft.targetNodeId) {
      toast.error("Sélectionne l'étape suivante.")
      return
    }
    if (messageButtonDraft.nextStepId === "open_website") {
      if (!messageButtonDraft.websiteUrl.trim().startsWith("https://")) {
        toast.error("L'URL doit commencer par https://")
        return
      }
    }

    let targetNodeId = messageButtonDraft.targetNodeId
    if (!targetNodeId && messageButtonDraft.nextStepId && messageButtonDraft.nextStepId !== "open_website") {
      const mapStepToNodeType = (stepId: string): { type: ScenarioNodeType; title: string } => {
        if (stepId === "send_message") return { type: "message_text", title: "Envoyer un message" }
        if (stepId === "action") return { type: "action_api_call", title: "Agent IA" }
        return { type: "end", title: "Fin" }
      }
      const mapped = mapStepToNodeType(messageButtonDraft.nextStepId)
      targetNodeId = addNode(mapped.type, undefined, mapped.title) ?? null
    }

    if (targetNodeId) {
      connectNodes(selectedNode.id, targetNodeId, messageButtonDraft.label.trim())
    }

    updateSelectedNode((node) => ({
      ...node,
      config: {
        ...node.config,
        message_buttons: [
          ...(Array.isArray(node.config.message_buttons)
            ? node.config.message_buttons.filter((item): item is string => typeof item === "string")
            : []),
          messageButtonDraft.label.trim(),
        ],
        message_button_next_steps: [
          ...(Array.isArray(node.config.message_button_next_steps)
            ? node.config.message_button_next_steps.filter((item): item is string => typeof item === "string")
            : []),
          messageButtonDraft.nextStepId === "open_website"
            ? `Ouvrir le site : ${messageButtonDraft.websiteUrl.trim()}`
            : messageButtonDraft.nextStepLabel,
        ],
        message_button_urls: [
          ...(Array.isArray(node.config.message_button_urls)
            ? node.config.message_button_urls.filter((item): item is string => typeof item === "string")
            : []),
          messageButtonDraft.nextStepId === "open_website" ? messageButtonDraft.websiteUrl.trim() : "",
        ],
      },
    }))
    setIsButtonModalOpen(false)
    setIsNextStepModalOpen(false)
    setMessageButtonDraft({
      label: "",
      nextStepLabel: "",
      nextStepId: "",
      targetNodeId: null,
      websiteUrl: "",
    })
  }

  const reorderMessageCards = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    updateSelectedNode((node) => {
      const reorder = (values: string[], fallback = "") => {
        const list = [...values]
        while (list.length < selectedMessageItems.length) list.push(fallback)
        const [moved] = list.splice(fromIndex, 1)
        list.splice(toIndex, 0, moved ?? fallback)
        return list
      }

      const items = reorder(
        Array.isArray(node.config.message_items)
          ? node.config.message_items.filter((item): item is string => typeof item === "string")
          : []
      )
      const contents = reorder(
        Array.isArray(node.config.message_item_contents)
          ? node.config.message_item_contents.filter((item): item is string => typeof item === "string")
          : []
      )
      const mediaTypes = reorder(
        Array.isArray(node.config.message_item_media_types)
          ? node.config.message_item_media_types.filter((item): item is string => typeof item === "string")
          : [],
        "image"
      )
      const locations = reorder(
        Array.isArray(node.config.message_item_locations)
          ? node.config.message_item_locations.filter((item): item is string => typeof item === "string")
          : []
      )
      const labels = reorder(
        Array.isArray(node.config.message_item_media_labels)
          ? node.config.message_item_media_labels.filter((item): item is string => typeof item === "string")
          : []
      )

      return {
        ...node,
        config: {
          ...node.config,
          message_items: items,
          message_item_contents: contents,
          message_item_media_types: mediaTypes,
          message_item_locations: locations,
          message_item_media_labels: labels,
        },
      }
    })
  }

  if (isLoading || !scenario) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement du flow...
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="relative h-full bg-background">
        <div
          ref={canvasRef}
          className={`relative h-full w-full overflow-hidden bg-[#f8f9fb] ${dragging || connectionDraft ? "select-none" : ""}`}
          style={{ backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleCanvasWheel}
        >
          <div className="absolute left-4 top-4 z-30 inline-flex items-center gap-2 rounded-xl border border-border/40 bg-card/95 px-2.5 py-2 shadow-lg backdrop-blur">
            <Button onClick={publishScenario} size="sm" className="h-8 gap-1.5 text-[13px] rounded-lg">
              <Upload className="h-3.5 w-3.5" />
              Publier
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                  <Ellipsis className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setShowScenarioOverlay((prev) => !prev)}>
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  Visualiser
                </DropdownMenuItem>
                <DropdownMenuItem onClick={runPreview}>
                  <Bot className="mr-2 h-3.5 w-3.5" />
                  Tester le flow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={saveVersion}>
                  <Save className="mr-2 h-3.5 w-3.5" />
                  Sauvegarder version
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="mx-0.5 h-5 w-px bg-border/60" />
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoomValue(zoom - 0.1)}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="w-10 text-center text-[12px] text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setZoomValue(zoom + 0.1)}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="mx-0.5 h-5 w-px bg-border/60" />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-[13px] rounded-lg"
              onClick={() => {
                const lastNode = scenario.flow.nodes[scenario.flow.nodes.length - 1]
                const posX = lastNode ? lastNode.position.x + 300 : 400
                const posY = lastNode ? lastNode.position.y : 200
                setCreateNodeMenu({
                  sourceId: lastNode?.id ?? "",
                  graphX: posX,
                  graphY: posY,
                  screenX: 0,
                  screenY: 0,
                })
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>

          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: "4000px",
              height: "4000px",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
            onMouseDown={handleCanvasMouseDown}
          >
            <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L8,3 L0,6 Z" fill="#cbd5e1" />
                </marker>
                <marker id="arrow-selected" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L8,3 L0,6 Z" fill="#10b981" />
                </marker>
              </defs>
              {scenario.flow.edges.map((edge) => {
                const source = findNode(scenario, edge.source)
                const target = findNode(scenario, edge.target)
                if (!source || !target) return null
                const isEdgeSelected = selectedEdgeId === edge.id
                const srcCx = source.position.x + NODE_TOTAL_WIDTH / 2
                const srcCy = source.position.y + NODE_GLOBE_SIZE / 2
                const tgtCx = target.position.x + NODE_TOTAL_WIDTH / 2
                const tgtCy = target.position.y + NODE_GLOBE_SIZE / 2
                const midX = (srcCx + tgtCx) / 2
                const midY = (srcCy + tgtCy) / 2
                return (
                  <g key={edge.id}>
                    {/* Zone de clic invisible élargie */}
                    <path
                      d={edgePathToNode(source, target, edge.label)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18}
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedNodeId(null)
                        setSelectedEdgeId(edge.id)
                      }}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    />
                    {/* Ligne visible */}
                    <path
                      d={edgePathToNode(source, target, edge.label)}
                      fill="none"
                      stroke={isEdgeSelected ? "#10b981" : "#cbd5e1"}
                      strokeWidth={isEdgeSelected ? 2.5 : 1.5}
                      markerEnd={isEdgeSelected ? "url(#arrow-selected)" : "url(#arrow)"}
                      style={{ pointerEvents: "none" }}
                    />
                    {/* Label de la connexion */}
                    {edge.label && (
                      <foreignObject
                        x={midX - 30}
                        y={midY - 24}
                        width="60"
                        height="24"
                        style={{ pointerEvents: "none" }}
                      >
                        <span className={`flex h-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold shadow-sm ${
                          edge.label.toLowerCase() === "oui" || edge.label.toLowerCase() === "yes"
                            ? "bg-emerald-100 text-emerald-700"
                            : edge.label.toLowerCase() === "non" || edge.label.toLowerCase() === "no"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-white text-gray-600"
                        }`}>
                          {edge.label}
                        </span>
                      </foreignObject>
                    )}
                    {/* Bouton supprimer quand sélectionné */}
                    {isEdgeSelected && (
                      <foreignObject
                        x={midX - 14}
                        y={midY - 14}
                        width="28"
                        height="28"
                        style={{ pointerEvents: "auto" }}
                      >
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-rose-500 shadow-md transition-transform hover:scale-110"
                          onClick={(event) => {
                            event.stopPropagation()
                            removeEdge(edge.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </foreignObject>
                    )}
                  </g>
                )
              })}
              {connectionDraft && (() => {
                const source = findNode(scenario, connectionDraft.sourceId)
                if (!source) return null
                return (
                  <path
                    d={edgePath(source, { x: connectionDraft.x, y: connectionDraft.y })}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    style={{ pointerEvents: "none" }}
                  />
                )
              })()}
            </svg>

            {scenario.flow.nodes.map((node) => {
              const isTriggerNode = node.type.startsWith("trigger_")
              const isConditionNode = node.type === "condition_if"
              const NodeIcon = getNodeTypeIcon(node.type)
              const isSelected = selectedNodeId === node.id
              const globeStyle = getNodeGlobeStyle(node.type)
              const connectorHover = getNodeConnectorColor(node.type)
              const globeLeft = (NODE_TOTAL_WIDTH - NODE_GLOBE_SIZE) / 2

              return (
              <div
                key={node.id}
                className="group absolute"
                style={{ left: node.position.x, top: node.position.y, width: NODE_TOTAL_WIDTH }}
                onMouseDown={(event) => {
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  setFloatingActionNodeId(node.id)
                  setSelectedNodeId(null)
                  setSelectedEdgeId(null)
                }}
              >
                {/* Toolbar — appears on hover above globe */}
                <div className={`absolute -top-11 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-200/80 bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  {!isTriggerNode && (
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      onClick={(event) => { event.stopPropagation(); duplicateNode(node.id) }}
                      title="Dupliquer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    onClick={(event) => { event.stopPropagation(); startConnection(event, node.id) }}
                    title="Connecter"
                  >
                    <Link className="h-3.5 w-3.5" />
                  </button>
                  {!isTriggerNode && (
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-500"
                      onClick={(event) => { event.stopPropagation(); removeNode(node.id) }}
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isTriggerNode && (
                    <>
                      <div className="mx-0.5 h-5 w-px bg-gray-200" />
                      {(scenario.is_main ? MAIN_TRIGGER_ICONS : SECONDARY_TRIGGER_ICONS).map((trigger) => {
                        const TriggerIcon = trigger.icon
                        const isActive = node.type === trigger.type
                        return (
                          <button
                            key={trigger.type}
                            type="button"
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                              isActive
                                ? "bg-blue-100 text-blue-600"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation()
                              updateScenario((draft) => ({
                                ...draft,
                                flow: {
                                  ...draft.flow,
                                  nodes: draft.flow.nodes.map((n) =>
                                    n.id === node.id
                                      ? { ...n, type: trigger.type, title: NODE_TYPE_LABELS[trigger.type] || n.title }
                                      : n
                                  ),
                                },
                              }))
                            }}
                            title={trigger.label}
                          >
                            <TriggerIcon className="h-3.5 w-3.5" />
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>

                {/* Input connector — left edge of globe */}
                {!isTriggerNode && (
                  <button
                    type="button"
                    aria-label="Entrée"
                    className={`absolute z-10 h-3.5 w-3.5 rounded-full border-2 border-white bg-gray-300 shadow-sm transition-all ${connectorHover} ${
                      hoveredInputNodeId === node.id ? "scale-150 !bg-emerald-500 ring-2 ring-emerald-300" : ""
                    }`}
                    style={{ left: globeLeft, top: NODE_GLOBE_SIZE / 2, transform: "translate(-50%, -50%)" }}
                    onMouseEnter={() => setHoveredInputNodeId(node.id)}
                    onMouseLeave={() => setHoveredInputNodeId((prev) => (prev === node.id ? null : prev))}
                    onMouseUp={(event) => finishConnectionOnInput(event, node.id)}
                  />
                )}

                {/* Globe */}
                <div
                  className={`mx-auto flex cursor-grab items-center justify-center rounded-full transition-all active:cursor-grabbing ${globeStyle.bg} ${globeStyle.shadow} shadow-lg ${
                    isSelected ? `ring-4 ${globeStyle.ring} ring-offset-2` : "hover:scale-105 hover:shadow-xl"
                  }`}
                  style={{ width: NODE_GLOBE_SIZE, height: NODE_GLOBE_SIZE }}
                  onMouseDown={(event) => handleNodeMouseDown(event, node)}
                >
                  <NodeIcon className="h-9 w-9 text-white" strokeWidth={1.6} />
                </div>

                {/* Label below globe */}
                <p className="mt-3 max-w-[140px] text-center text-[12px] font-semibold leading-snug text-gray-700">
                  {node.title || NODE_TYPE_LABELS[node.type]}
                </p>

                {/* Output connectors */}
                {isConditionNode ? (
                  <>
                    {/* Oui connector — upper right of globe */}
                    <button
                      type="button"
                      aria-label="Sortie Oui"
                      className={`absolute z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[8px] font-bold text-white shadow-sm transition-all hover:scale-125`}
                      style={{ left: globeLeft + NODE_GLOBE_SIZE, top: NODE_GLOBE_SIZE / 2 - NODE_GLOBE_SIZE * 0.3, transform: "translate(-50%, -50%)" }}
                      onMouseDown={(event) => startConnection(event, node.id)}
                    />
                    <span
                      className="pointer-events-none absolute z-10 text-[9px] font-bold text-emerald-600"
                      style={{ left: globeLeft + NODE_GLOBE_SIZE + 14, top: NODE_GLOBE_SIZE / 2 - NODE_GLOBE_SIZE * 0.3, transform: "translateY(-50%)" }}
                    >Oui</span>
                    {/* Non connector — lower right of globe */}
                    <button
                      type="button"
                      aria-label="Sortie Non"
                      className={`absolute z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-[8px] font-bold text-white shadow-sm transition-all hover:scale-125`}
                      style={{ left: globeLeft + NODE_GLOBE_SIZE, top: NODE_GLOBE_SIZE / 2 + NODE_GLOBE_SIZE * 0.3, transform: "translate(-50%, -50%)" }}
                      onMouseDown={(event) => startConnection(event, node.id)}
                    />
                    <span
                      className="pointer-events-none absolute z-10 text-[9px] font-bold text-rose-600"
                      style={{ left: globeLeft + NODE_GLOBE_SIZE + 14, top: NODE_GLOBE_SIZE / 2 + NODE_GLOBE_SIZE * 0.3, transform: "translateY(-50%)" }}
                    >Non</span>
                  </>
                ) : (
                  <button
                    type="button"
                    aria-label="Sortie principale"
                    className={`absolute z-10 h-3.5 w-3.5 rounded-full border-2 border-white bg-gray-300 shadow-sm transition-all ${connectorHover} ${
                      connectionDraft?.sourceId === node.id ? "scale-150 !bg-emerald-500 ring-2 ring-emerald-300" : ""
                    }`}
                    style={{ left: globeLeft + NODE_GLOBE_SIZE, top: NODE_GLOBE_SIZE / 2, transform: "translate(-50%, -50%)" }}
                    onMouseDown={(event) => startConnection(event, node.id)}
                  />
                )}

                {/* + button below */}
                <button
                  type="button"
                  className="absolute left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white text-gray-400 shadow-sm transition-all hover:border-emerald-500 hover:bg-emerald-500 hover:text-white hover:shadow-md"
                  style={{ top: NODE_TOTAL_HEIGHT + 4 }}
                  onClick={(event) => {
                    event.stopPropagation()
                    setCreateNodeMenu({
                      sourceId: node.id,
                      graphX: node.position.x + NODE_TOTAL_WIDTH + 60,
                      graphY: node.position.y + NODE_GLOBE_SIZE / 2,
                      screenX: 0,
                      screenY: 0,
                    })
                  }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              )
            })}
          </div>

          {createNodeMenu && (
            <div
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
              onClick={() => setCreateNodeMenu(null)}
            >
              <div
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Ajouter une étape</h3>
                  <button
                    type="button"
                    className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    onClick={() => setCreateNodeMenu(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-x-5 gap-y-6 sm:grid-cols-5">
                  {CREATION_OPTIONS.map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className="group flex flex-col items-center gap-2 transition-transform hover:scale-105"
                        onClick={() => createNodeFromMenu(option.id)}
                      >
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-shadow group-hover:shadow-lg ${option.globeBg} ${option.globeShadow}`}>
                          <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                        </div>
                        <span className="text-center text-[11px] font-medium leading-tight text-gray-500 group-hover:text-gray-900">
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {showScenarioOverlay && (
            <div className="absolute bottom-3 left-3 z-30 h-[78%] w-[400px] overflow-hidden rounded-2xl border border-border/40 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">Paramètres</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Configuration et statistiques</p>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  onClick={() => setShowScenarioOverlay(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[calc(100%-4rem)] space-y-3 overflow-y-auto px-5 py-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium">Nom</label>
                  <Input
                    className="h-9 text-[13px]"
                    value={scenario.name}
                    onChange={(event) =>
                      updateScenario((draft) => ({
                        ...draft,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium">Description</label>
                  <Textarea
                    value={scenario.description}
                    onChange={(event) =>
                      updateScenario((draft) => ({
                        ...draft,
                        description: event.target.value,
                      }))
                    }
                    className="min-h-[70px] text-[13px]"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2.5">
                  <span className="text-[13px]">Publié</span>
                  <Switch
                    checked={scenario.status === "active"}
                    onCheckedChange={toggleDraftMode}
                  />
                </div>
                {lastSavedAt && (
                  <p className="text-[11px] text-muted-foreground">Dernière sauvegarde: {formatDate(lastSavedAt)}</p>
                )}
                <Button variant="outline" size="sm" className="w-full h-8 text-[13px] rounded-lg gap-1.5" onClick={validateCurrentScenario}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Valider le flow
                </Button>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Variables globales</p>
                  {scenario.global_variables.map((variable) => (
                    <div key={variable.id} className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
                      <Input
                        placeholder="clé"
                        className="h-8 text-[12px]"
                        value={variable.key}
                        onChange={(event) => updateGlobalVariable(variable.id, { key: event.target.value })}
                      />
                      <Input
                        placeholder="valeur"
                        className="h-8 text-[12px]"
                        value={variable.value}
                        onChange={(event) => updateGlobalVariable(variable.id, { value: event.target.value })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                        onClick={() => removeGlobalVariable(variable.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full h-8 text-[12px] rounded-lg gap-1.5" onClick={addGlobalVariable}>
                    <Plus className="h-3 w-3" />
                    Ajouter variable
                  </Button>
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Parcours</p>
                  {previewPath.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      Lance la preview pour voir la progression.
                    </p>
                  ) : (
                    previewPath.map((nodeId, index) => {
                      const node = findNode(scenario, nodeId)
                      if (!node) return null
                      return (
                        <div key={nodeId} className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2">
                          <Badge variant="outline" className="text-[10px]">{index + 1}</Badge>
                          <span className="text-[12px] line-clamp-1">{node.title}</span>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Stats & versions</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-lg border border-border/40 p-2">
                      <p className="text-[11px] text-muted-foreground">Déclenchements</p>
                      <p className="text-[13px] font-semibold">{formatNumber(scenario.stats.trigger_count)}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 p-2">
                      <p className="text-[11px] text-muted-foreground">Messages envoyés</p>
                      <p className="text-[13px] font-semibold">{formatNumber(scenario.stats.total_messages_sent)}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 p-2">
                      <p className="text-[11px] text-muted-foreground">Taux completion</p>
                      <p className="text-[13px] font-semibold">{scenario.stats.completion_rate}%</p>
                    </div>
                    <div className="rounded-lg border border-border/40 p-2">
                      <p className="text-[11px] text-muted-foreground">Dernier déclenchement</p>
                      <p className="text-[13px] font-semibold">
                        {scenario.stats.last_triggered_at ? formatDate(scenario.stats.last_triggered_at) : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {scenario.versions.slice(0, 6).map((version) => (
                      <div key={version.id} className="rounded-lg border border-border/40 px-3 py-2">
                        <p className="text-[12px] font-medium">{version.note}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDate(version.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Connexions</p>
                  {scenario.flow.edges.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">Aucune connexion définie.</p>
                  ) : (
                    scenario.flow.edges.map((edge) => {
                      const source = findNode(scenario, edge.source)
                      const target = findNode(scenario, edge.target)
                      return (
                        <div key={edge.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium">{source?.title ?? "Bloc"} → {target?.title ?? "Bloc"}</p>
                            {edge.label && <p className="text-[11px] text-muted-foreground">Label: {edge.label}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => removeEdge(edge.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })
                  )}
                </div>

                {validationErrors.length > 0 && (
                  <div className="space-y-1.5 rounded-lg border border-destructive/30 p-3">
                    <p className="text-[13px] font-semibold text-destructive">Erreurs de logique</p>
                    {validationErrors.map((error) => (
                      <p key={error} className="text-[12px] text-destructive">• {error}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SIDE PANEL REMOVED — floating panel handles all node types */}

          {floatingActionNode && (() => {
            const fFamily = getNodeFamily(floatingActionNode.type)
            const fMessageItems = Array.isArray(floatingActionNode.config.message_items)
              ? floatingActionNode.config.message_items.filter((item): item is string => typeof item === "string")
              : []
            const fMessageContents = Array.isArray(floatingActionNode.config.message_item_contents)
              ? floatingActionNode.config.message_item_contents.filter((item): item is string => typeof item === "string")
              : []
            const fMessageMediaTypes = Array.isArray(floatingActionNode.config.message_item_media_types)
              ? floatingActionNode.config.message_item_media_types.filter((item): item is string => typeof item === "string")
              : []
            return (
            <div
              className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setFloatingActionNodeId(null)}
            >
              <div
                className={`absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl ${
                  fFamily === "action" ? "max-w-[640px] max-h-[90vh] p-7" :
                  fFamily === "message" ? "max-w-2xl max-h-[85vh] p-6" :
                  "max-w-[580px] max-h-[80vh] p-6"
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const FloatingIcon = getNodeTypeIcon(floatingActionNode.type)
                      return (
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${getNodeBadgeStyle(floatingActionNode.type)}`}>
                          <FloatingIcon className="h-4 w-4" />
                        </div>
                      )
                    })()}
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900">
                        {floatingActionNode.title || NODE_TYPE_LABELS[floatingActionNode.type]}
                      </h3>
                      <p className="text-[11px] text-gray-400">{getNodeFamilyLabel(floatingActionNode.type)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    onClick={() => setFloatingActionNodeId(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  {/* ===== TRIGGER CONFIG ===== */}
                  {fFamily === "trigger" && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-gray-500">Type de déclencheur</label>
                        <select
                          className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
                          value={floatingActionNode.type}
                          onChange={(event) =>
                            updateNodeById(floatingActionNode.id, (node) => ({
                              ...node,
                              type: event.target.value as ScenarioNodeType,
                              title: NODE_TYPE_LABELS[event.target.value as ScenarioNodeType] || node.title,
                            }))
                          }
                        >
                          {TRIGGER_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {floatingActionNode.type === "trigger_incoming" && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[13px] leading-relaxed text-blue-800">
                          Ce déclencheur s&apos;active à chaque message entrant. Aucune configuration supplémentaire n&apos;est nécessaire.
                        </div>
                      )}

                      {floatingActionNode.type === "trigger_keyword" && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-gray-500">Mot-clé</label>
                            <Input
                              value={typeof floatingActionNode.config.keyword === "string" ? floatingActionNode.config.keyword : ""}
                              onChange={(event) =>
                                updateNodeById(floatingActionNode.id, (node) => ({
                                  ...node,
                                  config: { ...node.config, keyword: event.target.value },
                                }))
                              }
                              placeholder="Ex: bonjour, aide, start..."
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                            <span className="text-[13px] text-gray-700">Sensible à la casse</span>
                            <Switch
                              checked={Boolean(floatingActionNode.config.case_sensitive)}
                              onCheckedChange={(checked) =>
                                updateNodeById(floatingActionNode.id, (node) => ({
                                  ...node,
                                  config: { ...node.config, case_sensitive: checked },
                                }))
                              }
                            />
                          </div>
                        </>
                      )}

                      {floatingActionNode.type === "trigger_webhook" && (
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-medium text-gray-500">Endpoint webhook</label>
                          <div className="flex gap-1.5">
                            <Input
                              readOnly
                              value={typeof floatingActionNode.config.endpoint === "string" ? floatingActionNode.config.endpoint : `/api/webhooks/${floatingActionNode.id.slice(0, 8)}`}
                              className="h-9 flex-1 bg-gray-50 font-mono text-[12px]"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0 rounded-lg"
                              onClick={() => {
                                const endpoint = typeof floatingActionNode.config.endpoint === "string"
                                  ? floatingActionNode.config.endpoint
                                  : `/api/webhooks/${floatingActionNode.id.slice(0, 8)}`
                                navigator.clipboard.writeText(endpoint)
                                toast.success("Endpoint copié")
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* ===== CONDITION / LOGIC CONFIG ===== */}
                  {fFamily === "logic" && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-gray-200 bg-white">
                        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
                          <span className="text-[13px] font-semibold text-gray-900">Si correspond à</span>
                          <select
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px] text-gray-600"
                            value={typeof floatingActionNode.config.match_mode === "string" ? floatingActionNode.config.match_mode : "all"}
                            onChange={(event) =>
                              updateNodeById(floatingActionNode.id, (node) => ({
                                ...node,
                                config: { ...node.config, match_mode: event.target.value },
                              }))
                            }
                          >
                            <option value="all">toutes les conditions</option>
                            <option value="any">au moins une condition</option>
                          </select>
                        </div>
                        <div className="space-y-2 p-3">
                          {(() => {
                            const conditions = Array.isArray(floatingActionNode.config.conditions)
                              ? floatingActionNode.config.conditions.filter((c): c is string => typeof c === "string")
                              : []
                            return conditions.map((condStr, idx) => {
                              const parts = condStr.split("||")
                              const field = parts[0] || ""
                              const operator = parts[1] || "equals"
                              const value = parts[2] || ""
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <Input
                                    value={field}
                                    onChange={(event) => {
                                      updateNodeById(floatingActionNode.id, (node) => {
                                        const list = Array.isArray(node.config.conditions)
                                          ? [...node.config.conditions.filter((c): c is string => typeof c === "string")]
                                          : []
                                        list[idx] = `${event.target.value}||${operator}||${value}`
                                        return { ...node, config: { ...node.config, conditions: list } }
                                      })
                                    }}
                                    placeholder="Champ"
                                    className="h-9 flex-1 text-sm"
                                  />
                                  <select
                                    className="h-8 rounded-md border border-gray-200 bg-white px-2 text-[12px] text-gray-600"
                                    value={operator}
                                    onChange={(event) => {
                                      updateNodeById(floatingActionNode.id, (node) => {
                                        const list = Array.isArray(node.config.conditions)
                                          ? [...node.config.conditions.filter((c): c is string => typeof c === "string")]
                                          : []
                                        list[idx] = `${field}||${event.target.value}||${value}`
                                        return { ...node, config: { ...node.config, conditions: list } }
                                      })
                                    }}
                                  >
                                    <option value="equals">est égal à</option>
                                    <option value="not_equals">n&apos;est pas égal à</option>
                                    <option value="contains">contient</option>
                                    <option value="starts_with">commence par</option>
                                    <option value="ends_with">se termine par</option>
                                    <option value="is_empty">est vide</option>
                                    <option value="is_not_empty">n&apos;est pas vide</option>
                                  </select>
                                  {operator !== "is_empty" && operator !== "is_not_empty" && (
                                    <Input
                                      value={value}
                                      onChange={(event) => {
                                        updateNodeById(floatingActionNode.id, (node) => {
                                          const list = Array.isArray(node.config.conditions)
                                            ? [...node.config.conditions.filter((c): c is string => typeof c === "string")]
                                            : []
                                          list[idx] = `${field}||${operator}||${event.target.value}`
                                          return { ...node, config: { ...node.config, conditions: list } }
                                        })
                                      }}
                                      placeholder="Valeur"
                                      className="h-9 flex-1 text-sm"
                                    />
                                  )}
                                  <button
                                    type="button"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                                    onClick={() => {
                                      updateNodeById(floatingActionNode.id, (node) => {
                                        const list = Array.isArray(node.config.conditions)
                                          ? [...node.config.conditions.filter((c): c is string => typeof c === "string")]
                                          : []
                                        list.splice(idx, 1)
                                        return { ...node, config: { ...node.config, conditions: list } }
                                      })
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )
                            })
                          })()}
                          <button
                            type="button"
                            className="flex h-10 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-blue-500 transition-colors hover:border-blue-300 hover:bg-blue-50"
                            onClick={() =>
                              updateNodeById(floatingActionNode.id, (node) => {
                                const list = Array.isArray(node.config.conditions)
                                  ? [...node.config.conditions.filter((c): c is string => typeof c === "string")]
                                  : []
                                list.push("||equals||")
                                return { ...node, config: { ...node.config, conditions: list } }
                              })
                            }
                          >
                            + Ajouter une condition
                          </button>
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                        <p className="mb-1 text-[13px] font-semibold text-gray-900">Sinon</p>
                        <p className="text-[12px] text-gray-500">Les contacts qui ne remplissent pas les conditions suivront la branche &quot;Non&quot;.</p>
                      </div>
                    </div>
                  )}

                  {/* ===== MESSAGE CONFIG ===== */}
                  {fFamily === "message" && (
                    <div className="space-y-3">
                      {/* AI Toggle */}
                      <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                              <Bot className="h-4.5 w-4.5 text-violet-600" />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-gray-900">Activer l&apos;IA</p>
                              <p className="text-[11px] text-gray-500">Réponse automatique via l&apos;agent IA</p>
                            </div>
                          </div>
                          <Switch
                            checked={Boolean(floatingActionNode.config.ai_enabled)}
                            onCheckedChange={(checked) =>
                              updateNodeById(floatingActionNode.id, (n) => ({
                                ...n,
                                config: {
                                  ...n.config,
                                  ai_enabled: checked,
                                  ai_msg: checked ? "{{message}}" : n.config.ai_msg,
                                  ai_model: n.config.ai_model || "gpt-4o",
                                  ai_timeline: n.config.ai_timeline || "3600",
                                },
                              }))
                            }
                          />
                        </div>
                        {Boolean(floatingActionNode.config.ai_enabled) && (
                          <div className="mt-4 space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-[12px] font-medium text-violet-700">Instructions de l&apos;agent</label>
                              <Textarea
                                value={typeof floatingActionNode.config.ai_instructions === "string" ? floatingActionNode.config.ai_instructions : ""}
                                onChange={(e) => updateNodeById(floatingActionNode.id, (n) => ({ ...n, config: { ...n.config, ai_instructions: e.target.value } }))}
                                placeholder="Ex: Tu es un assistant commercial pour notre entreprise. Réponds de manière professionnelle aux questions des clients..."
                                className="min-h-[80px] border-violet-200 bg-white text-[13px] placeholder:text-gray-400 focus:border-violet-400"
                              />
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-[11px] text-violet-600">
                              <Zap className="h-3.5 w-3.5 shrink-0" />
                              Le message du client est envoyé automatiquement à l&apos;IA. La réponse sera utilisée comme contenu du message.
                            </div>
                          </div>
                        )}
                      </div>

                      {!floatingActionNode.config.ai_enabled && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800">
                        Utilisez les options ci-dessous pour construire votre message.
                      </div>
                      )}

                      {/* Message cards (hidden when AI enabled) */}
                      {!floatingActionNode.config.ai_enabled && (<>
                      <div className="space-y-2">
                        {fMessageItems.map((itemType, index) => {
                          const mediaType = fMessageMediaTypes[index] || "image"
                          return (
                            <div key={`${itemType}-${index}`} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    updateNodeById(floatingActionNode.id, (node) => {
                                      const items = Array.isArray(node.config.message_items)
                                        ? node.config.message_items.filter((item): item is string => typeof item === "string")
                                        : []
                                      const contents = Array.isArray(node.config.message_item_contents)
                                        ? node.config.message_item_contents.filter((item): item is string => typeof item === "string")
                                        : []
                                      const mediaTypes = Array.isArray(node.config.message_item_media_types)
                                        ? node.config.message_item_media_types.filter((item): item is string => typeof item === "string")
                                        : []
                                      items.splice(index, 1)
                                      contents.splice(index, 1)
                                      mediaTypes.splice(index, 1)
                                      return { ...node, config: { ...node.config, message_items: items, message_item_contents: contents, message_item_media_types: mediaTypes } }
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              {itemType === "text" ? (
                                <Textarea
                                  value={fMessageContents[index] ?? ""}
                                  onChange={(event) =>
                                    updateNodeById(floatingActionNode.id, (node) => {
                                      const contents = Array.isArray(node.config.message_item_contents)
                                        ? node.config.message_item_contents.filter((item): item is string => typeof item === "string")
                                        : []
                                      while (contents.length < fMessageItems.length) contents.push("")
                                      contents[index] = event.target.value
                                      return { ...node, config: { ...node.config, message_item_contents: contents } }
                                    })
                                  }
                                  placeholder="Saisir votre texte..."
                                  className="min-h-[100px] bg-muted/40 text-sm"
                                />
                              ) : itemType === "rich_media" ? (
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    {RICH_MEDIA_OPTIONS.map((option) => {
                                      const OptionIcon = option.icon
                                      return (
                                        <button
                                          key={option.id}
                                          type="button"
                                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${
                                            mediaType === option.id ? "bg-primary/10 text-primary" : "bg-gray-100 hover:bg-gray-200"
                                          }`}
                                          onClick={() =>
                                            updateNodeById(floatingActionNode.id, (node) => {
                                              const mediaTypes = Array.isArray(node.config.message_item_media_types)
                                                ? node.config.message_item_media_types.filter((item): item is string => typeof item === "string")
                                                : []
                                              while (mediaTypes.length < fMessageItems.length) mediaTypes.push("image")
                                              mediaTypes[index] = option.id
                                              return { ...node, config: { ...node.config, message_item_media_types: mediaTypes } }
                                            })
                                          }
                                        >
                                          <OptionIcon className="h-3.5 w-3.5" />
                                          {option.label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                  <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                                    {mediaType === "image" && "Ajoutez une image pour votre message."}
                                    {mediaType === "file" && "Ajoutez un fichier pour votre message."}
                                    {mediaType === "video" && "Ajoutez une vidéo pour votre message."}
                                    {mediaType === "location" && "Partage de localisation dans la conversation."}
                                  </div>
                                </div>
                              ) : itemType === "message_template" ? (
                                <div className="space-y-3">
                                  <div className="rounded-lg border border-dashed bg-muted/40 p-4">
                                    <p className="text-sm font-medium">Modèle de message WhatsApp</p>
                                  </div>
                                  <Input
                                    value={(() => {
                                      const values = Array.isArray(floatingActionNode.config.message_item_template_names)
                                        ? floatingActionNode.config.message_item_template_names.filter((item): item is string => typeof item === "string")
                                        : []
                                      return values[index] ?? ""
                                    })()}
                                    onChange={(event) =>
                                      updateNodeById(floatingActionNode.id, (node) => {
                                        const values = Array.isArray(node.config.message_item_template_names)
                                          ? node.config.message_item_template_names.filter((item): item is string => typeof item === "string")
                                          : []
                                        while (values.length < fMessageItems.length) values.push("")
                                        values[index] = event.target.value
                                        return { ...node, config: { ...node.config, message_item_template_names: values } }
                                      })
                                    }
                                    placeholder="Nom du template"
                                  />
                                </div>
                              ) : (
                                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                                  Option non prise en charge.
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Add message component buttons */}
                      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-gray-50 p-2.5">
                        {MESSAGE_COMPONENT_OPTIONS.map((option) => {
                          const OptionIcon = option.icon
                          return (
                            <button
                              key={option.id}
                              type="button"
                              className="relative flex min-h-[52px] flex-col items-start justify-center rounded-lg border border-dashed px-3 py-2.5 text-[13px] bg-white transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted"
                              onClick={() =>
                                updateNodeById(floatingActionNode.id, (node) => {
                                  const items = Array.isArray(node.config.message_items) ? node.config.message_items.filter((item): item is string => typeof item === "string") : []
                                  const contents = Array.isArray(node.config.message_item_contents) ? node.config.message_item_contents.filter((item): item is string => typeof item === "string") : []
                                  const mediaTypes = Array.isArray(node.config.message_item_media_types) ? node.config.message_item_media_types.filter((item): item is string => typeof item === "string") : []
                                  items.push(option.id)
                                  contents.push("")
                                  mediaTypes.push("image")
                                  return { ...node, config: { ...node.config, message_items: items, message_item_contents: contents, message_item_media_types: mediaTypes } }
                                })
                              }
                            >
                              <OptionIcon className="mb-1.5 h-4 w-4 text-muted-foreground" />
                              {option.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* Quick Replies */}
                      {floatingActionNode.type === "message_quick_reply" && (
                        <div className="space-y-2.5 rounded-lg border bg-white p-3">
                          <p className="text-[13px] font-semibold text-gray-900">Réponses rapides</p>
                          {(() => {
                            const quickReplies = Array.isArray(floatingActionNode.config.quickReplies)
                              ? floatingActionNode.config.quickReplies.filter((r): r is string => typeof r === "string")
                              : []
                            return quickReplies.map((reply, idx) => (
                              <div key={idx} className="flex items-center gap-2.5">
                                <Input
                                  value={reply}
                                  onChange={(event) =>
                                    updateNodeById(floatingActionNode.id, (node) => {
                                      const list = Array.isArray(node.config.quickReplies)
                                        ? [...node.config.quickReplies.filter((r): r is string => typeof r === "string")]
                                        : []
                                      list[idx] = event.target.value
                                      return { ...node, config: { ...node.config, quickReplies: list } }
                                    })
                                  }
                                  placeholder={`Réponse ${idx + 1}`}
                                  className="h-9 text-sm"
                                />
                                <button
                                  type="button"
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                                  onClick={() =>
                                    updateNodeById(floatingActionNode.id, (node) => {
                                      const list = Array.isArray(node.config.quickReplies)
                                        ? [...node.config.quickReplies.filter((r): r is string => typeof r === "string")]
                                        : []
                                      list.splice(idx, 1)
                                      return { ...node, config: { ...node.config, quickReplies: list } }
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          })()}
                          <button
                            type="button"
                            className="flex h-10 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-emerald-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                            onClick={() =>
                              updateNodeById(floatingActionNode.id, (node) => {
                                const list = Array.isArray(node.config.quickReplies)
                                  ? [...node.config.quickReplies.filter((r): r is string => typeof r === "string")]
                                  : []
                                list.push("")
                                return { ...node, config: { ...node.config, quickReplies: list } }
                              })
                            }
                          >
                            + Ajouter une réponse rapide
                          </button>
                        </div>
                      )}
                      </>)}
                    </div>
                  )}

                  {/* ===== ACTION CONFIG (Agent IA) ===== */}
                  {fFamily === "action" && (
                    <div className="space-y-5">
                      {/* AI Agent banner */}
                      <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                            <Bot className="h-5 w-5 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-[14px] font-semibold text-gray-900">Agent IA</p>
                            <p className="text-[12px] text-gray-500">Génère une réponse intelligente via l&apos;IA pour répondre automatiquement aux messages.</p>
                          </div>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-gray-700">Instructions de l&apos;agent</label>
                        <p className="text-[11px] leading-relaxed text-gray-400">Décrivez le comportement de l&apos;IA : ton, rôle, informations à donner, limites, etc.</p>
                        <Textarea
                          value={typeof floatingActionNode.config.ai_instructions === "string" ? floatingActionNode.config.ai_instructions : ""}
                          onChange={(e) => updateNodeById(floatingActionNode.id, (n) => ({ ...n, config: { ...n.config, ai_instructions: e.target.value } }))}
                          placeholder="Ex: Tu es un assistant commercial pour notre entreprise. Réponds de manière professionnelle et concise aux questions des clients sur nos produits et services..."
                          className="min-h-[120px] rounded-lg border-gray-200 text-[13px] leading-relaxed placeholder:text-gray-400"
                        />
                      </div>

                      {/* Message template */}
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-gray-700">Message à envoyer à l&apos;IA</label>
                        <p className="text-[11px] leading-relaxed text-gray-400">Utilisez <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-violet-600">{"{{message}}"}</code> pour insérer le message du client.</p>
                        <Input
                          value={typeof floatingActionNode.config.ai_msg === "string" ? floatingActionNode.config.ai_msg : "{{message}}"}
                          onChange={(e) => updateNodeById(floatingActionNode.id, (n) => ({ ...n, config: { ...n.config, ai_msg: e.target.value } }))}
                          placeholder="{{message}}"
                          className="h-10 rounded-lg text-[13px] font-mono"
                        />
                      </div>

                      {/* Response info */}
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Réponse attendue</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-[12px]">
                            <span className="font-mono text-violet-600">inference</span>
                            <span className="text-gray-400">Texte de la réponse IA</span>
                          </div>
                          <div className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-[12px]">
                            <span className="font-mono text-violet-600">credits</span>
                            <span className="text-gray-400">Crédits consommés</span>
                          </div>
                        </div>
                        <p className="mt-2.5 text-[11px] leading-relaxed text-gray-400">
                          Le champ <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px] text-violet-600">inference</code> sera utilisé comme contenu de la réponse envoyée au client.
                        </p>
                      </div>

                      {/* Model config (collapsed) */}
                      <details className="group rounded-lg border border-gray-200">
                        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
                          Configuration avancée
                          <svg className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="space-y-3 border-t border-gray-100 p-4">
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-gray-500">Modèle</label>
                            <select
                              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
                              value={typeof floatingActionNode.config.ai_model === "string" ? floatingActionNode.config.ai_model : "gpt-4o"}
                              onChange={(e) => updateNodeById(floatingActionNode.id, (n) => ({ ...n, config: { ...n.config, ai_model: e.target.value } }))}
                            >
                              <option value="gpt-5-mini">GPT-5 Mini</option>
                              <option value="gpt-5-nano">GPT-5 Nano</option>
                              <option value="o4-mini">o4 Mini</option>
                              <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                              <option value="gpt-4o-mini">GPT-4o Mini</option>
                              <option value="gpt-4o">GPT-4o</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-gray-500">Session ID</label>
                            <Input
                              value={typeof floatingActionNode.config.ai_session_id === "string" ? floatingActionNode.config.ai_session_id : ""}
                              onChange={(e) => updateNodeById(floatingActionNode.id, (n) => ({ ...n, config: { ...n.config, ai_session_id: e.target.value } }))}
                              placeholder="Auto-généré si vide (contact_id)"
                              className="h-9 text-[12px] font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-gray-500">Durée session (sec)</label>
                            <Input
                              type="number"
                              value={typeof floatingActionNode.config.ai_timeline === "string" ? floatingActionNode.config.ai_timeline : "3600"}
                              onChange={(e) => updateNodeById(floatingActionNode.id, (n) => ({ ...n, config: { ...n.config, ai_timeline: e.target.value } }))}
                              placeholder="3600"
                              className="h-9 text-[12px]"
                            />
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )
          })()}


          {isButtonModalOpen && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold">Configurer le bouton</h3>
                  <button
                    type="button"
                    className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    onClick={() => setIsButtonModalOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium">Titre du bouton</label>
                    <Input
                      className="h-9 text-[13px]"
                      value={messageButtonDraft.label}
                      onChange={(event) =>
                        setMessageButtonDraft((prev) => ({
                          ...prev,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Ex: Continuer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium">Quand ce bouton est pressé</label>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between rounded-lg border border-border/40 px-3 text-[13px] hover:bg-muted"
                      onClick={() => setIsNextStepModalOpen(true)}
                    >
                      <span>{messageButtonDraft.nextStepLabel || "Sélectionner l'étape suivante"}</span>
                      <Ellipsis className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  {messageButtonDraft.nextStepId === "open_website" && (
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium">URL du website</label>
                      <Input
                        className="h-9 text-[13px]"
                        value={messageButtonDraft.websiteUrl}
                        onChange={(event) =>
                          setMessageButtonDraft((prev) => ({
                            ...prev,
                            websiteUrl: event.target.value,
                          }))
                        }
                        placeholder="https://example.com"
                      />
                    </div>
                  )}
                  <div className="flex justify-end pt-1">
                    <Button size="sm" className="h-9 text-[13px] rounded-lg" onClick={saveMessageButtonDraft}>Enregistrer</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isNextStepModalOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-4">
              <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
                  <h3 className="text-base font-semibold">Sélectionner l&apos;étape suivante</h3>
                  <button
                    type="button"
                    className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    onClick={() => setIsNextStepModalOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-5 overflow-y-auto p-5">
                  <div className="space-y-3">
                    <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Nouvelle étape</p>
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                      {NEXT_STEP_OPTIONS.map((option) => {
                        const OptionIcon = option.icon
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className="group flex items-center gap-2.5 rounded-xl border border-dashed px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/[0.04]"
                            onClick={() => {
                              setMessageButtonDraft((prev) => ({
                                ...prev,
                                nextStepLabel: option.label,
                                nextStepId: option.id,
                                targetNodeId: null,
                              }))
                              setIsNextStepModalOpen(false)
                            }}
                          >
                            <span className={`rounded-lg p-2 transition-transform group-hover:scale-105 ${option.tone}`}>
                              <OptionIcon className="h-4 w-4" />
                            </span>
                            <span className="text-[13px] font-medium">{option.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Étapes existantes</p>
                      <div className="relative w-56 max-w-full">
                        <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={existingStepQuery}
                          onChange={(event) => setExistingStepQuery(event.target.value)}
                          placeholder="Rechercher..."
                          className="h-8 pl-8 text-[12px]"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/40 p-2">
                      {existingSteps.length === 0 ? (
                        <p className="px-2 py-2 text-[12px] text-muted-foreground">Aucune étape trouvée.</p>
                      ) : (
                        existingSteps.map((step) => (
                          <button
                            key={step.id}
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-accent/50 transition-colors"
                            onClick={() => {
                              setMessageButtonDraft((prev) => ({
                                ...prev,
                                nextStepLabel: step.title,
                                nextStepId: "existing_step",
                                targetNodeId: step.id,
                              }))
                              setIsNextStepModalOpen(false)
                            }}
                          >
                            {step.title}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
