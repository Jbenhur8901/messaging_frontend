import type {
  ConversationScenario,
  ScenarioEdge,
  ScenarioFlow,
  ScenarioNode,
  ScenarioNodeType,
  ScenarioStatus,
} from "@/types"

const STORAGE_KEY = "flow-scenarios-v1"

const isBrowser = () => typeof window !== "undefined"

const nowIso = () => new Date().toISOString()

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 11)
}

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const nodeDefaults = (type: ScenarioNodeType): Pick<ScenarioNode, "title" | "description" | "config"> => {
  switch (type) {
    case "trigger_keyword":
      return { title: "Déclencheur mot-clé", description: "Démarre sur mot-clé", config: { keyword: "bonjour" } }
    case "trigger_webhook":
      return { title: "Déclencheur webhook", description: "Déclenché par webhook", config: { endpoint: "/webhooks/scenario" } }
    case "trigger_event":
      return { title: "Déclencheur événement", description: "Déclenché par événement", config: { event: "contact.created" } }
    case "trigger_schedule":
      return { title: "Déclencheur planifié", description: "Date/heure planifiée", config: { cron: "0 9 * * *" } }
    case "message_image":
      return { title: "Message image", description: "Envoi image WhatsApp", config: { mediaUrl: "", caption: "" } }
    case "message_audio":
      return { title: "Message audio", description: "Envoi audio WhatsApp", config: { mediaUrl: "" } }
    case "message_video":
      return { title: "Message vidéo", description: "Envoi vidéo WhatsApp", config: { mediaUrl: "", caption: "" } }
    case "message_document":
      return { title: "Message document", description: "Envoi fichier", config: { mediaUrl: "", fileName: "" } }
    case "message_buttons":
      return { title: "Message boutons", description: "Boutons interactifs", config: { content: "", buttons: ["Oui", "Non"] } }
    case "message_quick_reply":
      return { title: "Réponses rapides", description: "Choix utilisateur", config: { content: "", quickReplies: ["Option A", "Option B"] } }
    case "message_template":
      return { title: "Message template", description: "Template WhatsApp approuvé", config: { templateName: "", language: "fr" } }
    case "condition_if":
      return { title: "Condition IF/ELSE", description: "Branche conditionnelle", config: { expression: "contact.tags contains vip" } }
    case "action_wait":
      return { title: "Attendre", description: "Attente avant action", config: { delayMinutes: 5 } }
    case "action_tag":
      return { title: "Attribuer tag", description: "Ajoute un tag utilisateur", config: { tag: "lead_chaud" } }
    case "action_update_field":
      return { title: "Mettre à jour champ", description: "Met à jour profil contact", config: { field: "stage", value: "qualified" } }
    case "action_api_call":
      return { title: "Appel API externe", description: "HTTP request sortante", config: { method: "POST", url: "" } }
    case "action_redirect_scenario":
      return { title: "Rediriger scénario", description: "Transfert vers un autre flow", config: { targetScenarioId: "" } }
    case "action_assign_agent":
      return { title: "Assigner agent", description: "Passage à un humain", config: { queue: "support_n1" } }
    case "end":
      return { title: "Fin", description: "Fin du parcours", config: {} }
    case "trigger_incoming":
      return { title: "Déclencheur entrant", description: "Déclenché à réception", config: {} }
    case "message_text":
    default:
      return { title: "Message texte", description: "Envoi texte WhatsApp", config: { content: "Bonjour, comment puis-je vous aider ?" } }
  }
}

const createNode = (
  type: ScenarioNodeType,
  x: number,
  y: number
): ScenarioNode => {
  const defaults = nodeDefaults(type)
  return {
    id: createId(),
    type,
    title: defaults.title,
    description: defaults.description,
    position: { x, y },
    config: defaults.config,
  }
}

const createSeedScenarios = (): ConversationScenario[] => {
  const triggerNode = createNode("trigger_keyword", 120, 140)
  const welcomeNode = createNode("message_text", 430, 120)
  const branchNode = createNode("condition_if", 760, 120)
  const offerNode = createNode("message_template", 1090, 60)
  const agentNode = createNode("action_assign_agent", 1090, 210)
  const endNode = createNode("end", 1380, 140)

  welcomeNode.title = "Message de bienvenue"
  welcomeNode.config.content = "Bienvenue sur notre canal WhatsApp."
  branchNode.config.expression = "contact.tags contains client"
  offerNode.config.templateName = "offre_personnalisee"

  const edges: ScenarioEdge[] = [
    { id: createId(), source: triggerNode.id, target: welcomeNode.id },
    { id: createId(), source: welcomeNode.id, target: branchNode.id },
    { id: createId(), source: branchNode.id, target: offerNode.id, label: "Oui" },
    { id: createId(), source: branchNode.id, target: agentNode.id, label: "Non" },
    { id: createId(), source: offerNode.id, target: endNode.id },
    { id: createId(), source: agentNode.id, target: endNode.id },
  ]

  const flow: ScenarioFlow = {
    nodes: [triggerNode, welcomeNode, branchNode, offerNode, agentNode, endNode],
    edges,
    viewport: {
      zoom: 1,
      panX: 0,
      panY: 0,
    },
  }

  const now = nowIso()
  const seed: ConversationScenario = {
    id: createId(),
    name: "Qualification automatique WhatsApp",
    description: "Qualification des leads et routage vers un agent.",
    status: "active",
    channel: "whatsapp",
    is_main: true,
    created_at: now,
    updated_at: now,
    published_at: now,
    flow,
    global_variables: [
      { id: createId(), key: "company_name", value: "Flow" },
      { id: createId(), key: "support_phone", value: "+33XXXXXXXXX" },
    ],
    stats: {
      trigger_count: 128,
      total_messages_sent: 512,
      completion_rate: 74,
      last_triggered_at: now,
    },
    versions: [
      {
        id: createId(),
        created_at: now,
        note: "Version initiale",
        status: "active",
        flow: deepClone(flow),
      },
    ],
  }

  return [seed]
}

let memoryScenarios: ConversationScenario[] = createSeedScenarios()

const readScenarios = (): ConversationScenario[] => {
  if (!isBrowser()) return memoryScenarios
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryScenarios))
    return deepClone(memoryScenarios)
  }
  try {
    const parsed = JSON.parse(raw) as ConversationScenario[]
    if (!Array.isArray(parsed)) return deepClone(memoryScenarios)
    memoryScenarios = parsed
    return deepClone(parsed)
  } catch {
    return deepClone(memoryScenarios)
  }
}

const writeScenarios = (scenarios: ConversationScenario[]) => {
  memoryScenarios = deepClone(scenarios)
  if (!isBrowser()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
}

const updateScenarioInCollection = (
  scenarioId: string,
  updater: (scenario: ConversationScenario) => ConversationScenario
): ConversationScenario => {
  const scenarios = readScenarios()
  const index = scenarios.findIndex((item) => item.id === scenarioId)
  if (index === -1) throw new Error("Scénario introuvable")
  const updated = updater(scenarios[index])
  scenarios[index] = updated
  writeScenarios(scenarios)
  return deepClone(updated)
}

const getNodeById = (flow: ScenarioFlow, nodeId: string) => flow.nodes.find((node) => node.id === nodeId)

const validateScenarioFlow = (flow: ScenarioFlow): string[] => {
  const errors: string[] = []
  const triggerNodes = flow.nodes.filter((node) => node.type.startsWith("trigger_"))
  if (triggerNodes.length === 0) {
    errors.push("Ajoute au moins un bloc déclencheur.")
  }
  const messageNodes = flow.nodes.filter((node) => node.type.startsWith("message_"))
  if (messageNodes.length === 0) {
    errors.push("Ajoute au moins un bloc message.")
  }
  if (flow.nodes.length > 1 && flow.edges.length === 0) {
    errors.push("Relie les blocs entre eux avec au moins une connexion.")
  }
  const sourceSet = new Set(flow.nodes.map((node) => node.id))
  for (const edge of flow.edges) {
    if (!sourceSet.has(edge.source) || !sourceSet.has(edge.target)) {
      errors.push("Certaines connexions pointent vers des blocs supprimés.")
      break
    }
  }
  for (const node of flow.nodes) {
    if (node.type === "condition_if") {
      const outgoing = flow.edges.filter((edge) => edge.source === node.id)
      if (outgoing.length < 2) {
        errors.push(`Le bloc condition "${node.title}" doit avoir au moins deux sorties.`)
      }
    }
  }
  return errors
}

export const scenariosService = {
  validateScenarioFlow,

  async listScenarios(filters?: {
    search?: string
    status?: ScenarioStatus | "all"
  }): Promise<ConversationScenario[]> {
    const scenarios = readScenarios()
    const searchValue = filters?.search?.trim().toLowerCase()
    return scenarios
      .filter((scenario) => {
        if (filters?.status && filters.status !== "all" && scenario.status !== filters.status) {
          return false
        }
        if (!searchValue) return true
        return (
          scenario.name.toLowerCase().includes(searchValue) ||
          scenario.description.toLowerCase().includes(searchValue)
        )
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },

  async getScenarioById(scenarioId: string): Promise<ConversationScenario> {
    const scenario = readScenarios().find((item) => item.id === scenarioId)
    if (!scenario) throw new Error("Scénario introuvable")
    return deepClone(scenario)
  },

  async createScenario(input: {
    name: string
    description: string
    channel?: "whatsapp"
  }): Promise<ConversationScenario> {
    const now = nowIso()
    const triggerNode = createNode("trigger_incoming", 120, 130)
    const textNode = createNode("message_text", 440, 130)
    const endNode = createNode("end", 760, 130)
    const flow: ScenarioFlow = {
      nodes: [triggerNode, textNode, endNode],
      edges: [
        { id: createId(), source: triggerNode.id, target: textNode.id },
        { id: createId(), source: textNode.id, target: endNode.id },
      ],
      viewport: {
        zoom: 1,
        panX: 0,
        panY: 0,
      },
    }
    const scenario: ConversationScenario = {
      id: createId(),
      name: input.name.trim(),
      description: input.description.trim(),
      status: "draft",
      channel: input.channel ?? "whatsapp",
      is_main: false,
      created_at: now,
      updated_at: now,
      published_at: null,
      flow,
      global_variables: [],
      stats: {
        trigger_count: 0,
        total_messages_sent: 0,
        completion_rate: 0,
        last_triggered_at: null,
      },
      versions: [
        {
          id: createId(),
          created_at: now,
          note: "Création du scénario",
          status: "draft",
          flow: deepClone(flow),
        },
      ],
    }
    const scenarios = readScenarios()
    scenarios.push(scenario)
    writeScenarios(scenarios)
    return deepClone(scenario)
  },

  async updateScenario(
    scenarioId: string,
    updates: Partial<Pick<ConversationScenario, "name" | "description" | "status" | "flow" | "global_variables" | "stats">>
  ): Promise<ConversationScenario> {
    return updateScenarioInCollection(scenarioId, (scenario) => ({
      ...scenario,
      ...updates,
      updated_at: nowIso(),
    }))
  },

  async duplicateScenario(scenarioId: string): Promise<ConversationScenario> {
    const scenarios = readScenarios()
    const scenario = scenarios.find((item) => item.id === scenarioId)
    if (!scenario) throw new Error("Scénario introuvable")
    const now = nowIso()
    const duplicate: ConversationScenario = {
      ...deepClone(scenario),
      id: createId(),
      name: `${scenario.name} (copie)`,
      status: "draft",
      created_at: now,
      updated_at: now,
      published_at: null,
      versions: [
        {
          id: createId(),
          created_at: now,
          note: "Duplication",
          status: "draft",
          flow: deepClone(scenario.flow),
        },
      ],
      stats: {
        trigger_count: 0,
        total_messages_sent: 0,
        completion_rate: 0,
        last_triggered_at: null,
      },
    }
    scenarios.push(duplicate)
    writeScenarios(scenarios)
    return deepClone(duplicate)
  },

  async deleteScenario(scenarioId: string): Promise<void> {
    const scenarios = readScenarios().filter((item) => item.id !== scenarioId)
    writeScenarios(scenarios)
  },

  async toggleScenarioActive(scenarioId: string, active: boolean): Promise<ConversationScenario> {
    return updateScenarioInCollection(scenarioId, (scenario) => ({
      ...scenario,
      status: active ? "active" : "inactive",
      published_at: active ? nowIso() : scenario.published_at,
      updated_at: nowIso(),
    }))
  },

  async addVersion(scenarioId: string, note: string): Promise<ConversationScenario> {
    return updateScenarioInCollection(scenarioId, (scenario) => ({
      ...scenario,
      updated_at: nowIso(),
      versions: [
        {
          id: createId(),
          created_at: nowIso(),
          note,
          status: scenario.status,
          flow: deepClone(scenario.flow),
        },
        ...scenario.versions,
      ].slice(0, 30),
    }))
  },

  async publishScenario(scenarioId: string): Promise<ConversationScenario> {
    return updateScenarioInCollection(scenarioId, (scenario) => {
      const errors = validateScenarioFlow(scenario.flow)
      if (errors.length > 0) {
        throw new Error(errors[0])
      }
      return {
        ...scenario,
        status: "active",
        published_at: nowIso(),
        updated_at: nowIso(),
        versions: [
          {
            id: createId(),
            created_at: nowIso(),
            note: "Publication",
            status: "active" as const,
            flow: deepClone(scenario.flow),
          },
          ...scenario.versions,
        ].slice(0, 30),
      }
    })
  },

  async recordTrigger(scenarioId: string): Promise<ConversationScenario> {
    return updateScenarioInCollection(scenarioId, (scenario) => ({
      ...scenario,
      stats: {
        ...scenario.stats,
        trigger_count: scenario.stats.trigger_count + 1,
        last_triggered_at: nowIso(),
      },
      updated_at: nowIso(),
    }))
  },

  async addNode(
    scenarioId: string,
    type: ScenarioNodeType,
    x: number,
    y: number
  ): Promise<ConversationScenario> {
    return updateScenarioInCollection(scenarioId, (scenario) => ({
      ...scenario,
      flow: {
        ...scenario.flow,
        nodes: [...scenario.flow.nodes, createNode(type, x, y)],
      },
      updated_at: nowIso(),
    }))
  },

  async removeNode(scenarioId: string, nodeId: string): Promise<ConversationScenario> {
    return updateScenarioInCollection(scenarioId, (scenario) => ({
      ...scenario,
      flow: {
        ...scenario.flow,
        nodes: scenario.flow.nodes.filter((node) => node.id !== nodeId),
        edges: scenario.flow.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      },
      updated_at: nowIso(),
    }))
  },

  async connectNodes(
    scenarioId: string,
    sourceId: string,
    targetId: string,
    label?: string
  ): Promise<ConversationScenario> {
    return updateScenarioInCollection(scenarioId, (scenario) => {
      const source = getNodeById(scenario.flow, sourceId)
      const target = getNodeById(scenario.flow, targetId)
      if (!source || !target) return scenario
      const exists = scenario.flow.edges.some((edge) => edge.source === sourceId && edge.target === targetId)
      if (exists) return scenario
      return {
        ...scenario,
        flow: {
          ...scenario.flow,
          edges: [...scenario.flow.edges, { id: createId(), source: sourceId, target: targetId, label }],
        },
        updated_at: nowIso(),
      }
    })
  },
}
