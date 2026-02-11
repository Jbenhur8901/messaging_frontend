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
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import { useTheme } from "next-themes"
import { formatNumber } from "@/lib/utils"
import { authStorage } from "@/lib/auth-storage"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
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
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur-sm shadow-[var(--shadow-xs)] sm:gap-x-6 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Ouvrir le menu</span>
      </Button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center justify-end gap-x-3 lg:gap-x-4">
          {/* Organization switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 border-border/70 bg-background/80 shadow-[var(--shadow-xs)]">
                <Building2 className="h-4 w-4" />
                <span className="max-w-[180px] truncate">
                  {currentOrganization?.name || user?.organization_name || "Organisation"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <DropdownMenuLabel>Organisations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {organizations.length === 0 ? (
                <DropdownMenuItem disabled>Aucune organisation</DropdownMenuItem>
              ) : (
                organizations.map((org) => (
                  <DropdownMenuItem key={org.id} onClick={() => handleOrganizationChange(org.id)}>
                    <div className="flex w-full items-center justify-between">
                      <span className="truncate">{org.name}</span>
                      {currentOrganization?.id === org.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/organization" className="cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4" />
                  Gérer les organisations
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Credits display */}
          {balance && (
            <div className="flex items-center gap-2">
              <Link href="/credits">
                <Badge variant="secondary" className="cursor-pointer gap-1.5 px-3 py-1.5 border border-border/60 bg-secondary/70 text-secondary-foreground hover:bg-secondary/80 transition-all duration-200">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="font-semibold">
                    {formatNumber(balance.credit_available)} crédits
                  </span>
                </Badge>
              </Link>
              <Link href="/credits">
                <Badge variant="secondary" className="cursor-pointer gap-1.5 px-3 py-1.5 border border-border/60 bg-secondary/70 text-secondary-foreground hover:bg-secondary/80 transition-all duration-200">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="font-semibold">
                    {formatNumber(balance.whatsapp_credit_available ?? balance.whatsapp_credit_balance ?? 0)} WhatsApp
                  </span>
                </Badge>
              </Link>
            </div>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Changer le thème</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar className="h-9 w-9 ring-1 ring-border/70 ring-offset-2 ring-offset-background transition-all hover:ring-primary/40">
                  <AvatarFallback className="bg-primary text-white text-sm font-semibold">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/organization" className="cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4" />
                  Organisation
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Déconnexion..." : "Se déconnecter"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
