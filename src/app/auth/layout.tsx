"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { FlowLogo } from "@/components/brand/flow-logo"
import { Button } from "@/components/ui/button"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPlainAuth =
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset-password"

  if (isPlainAuth) {
    return (
      <div className="relative min-h-screen bg-[#070707] text-white selection:bg-primary/25 selection:text-black">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 520px at 50% 45%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.00) 62%), linear-gradient(180deg, #070707 0%, #0B0B0B 55%, #070707 100%)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-15deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 26px)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 top-20 h-80 w-80 rounded-full blur-[95px]"
          style={{ backgroundColor: "rgba(255,204,0,0.28)" }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-10 h-96 w-96 rounded-full blur-[120px]"
          style={{ backgroundColor: "rgba(0,91,170,0.12)" }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />

        <div className="relative mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-12">
          <div className="w-full">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#111] selection:bg-primary/20 selection:text-black">
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-stretch gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(17,17,17,0.06) 0px, rgba(17,17,17,0.06) 1px, transparent 1px, transparent 28px)",
          }}
        />

        <div className="relative z-10 flex flex-col justify-center gap-8 animate-fade-in">
          <div className="inline-flex items-center gap-3 self-start rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[13px] font-semibold text-black/80 backdrop-blur">
            <Image
              src="https://phwyhgzcnnjffovepbrt.supabase.co/storage/v1/object/public/file/1.png"
              alt="Flow"
              width={28}
              height={28}
              className="rounded-full"
            />
            <span className="tracking-wide">Flow</span>
          </div>

          <div className="space-y-5">
            <h1 className="max-w-xl text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-[54px]">
              Une seule <span className="text-primary">plateforme</span>
              <br />
              pour <span className="text-primary">lancer</span>, convertir
              <br />
              <span className="text-primary">performer</span>.
            </h1>

            <p className="max-w-[34rem] text-[15px] leading-[1.8] text-black/60">
              Orchestrez vos campagnes, activez des agents IA et transformez vos
              interactions clients en croissance mesurable.
            </p>

            <div className="space-y-2 text-[12px] text-black/65">
              <p className="font-semibold tracking-wide">
                VESTIBULAR ONLINE - 21 DE NOVEMBRO
              </p>
              <p className="italic text-black/45">
                Inscriptions ouvertes! Vagas limitadas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href="/auth/login">
                <Button className="h-11 rounded-xl bg-primary px-6 text-[13px] font-extrabold text-black shadow-[0_12px_30px_-14px_rgba(0,0,0,0.35)] hover:bg-primary/90">
                  Creer un compte
                </Button>
              </Link>
              <Link href="/terms" target="_blank">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-black/10 bg-white/70 px-6 text-[13px] font-semibold text-black/80 hover:bg-white"
                >
                  En savoir plus
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "WhatsApp",
                desc: "Templates, conversations et envois groupes.",
              },
              {
                title: "Flows",
                desc: "Parcours, relances et automatisations conversationnelles.",
              },
              {
                title: "IA",
                desc: "Reponses automatiques et recherche documentaire.",
              },
              {
                title: "Suivi",
                desc: "Statistiques, credits et activite en temps reel.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-black/10 bg-white/70 px-5 py-4 backdrop-blur-sm transition-all hover:bg-white"
              >
                <p className="text-[13px] font-semibold text-black/85">
                  {item.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-black/50">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center lg:justify-end animate-slide-up">
          <div className="relative w-full max-w-md">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden lg:block"
            >
              <div className="absolute -right-28 -top-12 h-[620px] w-[560px]">
                <div
                  className="absolute inset-0"
                  style={{
                    maskImage:
                      "radial-gradient(ellipse 55% 62% at 60% 40%, black 45%, transparent 74%)",
                    WebkitMaskImage:
                      "radial-gradient(ellipse 55% 62% at 60% 40%, black 45%, transparent 74%)",
                  }}
                >
                  <Image
                    src="/images/auth/hero-reference.png"
                    alt=""
                    fill
                    className="object-cover object-[82%_26%]"
                    sizes="560px"
                  />
                </div>
              </div>

              <div className="absolute -top-10 left-10 h-24 w-28 rotate-[-10deg] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_25px_60px_-40px_rgba(0,0,0,0.55)]">
                <Image
                  src="/images/auth/hero-reference.png"
                  alt=""
                  fill
                  className="object-cover object-[80%_6%]"
                  sizes="112px"
                />
              </div>
              <div className="absolute top-10 left-32 h-20 w-24 rotate-[8deg] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_25px_60px_-40px_rgba(0,0,0,0.55)]">
                <Image
                  src="/images/auth/hero-reference.png"
                  alt=""
                  fill
                  className="object-cover object-[18%_22%]"
                  sizes="96px"
                />
              </div>

              <div className="absolute -bottom-6 -left-6 h-44 w-44 rounded-full bg-primary/18 blur-[85px]" />
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/85 p-7 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/15 blur-[60px]" />
              <div className="mb-7 flex items-center gap-3">
                <div className="rounded-2xl border border-black/10 bg-primary/20 p-2">
                  <FlowLogo size={40} className="rounded-xl" priority />
                </div>
                <div className="leading-tight">
                  <p className="text-[16px] font-extrabold tracking-tight text-black">
                    Flow
                  </p>
                  <p className="text-[11px] font-medium text-black/45">
                    Connexion securisee
                  </p>
                </div>
              </div>

              <div className="relative z-10">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
