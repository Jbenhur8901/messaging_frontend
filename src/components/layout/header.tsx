"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Menu,
  Bell,
  CreditCard,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Building2,
  ChevronDown,
  Check,
  PanelLeft,
} from "lucide-react"
import { useTheme } from "next-themes"
import { formatNumber } from "@/lib/utils"
import { authStorage } from "@/lib/auth-storage"

interface HeaderProps {
  onMenuClick?: () => void
  isSidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

export function Header({ onMenuClick, isSidebarCollapsed, onSidebarToggle }: HeaderProps) {
  const router = useRouter()
  const { user, logout, setUser } = useAuthStore()
  const { balance, fetchBalance } = useCreditsStore()
  const {
    organizations,
    currentOrganization,
    fetchOrganizations,
    setCurrentOrganization,
  } = useOrganizationStore()
  const { theme, setTheme } = useTheme()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push("/auth/login")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "U"

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
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 border-b border-border/40 bg-white px-4 sm:px-6 lg:px-8">
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

        {/* Credits display */}
        {balance && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <Link
              href="/credits"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {formatNumber(balance.credit_available)}
            </Link>
            <Link
              href="/credits"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {formatNumber(balance.whatsapp_credit_available ?? balance.whatsapp_credit_balance ?? 0)} WA
            </Link>
          </div>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Changer le thème</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-accent text-[11px] font-medium text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-[13px] font-medium">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-[13px]">
              <Link href="/settings/profile" className="cursor-pointer">
                <User className="mr-2 h-3.5 w-3.5" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-[13px]">
              <Link href="/organization" className="cursor-pointer">
                <Building2 className="mr-2 h-3.5 w-3.5" />
                Organisation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-[13px]">
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-3.5 w-3.5" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-[13px] text-destructive focus:text-destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              {isLoggingOut ? "Déconnexion..." : "Se déconnecter"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
