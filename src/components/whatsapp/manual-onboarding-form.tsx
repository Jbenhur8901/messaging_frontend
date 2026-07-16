"use client"

import { useEffect, useState } from "react"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { whatsappService, handleApiError } from "@/services"

const VERTICALS = [
  ["AUTOMOTIVE", "Automobile"], ["BEAUTY_SPA", "Beauté et bien-être"],
  ["CLOTHING_APPAREL", "Mode et habillement"], ["EDUCATION", "Éducation"],
  ["ENTERTAINMENT", "Divertissement"], ["EVENT_PLANNING_SERVICE", "Événementiel"],
  ["FINANCE_BANKING", "Finance et banque"], ["FOOD_GROCERY", "Alimentation"],
  ["PUBLIC_SERVICE", "Service public"], ["HOTEL_LODGING", "Hôtellerie"],
  ["MEDICAL_HEALTH", "Santé"], ["NON_PROFIT", "Association"],
  ["PROFESSIONAL_SERVICES", "Services professionnels"], ["SHOPPING_RETAIL", "Commerce"],
  ["TRAVEL_TRANSPORTATION", "Voyage et transport"], ["RESTAURANT", "Restaurant"], ["OTHER", "Autre"],
] as const

export function ManualOnboardingForm({ onSubmitted }: { onSubmitted: () => void | Promise<void> }) {
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ phone_number: "", legal_business_name: "", display_name: "", business_vertical: "", website_url: "" })

  useEffect(() => { whatsappService.getOnboardingRequests().then(({ requests }) => setPending(requests.some(r => r.status === "pending"))).finally(() => setLoading(false)) }, [])
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const submit = async () => {
    if (!form.phone_number || !form.legal_business_name || !form.display_name || !form.business_vertical) return toast.error("Complétez tous les champs obligatoires")
    setSubmitting(true)
    try {
      await whatsappService.createOnboardingRequest({ ...form, website_url: form.website_url || undefined })
      setPending(true); toast.success("Demande envoyée à notre équipe"); await onSubmitted()
    } catch (error) { toast.error(handleApiError(error).message) } finally { setSubmitting(false) }
  }
  if (loading) return <div className="flex h-24 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
  if (pending) return <div className="rounded-xl bg-muted/35 p-4"><p className="text-[13px] font-medium">Demande en cours de validation</p><p className="mt-1 text-[12px] text-muted-foreground">Notre équipe configure votre compte Meta et ajoutera les identifiants WABA après validation.</p></div>
  return <div className="space-y-3">
    <div className="space-y-1.5"><Label>Numéro WhatsApp Business *</Label><Input value={form.phone_number} onChange={e => set("phone_number", e.target.value)} placeholder="+242 06 000 00 00" /></div>
    <div className="space-y-1.5"><Label>Nom légal de l’entreprise *</Label><Input value={form.legal_business_name} onChange={e => set("legal_business_name", e.target.value)} placeholder="Nodes Technology SARL" /></div>
    <div className="space-y-1.5"><Label>Nom à afficher sur WhatsApp *</Label><Input value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="Nodes Technology" /><p className="text-[11px] text-muted-foreground">Doit représenter clairement votre entreprise et respecter les règles Meta.</p></div>
    <div className="space-y-1.5"><Label htmlFor="wa-vertical">Secteur d’activité *</Label><select id="wa-vertical" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]" value={form.business_vertical} onChange={e => set("business_vertical", e.target.value)}><option value="">Sélectionner</option>{VERTICALS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="space-y-1.5"><Label>Site web <span className="text-muted-foreground">(optionnel)</span></Label><Input type="url" value={form.website_url} onChange={e => set("website_url", e.target.value)} placeholder="https://entreprise.com" /></div>
    <Button className="w-full" onClick={submit} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Envoyer la demande</Button>
  </div>
}
