import type { OrganizationMember } from "@/types"

export const PRO_MEMBER_LIMIT = 5

export function countInvitableMembers(members: OrganizationMember[]): number {
  return members.filter((member) => member.role !== "owner").length
}

export function canInviteMoreMembers(members: OrganizationMember[]): boolean {
  return countInvitableMembers(members) < PRO_MEMBER_LIMIT
}

export function remainingMemberSlots(members: OrganizationMember[]): number {
  return Math.max(0, PRO_MEMBER_LIMIT - countInvitableMembers(members))
}
