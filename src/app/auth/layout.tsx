import { Send } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-auth">
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8 text-white">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/12 px-4 py-2 text-sm font-medium backdrop-blur">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary">
              <Send className="h-4 w-4" />
            </span>
            Plateforme Messaging Flow
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Centralisez vos campagnes et la conformité sans friction.
            </h1>
            <p className="text-lg text-white/80">
              Une interface conçue pour les équipes marketing et ops qui veulent
              industrialiser WhatsApp, SMS et emailing en toute sécurité.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-white/80 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              Contrôle des accès et MFA intégrés.
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              API Keys gérées et auditables.
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              Temps réel sur les campagnes.
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              Conformité et traçabilité.
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/90 p-6 shadow-[var(--shadow-md)] backdrop-blur">
            <div className="mb-6 flex items-center gap-2 text-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-sm)]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold">Flow</p>
                <p className="text-xs text-muted-foreground">Console sécurisée</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
