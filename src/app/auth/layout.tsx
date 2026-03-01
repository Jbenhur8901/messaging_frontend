import Image from "next/image"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-auth">
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/60 px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
            <Image
              src="https://phwyhgzcnnjffovepbrt.supabase.co/storage/v1/object/public/file/1.png"
              alt="Flow"
              width={36}
              height={36}
              className="rounded-full"
            />
            Flow
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Une seule plateforme pour lancer, converser et performer.
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-500">
              Orchestrez vos campagnes, activez des agents IA et transformez vos
              interactions clients en croissance mesurable.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <div>
                <p className="text-[13px] font-medium text-slate-800">WhatsApp</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Templates, conversations et envois groupés.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <div>
                <p className="text-[13px] font-medium text-slate-800">SMS</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Campagnes, personnalisation et suivi d&apos;envoi.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <div>
                <p className="text-[13px] font-medium text-slate-800">IA</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Réponses automatiques et recherche documentaire.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <div>
                <p className="text-[13px] font-medium text-slate-800">Suivi</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Statistiques, crédits et activité en temps réel.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-[var(--shadow-md)]">
            <div className="mb-6 flex items-center gap-3 text-foreground">
              <Image
                src="https://phwyhgzcnnjffovepbrt.supabase.co/storage/v1/object/public/file/1.png"
                alt="Flow"
                width={68}
                height={68}
                className="rounded-lg shadow-[var(--shadow-sm)]"
              />
              <div>
                <p className="text-[15px] font-semibold tracking-tight">Flow</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
