import Image from "next/image"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-auth">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="flex w-full justify-center">
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
