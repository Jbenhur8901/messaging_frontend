import { FlowLogo } from "@/components/brand/flow-logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-auth text-white selection:bg-[#E0D112]/30 selection:text-white">
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-10 animate-fade-in">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/5 px-4 py-2 text-[13px] font-medium text-white/90 border border-white/10 backdrop-blur-md">
            <FlowLogo size={32} className="rounded-full" priority />
            <span className="tracking-wide">Flow</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-[1.14] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              <span className="text-white">Une seule </span>
              <span className="text-[#E0D112]">plateforme</span>
              <br />
              <span className="text-white">pour </span>
              <span className="text-[#E0D112]">lancer</span>
              <span className="text-white">, </span>
              <span className="text-white">convertir</span>
              <br />
              <span className="text-[#E0D112]">performer</span>
              <span className="text-white/40">.</span>
            </h1>
            <p className="max-w-[28rem] text-[15px] leading-[1.75] text-white/40">
              Orchestrez vos campagnes, activez des agents IA
              et transformez vos interactions clients en croissance mesurable.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "WhatsApp", desc: "Templates, conversations et envois groupés." },
              { title: "Flows", desc: "Parcours, relances et automatisations conversationnelles." },
              { title: "IA", desc: "Réponses automatiques et recherche documentaire." },
              { title: "Suivi", desc: "Statistiques, crédits et activité en temps réel." },
            ].map((item, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 transition-all hover:bg-white/[0.06] hover:border-[#E0D112]/20"
              >
                <p className="text-[13px] font-semibold text-white group-hover:text-[#E0D112] transition-colors">
                  {item.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-white/35">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end animate-slide-up">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-card p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#E0D112]/8 blur-[80px] -mr-16 -mt-16 pointer-events-none" />

            <div className="mb-8 flex items-center gap-4 text-white">
              <div className="rounded-2xl border border-[#E0D112]/20 bg-[#E0D112]/10 p-2">
                <FlowLogo size={44} className="rounded-xl" priority />
              </div>
              <p className="text-lg font-bold tracking-tight">Flow</p>
            </div>

            <div className="relative z-10">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
