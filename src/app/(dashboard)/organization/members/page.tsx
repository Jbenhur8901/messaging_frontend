"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useOrganizationStore, useAuthStore } from "@/stores"
import type { OrganizationRole } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  UserPlus,
  MoreHorizontal,
  Mail,
  Clock,
  Trash2,
  Copy,
  Link2,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

const stagger = (i: number) => ({
  opacity: 0,
  animation: `fadeIn 0.45s ease-out ${i * 0.06}s forwards`,
})

const roleLabels: Record<OrganizationRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
}

const roleBadgeVariants: Record<OrganizationRole, "default" | "secondary" | "outline" | "destructive"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
  viewer: "outline",
}

export default function MembersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const {
    currentOrganization,
    organizations,
    members,
    fetchMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
    isLoading,
    error,
    clearError,
  } = useOrganizationStore()

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("member")
  const [isInviting, setIsInviting] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isInviteLinkOpen, setIsInviteLinkOpen] = useState(false)
  const [generatedInviteLink, setGeneratedInviteLink] = useState("")
  const [generatedInviteEmail, setGeneratedInviteEmail] = useState("")

  const userRole = organizations.find((o) => o.id === currentOrganization?.id)?.role
  const canManageMembers = userRole === "owner"

  useEffect(() => {
    if (currentOrganization) {
      fetchMembers()
    }
  }, [currentOrganization, fetchMembers])

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  useEffect(() => {
    if (currentOrganization && userRole && userRole !== "owner") {
      toast.error("Seul le propriétaire peut gérer les membres de l'organisation")
      router.replace("/dashboard")
    }
  }, [currentOrganization, router, userRole])

  useEffect(() => {
    if (searchParams.get("invite") === "1" && canManageMembers) {
      setIsInviteOpen(true)
    }
  }, [canManageMembers, searchParams])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("L'email est requis")
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
          : "Invitation créée, mais aucun lien n'a été renvoyé par le backend"
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

  const handleRoleChange = async (memberId: string, role: OrganizationRole) => {
    try {
      await updateMemberRole(memberId, role)
      toast.success("Rôle mis à jour")
    } catch {
      // Error handled by store
    }
  }

  const handleRemove = async () => {
    if (!memberToRemove) return

    setIsRemoving(true)
    try {
      await removeMember(memberToRemove)
      toast.success("Membre supprimé")
      setMemberToRemove(null)
    } catch {
      // Error handled by store
    } finally {
      setIsRemoving(false)
    }
  }

  if (isLoading && members.length === 0) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-48 rounded-xl" />
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (currentOrganization && userRole && userRole !== "owner") {
    return null
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/organization">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Membres</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Gérez les membres de {currentOrganization?.name}.
            </p>
          </div>
        </div>
        {canManageMembers && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="h-8 text-[13px] rounded-lg gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Inviter un membre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-[15px]">Inviter un membre</DialogTitle>
                <DialogDescription className="text-[13px]">
                  Générez un lien d&apos;invitation à partager avec le futur membre.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[13px]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="h-9 text-[13px] rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-[13px]">Rôle</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as OrganizationRole)}
                  >
                    <SelectTrigger className="h-9 text-[13px] rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" className="text-[13px]">Administrateur</SelectItem>
                      <SelectItem value="member" className="text-[13px]">Membre</SelectItem>
                      <SelectItem value="viewer" className="text-[13px]">Lecteur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)} className="h-8 text-[13px] rounded-lg">
                  Annuler
                </Button>
                <Button onClick={handleInvite} disabled={isInviting} className="h-8 text-[13px] rounded-lg">
                  {isInviting ? "Generation..." : "Generer le lien"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Count */}
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
        {members.length} membre{members.length > 1 ? "s" : ""}
      </p>

      {/* Members List */}
      <div className="space-y-1">
        {members.map((member, i) => {
          const isCurrentUser = member.user_id === user?.id
          const isOwner = member.role === "owner"
          const canModify = canManageMembers && !isCurrentUser && !isOwner

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-accent/50 transition-colors duration-200"
              style={stagger(i)}
            >
              {/* Avatar initials */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                {(member.first_name?.[0] || member.email[0] || "?").toUpperCase()}
              </div>

              {/* Name + email */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-medium truncate">
                    {member.first_name && member.last_name
                      ? `${member.first_name} ${member.last_name}`
                      : member.email}
                  </p>
                  {isCurrentUser && (
                    <span className="text-[10px] text-muted-foreground">(vous)</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Mail className="h-2.5 w-2.5" />
                  {member.email}
                </div>
              </div>

              {/* Role */}
              <div className="hidden sm:block shrink-0">
                {canModify ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      handleRoleChange(member.id, value as OrganizationRole)
                    }
                  >
                    <SelectTrigger className="h-7 w-[130px] text-[12px] rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" className="text-[12px]">Administrateur</SelectItem>
                      <SelectItem value="member" className="text-[12px]">Membre</SelectItem>
                      <SelectItem value="viewer" className="text-[12px]">Lecteur</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={roleBadgeVariants[member.role]} className="text-[10px] h-5">
                    {roleLabels[member.role]}
                  </Badge>
                )}
              </div>

              {/* Status */}
              <Badge
                variant={member.status === "accepted" ? "success" : "secondary"}
                className="hidden md:inline-flex text-[10px] h-5 shrink-0"
              >
                {member.status === "accepted" ? "Actif" : "En attente"}
              </Badge>

              {/* Date */}
              <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                <Clock className="h-2.5 w-2.5" />
                {formatDate(member.joined_at || member.invited_at || "")}
              </div>

              {/* Actions */}
              {canManageMembers && canModify && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive text-[13px]"
                      onClick={() => setMemberToRemove(member.id)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              Cette action est irréversible. Le membre perdra l&apos;accès à
              l&apos;organisation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-[13px] rounded-lg">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="h-8 text-[13px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="min-w-0 flex-1 space-y-3">
              <Input
                value={generatedInviteLink}
                readOnly
                className="h-9 rounded-lg text-[12px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteLinkOpen(false)} className="h-8 text-[13px] rounded-lg">
              Fermer
            </Button>
            <Button type="button" className="h-8 text-[13px] rounded-lg gap-1.5" onClick={handleCopyInviteLink}>
              <Copy className="h-3.5 w-3.5" />
              Copier le lien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
