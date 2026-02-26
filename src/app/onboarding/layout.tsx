import Image from "next/image"
import { Building2, Users, Shield, Zap } from "lucide-react"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-auth">
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Left — Brand + Value props */}
        <div className="space-y-8 animate-fade-in">
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
              Configurez votre espace de travail.
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-500">
              Choisissez une organisation existante ou cr&eacute;ez-en une nouvelle pour commencer &agrave; g&eacute;rer vos campagnes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <Building2 className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-800">Multi-organisations</p>
                <p className="text-[11px] text-slate-400 mt-0.5">G&eacute;rez plusieurs espaces de travail depuis un seul compte.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <Users className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-800">Collaboration</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Invitez votre &eacute;quipe et g&eacute;rez les r&ocirc;les et permissions.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <Shield className="h-4 w-4 mt-0.5 text-violet-500 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-800">S&eacute;curis&eacute; par d&eacute;faut</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Donn&eacute;es isol&eacute;es par organisation avec contr&ocirc;le d&apos;acc&egrave;s.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-sm">
              <Zap className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-slate-800">D&eacute;marrage rapide</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Cr&eacute;ez votre workspace en quelques secondes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Onboarding content */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-[var(--shadow-md)] animate-slide-up">
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
