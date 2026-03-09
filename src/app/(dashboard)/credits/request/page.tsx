"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCreditRequestsStore } from "@/stores"
import type { PaymentMethod } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, CreditCard, Banknote, Smartphone } from "lucide-react"
import { toast } from "sonner"

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "mobile_money", label: "Mobile Money", icon: <Smartphone className="h-4 w-4" /> },
  { value: "airtel_money", label: "Airtel Money", icon: <Smartphone className="h-4 w-4" /> },
  { value: "cash", label: "Espèces", icon: <Banknote className="h-4 w-4" /> },
]

export default function CreditRequestPage() {
  const router = useRouter()
  const { createRequest, isLoading } = useCreditRequestsStore()

  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money")
  const [paymentReference, setPaymentReference] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountNum = parseInt(amount, 10)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Veuillez entrer un montant valide")
      return
    }

    try {
      await createRequest(amountNum, paymentMethod, paymentReference || undefined)
      toast.success("Demande de crédits envoyée")
      router.push("/credits/requests")
    } catch {
      toast.error("Erreur lors de la création de la demande")
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/credits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Demander des crédits</h1>
          <p className="text-muted-foreground mt-1">
            Soumettez une demande de recharge de crédits.
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Nouvelle demande</CardTitle>
          </div>
          <CardDescription>
            Votre demande sera examinée par un administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (crédits)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                min="1"
                required
              />
              <p className="text-xs text-muted-foreground">
                Utilisez vos credits pour WhatsApp, vos campagnes et vos agents IA.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Mode de paiement</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        {method.icon}
                        {method.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Référence de paiement (optionnel)</Label>
              <Input
                id="reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="TXN123456 ou numéro de transaction"
              />
              <p className="text-xs text-muted-foreground">
                Numéro de transaction Mobile Money ou référence de paiement
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/credits">Annuler</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Envoi..." : "Envoyer la demande"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Comment ça marche ?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Effectuez votre paiement via le mode choisi</li>
              <li>Soumettez cette demande avec la référence de paiement</li>
              <li>Un administrateur vérifiera et approuvera votre demande</li>
              <li>Les crédits seront ajoutés à votre compte</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
