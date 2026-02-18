"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useAuthStore, useCreditsStore, useOrganizationStore } from "@/stores"
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
} from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { authStorage } from "@/lib/auth-storage"

interface HeaderProps {
  onMenuClick?: () => void
  isSidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

export function Header({ onMenuClick, isSidebarCollapsed, onSidebarToggle }: HeaderProps) {
  const { user, setUser } = useAuthStore()
  const { walletTotal, fetchBalance } = useCreditsStore()
  const {
    organizations,
    currentOrganization,
    fetchOrganizations,
    setCurrentOrganization,
  } = useOrganizationStore()
  useEffect(() => {
    if (organizations.length === 0) {
      fetchOrganizations()
    }
  }, [organizations.length, fetchOrganizations])

  const handleOrganizationChange = (orgId: string) => {
    const selected = organizations.find((org) => org.id === orgId)
    if (!selected) return
    setCurrentOrganization(selected)
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
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 bg-white px-4 sm:px-6 lg:px-8">
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
        {/* Organization switcher */}
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
              <ChevronDown className="h-3 w-3 opacity-50" />
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
                  onClick={() => handleOrganizationChange(org.id)}
                  className="text-[13px]"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="truncate">{org.name}</span>
                    {currentOrganization?.id === org.id && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-[13px]">
              <Link href="/organization" className="cursor-pointer">
                <Building2 className="mr-2 h-3.5 w-3.5" />
                Gérer les organisations
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Wallet WhatsApp */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <Link
            href="/whatsapp/credits"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Wallet className="h-3.5 w-3.5" />
            {formatNumber(walletTotal)} FCFA
          </Link>
        </div>
      </div>
    </header>
  )
}
