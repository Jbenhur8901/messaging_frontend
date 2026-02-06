"use client"

import { Badge } from "@/components/ui/badge"
import type { WhatsAppTemplateStatus, WhatsAppTemplateCategory, WhatsAppMessageStatus, WhatsAppBroadcastStatus } from "@/types"

// Template Status Badge
const TEMPLATE_STATUS_LABELS: Record<WhatsAppTemplateStatus, string> = {
  APPROVED: "Approuvé",
  PENDING: "En attente",
  REJECTED: "Rejeté",
}

const TEMPLATE_STATUS_VARIANTS: Record<WhatsAppTemplateStatus, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
}

interface TemplateStatusBadgeProps {
  status: WhatsAppTemplateStatus
}

export function TemplateStatusBadge({ status }: TemplateStatusBadgeProps) {
  return (
    <Badge variant={TEMPLATE_STATUS_VARIANTS[status]}>
      {TEMPLATE_STATUS_LABELS[status]}
    </Badge>
  )
}

// Template Category Badge
const CATEGORY_LABELS: Record<WhatsAppTemplateCategory, string> = {
  UTILITY: "Utilitaire",
  MARKETING: "Marketing",
  AUTHENTICATION: "Authentification",
}

const CATEGORY_VARIANTS: Record<WhatsAppTemplateCategory, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  UTILITY: "secondary",
  MARKETING: "default",
  AUTHENTICATION: "outline",
}

interface CategoryBadgeProps {
  category: WhatsAppTemplateCategory
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <Badge variant={CATEGORY_VARIANTS[category]}>
      {CATEGORY_LABELS[category]}
    </Badge>
  )
}

// Message Status Badge
const MESSAGE_STATUS_LABELS: Record<WhatsAppMessageStatus, string> = {
  queued: "En file",
  sent: "Envoyé",
  delivered: "Livré",
  read: "Lu",
  failed: "Échoué",
}

const MESSAGE_STATUS_VARIANTS: Record<WhatsAppMessageStatus, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  queued: "secondary",
  sent: "warning",
  delivered: "success",
  read: "success",
  failed: "destructive",
}

interface MessageStatusBadgeProps {
  status: WhatsAppMessageStatus
}

export function MessageStatusBadge({ status }: MessageStatusBadgeProps) {
  return (
    <Badge variant={MESSAGE_STATUS_VARIANTS[status]}>
      {MESSAGE_STATUS_LABELS[status]}
    </Badge>
  )
}

// Broadcast Status Badge
const BROADCAST_STATUS_LABELS: Record<WhatsAppBroadcastStatus, string> = {
  pending: "En attente",
  processing: "En cours",
  completed: "Terminé",
  failed: "Échoué",
  cancelled: "Annulé",
}

const BROADCAST_STATUS_VARIANTS: Record<WhatsAppBroadcastStatus, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  pending: "secondary",
  processing: "warning",
  completed: "success",
  failed: "destructive",
  cancelled: "default",
}

interface BroadcastStatusBadgeProps {
  status: WhatsAppBroadcastStatus
}

export function BroadcastStatusBadge({ status }: BroadcastStatusBadgeProps) {
  return (
    <Badge variant={BROADCAST_STATUS_VARIANTS[status]}>
      {BROADCAST_STATUS_LABELS[status]}
    </Badge>
  )
}
