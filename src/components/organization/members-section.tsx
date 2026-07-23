"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Copy, Link2, Lock, Mail, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"

import { usePlan } from "@/hooks"
import { useOrganizationStore } from "@/stores"
import type { OrganizationRole } from "@/types"
import {
  canInviteMoreMembers,
  countInvitableMembers,
  PRO_MEMBER_LIMIT,
  remainingMemberSlots,
} from "@/lib/plan-limits"
import { ProBadge } from "@/components/ui/pro-gate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const roleLabels: Record<OrganizationRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
}

export function OrganizationMembersSection() {
  const { isPro } = usePlan()
  const { members, fetchMembers, inviteMember, isLoading } = useOrganizationStore()

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("member")
  const [isInviting, setIsInviting] = useState(false)
  const [isInviteLinkOpen, setIsInviteLinkOpen] = useState(false)
  const [generatedInviteLink, setGeneratedInviteLink] = useState("")
  const [generatedInviteEmail, setGeneratedInviteEmail] = useState("")

  const invitedCount = countInvitableMembers(members)
  const slotsLeft = remainingMemberSlots(members)
  const canInvite = canInviteMoreMembers(members)

  useEffect(() => {
    if (isPro) {
      void fetchMembers()
    }
  }, [fetchMembers, isPro])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("L'email est requis")
      return
    }

    if (!canInvite) {
      toast.error(`Limite atteinte : ${PRO_MEMBER_LIMIT} membres maximum sur le plan Pro`)
      return
    }

    setIsInviting(true)
    try {
      const invitation = await inviteMember(inviteEmail.trim(), inviteRole)
      const invitationLink = invitation.invitation_url || ""

      setGeneratedInviteLink(invitationLink)
      setGeneratedInviteEmail(inviteEmail.trim())
      toast.success(
        invitationLink
          ? "Lien d'invitation généré"
          : "Invitation créée, mais aucun lien n'a été renvoyé par le backend",
      )
      setIsInviteOpen(false)
      setIsInviteLinkOpen(Boolean(invitationLink))
      setInviteEmail("")
      setInviteRole("member")
    } catch {
      // Error handled by store
    } finally {
      setIsInviting(false)
    }
  }

  const handleCopyInviteLink = async () => {
    if (!generatedInviteLink) return
    try {
      await navigator.clipboard.writeText(generatedInviteLink)
      toast.success("Lien copié")
      setIsInviteLinkOpen(false)
    } catch {
      toast.error("Impossible de copier le lien")
    }
  }

  if (!isPro) {
    return (
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Membres
          </h2>
          <ProBadge />
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/70 bg-background/60 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-[13px] font-medium">
              Invitez jusqu&apos;à {PRO_MEMBER_LIMIT} membres dans votre équipe
            </p>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Ajoutez des collaborateurs avec des rôles adaptés (administrateur, membre,
              lecteur). Disponible uniquement avec l&apos;abonnement Pro.
            </p>
            <Button asChild size="sm" className="h-8 rounded-lg text-[12px]">
              <Link href="/whatsapp/credits?section=abonnement">Passer à Pro</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Membres
          </h2>
          <Badge variant="secondary" className="h-5 text-[10px]">
            {invitedCount}/{PRO_MEMBER_LIMIT}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-[12px]">
            <Link href="/organization/members">Gérer les membres</Link>
          </Button>

          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 rounded-lg gap-1.5 text-[12px]"
                disabled={!canInvite}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Inviter un membre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-[15px]">Inviter un membre</DialogTitle>
                <DialogDescription className="text-[13px]">
                  {slotsLeft > 0
                    ? `Il vous reste ${slotsLeft} place${slotsLeft > 1 ? "s" : ""} sur ${PRO_MEMBER_LIMIT}.`
                    : `Limite de ${PRO_MEMBER_LIMIT} membres atteinte.`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="org-invite-email" className="text-[13px]">
                    Email
                  </Label>
                  <Input
                    id="org-invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="h-9 rounded-lg text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-invite-role" className="text-[13px]">
                    Rôle
                  </Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as OrganizationRole)}
                  >
                    <SelectTrigger id="org-invite-role" className="h-9 rounded-lg text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" className="text-[13px]">
                        Administrateur
                      </SelectItem>
                      <SelectItem value="member" className="text-[13px]">
                        Membre
                      </SelectItem>
                      <SelectItem value="viewer" className="text-[13px]">
                        Lecteur
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                  className="h-8 rounded-lg text-[13px]"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={isInviting || !canInvite}
                  className="h-8 rounded-lg text-[13px]"
                >
                  {isInviting ? "Génération..." : "Générer le lien"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        Ajoutez jusqu&apos;à {PRO_MEMBER_LIMIT} collaborateurs en plus du propriétaire.
        {!canInvite && " Supprimez un membre pour en inviter un autre."}
      </p>

      <div className="space-y-1 rounded-xl border border-border/60">
        {isLoading && members.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            Chargement des membres...
          </p>
        ) : members.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            Aucun membre pour le moment. Invitez votre première personne.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 border-b border-border/40 px-4 py-3 last:border-b-0"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                {(member.first_name?.[0] || member.email[0] || "?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {member.first_name && member.last_name
                    ? `${member.first_name} ${member.last_name}`
                    : member.email}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Mail className="h-2.5 w-2.5" />
                  {member.email}
                </div>
              </div>
              <Badge variant="outline" className="h-5 shrink-0 text-[10px]">
                {roleLabels[member.role]}
              </Badge>
              <Badge
                variant={member.status === "accepted" ? "success" : "secondary"}
                className="hidden h-5 shrink-0 text-[10px] sm:inline-flex"
              >
                {member.status === "accepted" ? "Actif" : "En attente"}
              </Badge>
            </div>
          ))
        )}
      </div>

      <Dialog open={isInviteLinkOpen} onOpenChange={setIsInviteLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[15px]">Lien d&apos;invitation</DialogTitle>
            <DialogDescription className="text-[13px]">
              Partage ce lien avec {generatedInviteEmail} pour rejoindre l&apos;organisation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Link2 className="h-4 w-4 text-emerald-700" />
            </div>
            <Input value={generatedInviteLink} readOnly className="h-9 rounded-lg text-[12px]" />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteLinkOpen(false)}
              className="h-8 rounded-lg text-[13px]"
            >
              Fermer
            </Button>
            <Button
              type="button"
              className="h-8 gap-1.5 rounded-lg text-[13px]"
              onClick={handleCopyInviteLink}
            >
              <Copy className="h-3.5 w-3.5" />
              Copier le lien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
