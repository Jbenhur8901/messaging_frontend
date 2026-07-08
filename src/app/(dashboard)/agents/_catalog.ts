export interface AgentItem {
  id: string
  category: string
  categoryClass: string
  label: string
  description: string
  defaultInstructions: string
  capabilities: string[]
  totalTools: number
  emoji: string
  accentClass: string
}

export const AGENT_CATALOG: AgentItem[] = [
  {
    id: "jarvis",
    category: "ASSISTANT",
    categoryClass: "text-sky-400",
    label: "Jarvis",
    description: "Agent IA universel. Répond à toutes vos questions, automatise vos tâches et s'adapte à chaque contexte métier.",
    defaultInstructions: "Tu es Jarvis, un agent IA avancé. Tu aides l'utilisateur avec toutes ses demandes de manière précise et efficace.",
    capabilities: ["Fiche client", "Recherche dans les fichiers", "Envoi de documents WhatsApp"],
    totalTools: 3,
    emoji: "🤖",
    accentClass: "border-l-sky-500/70",
  },
  {
    id: "assistant-personnel",
    category: "ASSISTANT",
    categoryClass: "text-[#FFCC00]",
    label: "Assistant personnel",
    description: "Agent polyvalent pour la recherche, la synthèse, les rappels de contexte et l'aide conversationnelle générale.",
    defaultInstructions: `Tu es X, l'agent commercial IA de Nodes Technology – une startup congolaise spécialisée en intelligence artificielle, automatisation et transformation digitale, fondée en novembre 2023.\n\nTu opères directement sur WhatsApp. Tu as accès aux outils de ce canal pour enregistrer des informations sur les clients, consulter leurs fiches et mettre à jour leurs données.`,
    capabilities: ["Réponse Texte", "Mémoire Conversation", "Outils Métier", "Recherche Web"],
    totalTools: 24,
    emoji: "🧑‍💼",
    accentClass: "border-l-[#FFCC00]/70",
  },
  {
    id: "agent-livraison",
    category: "LIVRAISON",
    categoryClass: "text-amber-400",
    label: "Agent Livraison",
    description: "Suivi de livraison, vérification des zones, coordination client et assistance autour de la distribution.",
    defaultInstructions: "Tu es l'agent de livraison. Tu aides les clients à suivre leurs commandes, vérifier les délais et résoudre les problèmes logistiques.",
    capabilities: ["Réponse Texte", "Mémoire Conversation", "Outils Métier"],
    totalTools: 18,
    emoji: "🚚",
    accentClass: "border-l-amber-500/70",
  },
  {
    id: "agent-ecommerce",
    category: "E-COMMERCE",
    categoryClass: "text-rose-400",
    label: "Agent E-commerce",
    description: "Gestion des commandes, suivi de livraison, recommandations produits et support client automatisé pour les activités e-commerce.",
    defaultInstructions: "Tu es l'agent e-commerce. Tu aides les clients avec leurs commandes, recommandes des produits pertinents et assures le support après-vente.",
    capabilities: ["Réponse Texte", "Mémoire Conversation", "Outils Métier"],
    totalTools: 20,
    emoji: "🛒",
    accentClass: "border-l-rose-500/70",
  },
  {
    id: "agent-hotellerie",
    category: "HÔTELLERIE",
    categoryClass: "text-sky-400",
    label: "Agent Hotellerie",
    description: "Réservations, check-in, check-out et informations clients pour les établissements hôteliers.",
    defaultInstructions: "Tu es l'agent hôtelier. Tu gères les réservations et informes les clients des disponibilités et services.",
    capabilities: ["Réponse Texte", "Mémoire Conversation", "Outils Métier"],
    totalTools: 16,
    emoji: "🏨",
    accentClass: "border-l-sky-500/70",
  },
  {
    id: "agent-restauration",
    category: "RESTAURATION",
    categoryClass: "text-emerald-400",
    label: "Agent Restauration",
    description: "Tu es Yannick, l'assistant virtuel du restaurant Africafé. Tu accueilles chaleureusement les clients, présentes le menu et gères les réservations.",
    defaultInstructions: "Tu es Yannick, l'assistant virtuel du restaurant Africafé. Tu accueilles chaleureusement les clients, présentes le menu du jour et prends les réservations.",
    capabilities: ["Réponse Texte", "Mémoire Conversation", "Outils Métier"],
    totalTools: 15,
    emoji: "🍽️",
    accentClass: "border-l-emerald-500/70",
  },
]

export interface ToolItem {
  code: string
  label: string
  description: string
  required?: boolean
  obligatoire?: boolean
}

export const TOOLS_CATALOG: ToolItem[] = [
  { code: "get_customer_profile", label: "Fiche client",                    description: "Retrouve le profil client, son historique récent et les champs utiles pour la conversation.", required: true, obligatoire: true },
  { code: "file_search",         label: "Recherche dans les fichiers",     description: "Recherche dans les fichiers reliés au workspace ou aux vector stores pour retrouver des informations pertinentes." },
  { code: "send_document",       label: "Envoi de documents WhatsApp",     description: "Envoie des documents (PDF, images, fichiers) directement dans la conversation WhatsApp du client." },
  { code: "generate_pdf_quote",  label: "Génération de devis PDF",        description: "Génère un devis PDF personnalisé à partir des informations collectées dans la conversation, et l'envoie automatiquement au client via WhatsApp." },
]

// Optional tools enabled by default (required ones are always on)
export const DEFAULT_ENABLED_TOOLS = ["file_search", "send_document"]
