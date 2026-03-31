import Image from "next/image"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="flex w-full justify-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] p-7 shadow-2xl animate-slide-up">
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="https://f005.backblazeb2.com/file/nodes600/logo-nodes.png"
                alt="Flow"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <p className="text-[15px] font-semibold tracking-tight text-white">Flow</p>
                <p className="text-[11px] text-white/40">WhatsApp marketing interactif &amp; agents IA</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
