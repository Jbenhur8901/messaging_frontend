"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useAdminStore } from "@/stores"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CreditCard,
  Building2,
  Users,
  CheckCircle,
  ArrowRight,
} from "lucide-react"
import { formatNumber } from "@/lib/utils"

export default function AdminDashboardPage() {
  const { dashboard, fetchDashboard, isLoading } = useAdminStore()

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (isLoading && !dashboard) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Vue d&apos;ensemble de la plateforme.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Demandes en attente
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/10">
              <CreditCard className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(dashboard?.pending_credit_requests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              demandes à traiter
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Organisations
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(dashboard?.total_organizations || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              organisations actives
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilisateurs
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(dashboard?.total_users || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              utilisateurs enregistrés
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approuvées aujourd&apos;hui
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatNumber(dashboard?.approved_today || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(dashboard?.credits_distributed_today || 0)} crédits distribués
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demandes de crédits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {dashboard?.pending_credit_requests
                ? `${dashboard.pending_credit_requests} demande${dashboard.pending_credit_requests > 1 ? "s" : ""} en attente de validation`
                : "Aucune demande en attente"}
            </p>
            <Button asChild>
              <Link href="/admin/credit-requests">
                Gérer les demandes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organisations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {dashboard?.total_organizations
                ? `${dashboard.total_organizations} organisation${dashboard.total_organizations > 1 ? "s" : ""} sur la plateforme`
                : "Aucune organisation"}
            </p>
            <Button asChild variant="outline">
              <Link href="/admin/organizations">
                Voir les organisations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
