import Image from "next/image"
import { MessageSquare, Smartphone, Bot, BarChart3 } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-auth">
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Left — Brand + Value props */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/60 px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
            <Image
              src="https://f005.backblazeb2.com/file/nodes600/logo-nodes.png"
              alt="Nodes"
              width={28}
              height={28}
              className="rounded-full"
            />
            Flow by Nodes Technology
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              WhatsApp &amp; SMS, une seule plateforme.
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-500">
              G&eacute;rez vos campagnes WhatsApp Business et SMS, automatisez vos conversations
              et suivez vos performances en temps r&eacute;el.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <MessageSquare className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-800">WhatsApp Business API</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Templates, broadcasts et conversations en temps r&eacute;el.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <Smartphone className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-800">Campagnes SMS</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Envois massifs, personnalisation et suivi de d&eacute;livrance.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <Bot className="h-4 w-4 mt-0.5 text-violet-500 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-800">Intelligence Artificielle</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Agent IA, recherche documentaire et r&eacute;ponses automatiques.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <BarChart3 className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-800">Analytics en temps r&eacute;el</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Taux de livraison, lecture et performance par campagne.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Form card */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-[var(--shadow-md)]">
            <div className="mb-6 flex items-center gap-3 text-foreground">
              <Image
                src="https://f005.backblazeb2.com/file/nodes600/logo-nodes.png"
                alt="Flow"
                width={40}
                height={40}
                className="rounded-lg shadow-[var(--shadow-sm)]"
              />
              <div>
                <p className="text-[15px] font-semibold tracking-tight">Flow</p>
                <p className="text-[11px] text-muted-foreground">WhatsApp &amp; SMS Platform</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
