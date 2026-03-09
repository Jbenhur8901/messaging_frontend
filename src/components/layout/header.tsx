"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore, useCreditsStore, useOrganizationStore } from "@/stores"
import { organizationsService } from "@/services/organizations"
import { aiCreditsService } from "@/services/ai-credits"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Menu,
  Wallet,
  Building2,
  ChevronDown,
  Check,
  PanelLeft,
  Loader2,
} from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { authStorage } from "@/lib/auth-storage"
import { toast } from "sonner"

interface HeaderProps {
  onMenuClick?: () => void
  isSidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

export function Header({ onMenuClick, isSidebarCollapsed, onSidebarToggle }: HeaderProps) {
  const router = useRouter()
  const { user, setUser, activeOrgId, setActiveOrgId, setOrganizations } = useAuthStore()
  const { walletTotal, fetchBalance } = useCreditsStore()
  const {
    organizations,
    currentOrganization,
    setCurrentOrganization,
  } = useOrganizationStore()
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false)
  const [aiBalance, setAiBalance] = useState<number | null>(null)
  const currentRole = organizations.find((org) => org.id === currentOrganization?.id)?.role
  const isOwner = currentRole === "owner"

  useEffect(() => {
    let cancelled = false
    aiCreditsService.getBalance()
      .then((result) => {
        if (!cancelled) setAiBalance(result.balance ?? 0)
      })
      .catch(() => {
        if (!cancelled) setAiBalance(null)
      })
    return () => {
      cancelled = true
    }
  }, [currentOrganization?.id])

  const handleOrganizationChange = async (orgId: string) => {
    if (orgId === activeOrgId || isSwitchingOrg) return
    const selected = organizations.find((org) => org.id === orgId)
    if (!selected) return
    setIsSwitchingOrg(true)
    try {
      await organizationsService.switchOrganization(orgId)
      setActiveOrgId(selected.id)
      setCurrentOrganization(selected)
      setOrganizations(organizations)
      if (user) {
        const updatedUser = {
          ...user,
          organization_id: selected.id,
          organization_name: selected.name,
        }
        setUser(updatedUser)
        authStorage.setItem("user", JSON.stringify(updatedUser))
      }
      fetchBalance()
      aiCreditsService.getBalance()
        .then((result) => setAiBalance(result.balance ?? 0))
        .catch(() => setAiBalance(null))
      if (typeof window !== "undefined") {
        window.location.reload()
        return
      }
      router.refresh()
    } catch {
      toast.error("Impossible de changer d'organisation")
    } finally {
      setIsSwitchingOrg(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 border-b border-black/5 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Ouvrir le menu</span>
      </Button>

      {isSidebarCollapsed && onSidebarToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 text-muted-foreground lg:flex"
          onClick={onSidebarToggle}
        >
          <PanelLeft className="h-4 w-4" />
          <span className="sr-only">Ouvrir la sidebar</span>
        </Button>
      )}

      <div className="flex flex-1 items-center justify-end gap-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 gap-2 px-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="max-w-[140px] truncate">
                {currentOrganization?.name || user?.organization_name || "Organisation"}
              </span>
              {isSwitchingOrg ? (
                <Loader2 className="h-3 w-3 animate-spin opacity-50" />
              ) : (
                <ChevronDown className="h-3 w-3 opacity-50" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Organisations
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.length === 0 ? (
              <DropdownMenuItem disabled className="text-[13px]">
                Aucune organisation
              </DropdownMenuItem>
            ) : (
              organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => void handleOrganizationChange(org.id)}
                  className="text-[13px]"
                  disabled={isSwitchingOrg}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="truncate">{org.name}</span>
                    {activeOrgId === org.id && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            {isOwner && (
              <DropdownMenuItem asChild className="text-[13px]">
                <Link href="/organization" className="cursor-pointer">
                  <Building2 className="mr-2 h-3.5 w-3.5" />
                  Gérer l&apos;organisation
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {isOwner && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <Link
              href="/whatsapp/ai-credits"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-600">
                IA
              </span>
              {formatNumber(aiBalance ?? 0)} FCFA
            </Link>
            <Link
              href="/whatsapp/credits"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Wallet className="h-3.5 w-3.5" />
              {formatNumber(walletTotal)} FCFA
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
