"use client"

import Image from "next/image"
import Link from "next/link"
import { FlowLogo } from "@/components/brand/flow-logo"
 

const FEATURES = [
  { title: "WhatsApp", desc: "Templates, conversations et envois groupés." },
  { title: "Flows", desc: "Parcours, relances et automatisations conversationnelles." },
  { title: "IA", desc: "Réponses automatiques et recherche documentaire." },
  { title: "Suivi", desc: "Statistiques, crédits et activité en temps réel." },
] as const

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle diagonal lines pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-15deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 26px)",
        }}
      />

      {/* Soft yellow glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full blur-[90px]"
        style={{ backgroundColor: "rgba(255,204,0,0.20)" }}
      />

      <div className="relative mx-auto grid min-h-[82vh] max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 lg:min-h-[88vh] lg:grid-cols-2 lg:gap-16">
        {/* Left: text */}
        <div className="max-w-xl animate-[fade-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="group/badge inline-flex cursor-default items-center rounded-full border border-black/10 bg-white/70 px-3.5 py-2.5 backdrop-blur transition-all duration-300 ease-out hover:scale-[1.03] hover:border-[#FFCC00]/35 hover:bg-white/95 hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.14)]">
            <FlowLogo
              size={48}
              className="rounded-full transition-[box-shadow,transform] duration-300 ease-out group-hover/badge:scale-110 group-hover/badge:shadow-[0_18px_40px_-16px_rgba(255,204,0,0.38)]"
              imageClassName="scale-[0.92]"
              priority
            />
          </div>

          <h1 className="mt-7 max-w-xl text-[28px] font-extrabold leading-[1.08] tracking-tight text-black sm:text-[54px] sm:leading-[1.05]">
            <span>
              Une seule <span className="text-[#FFCC00]">plateforme</span>
            </span>
            <span className="mt-1 block">
              pour <span className="text-[#FFCC00]">lancer</span>,{" "}
              <span className="text-black">convertir</span>
            </span>
            <span className="block">
              <span className="text-[#FFCC00]">performer</span>.
            </span>
          </h1>

          <p className="mt-5 text-[15px] leading-[1.85] text-black/60">
            Orchestrez vos campagnes, activez des agents IA et transformez vos
            interactions clients en croissance mesurable.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/login"
              className="group/cta relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[#FFCC00] px-6 py-3 text-[13px] font-extrabold text-black shadow-[0_18px_46px_-28px_rgba(255,204,0,0.75)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[0_26px_56px_-24px_rgba(255,204,0,0.92)] active:translate-y-0 active:scale-[0.98]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 translate-y-full bg-white/25 transition-transform duration-500 ease-out group-hover/cta:translate-y-0"
              />
              <span className="relative">COMMENCER</span>
            </Link>

            <Link
              href="/terms"
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-6 py-3 text-[13px] font-semibold text-black/80 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:border-black/18 hover:bg-white hover:text-black hover:shadow-[0_18px_44px_-30px_rgba(0,0,0,0.14)] active:translate-y-0 active:scale-[0.98]"
              target="_blank"
              rel="noreferrer"
            >
              EN SAVOIR PLUS
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-[30rem]">
            {FEATURES.map((item) => (
              <div
                key={item.title}
                className="group/card cursor-default rounded-2xl border border-black/10 bg-white/70 px-4 py-3 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#FFCC00]/28 hover:bg-white/95 hover:shadow-[0_22px_48px_-32px_rgba(0,0,0,0.14)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-black/55 transition-colors duration-300 group-hover/card:text-[#b89600]">
                  {item.title}
                </p>
                <p className="mt-1 text-[13px] font-semibold leading-snug text-black/80 transition-colors duration-300 group-hover/card:text-black">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: image */}
        <div className="relative flex items-stretch justify-center animate-[fade-in-right_0.65s_cubic-bezier(0.16,1,0.3,1)_0.05s_both] lg:justify-end">
          <div className="relative w-full">
            <div className="relative h-[72vh] w-full overflow-hidden rounded-[28px] lg:h-[88vh]">
              <div className="relative h-full w-full">
                <div
                  className="absolute inset-0"
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
                    maskImage:
                      "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
                  }}
                >
                  <Image
                    src="/gg.png"
                    alt="Modern smiling person"
                    fill
                    className="object-cover object-center"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                </div>

                {/* Studio wash + edge blending (simplified) */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.55),transparent_54%)] opacity-[0.40]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.90)_0%,rgba(255,255,255,0.46)_18%,rgba(255,255,255,0.10)_44%,rgba(255,255,255,0)_62%)] opacity-[0.42]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0)_28%,rgba(255,255,255,0.08)_48%,rgba(255,255,255,0.35)_68%,rgba(255,255,255,0.72)_88%,rgba(255,255,255,0.97)_100%)] opacity-[0.78]" />

                {/* 4-side gradients — wider + softer feather into white */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(28vh,220px)] bg-gradient-to-b from-white from-0% via-white/55 via-35% to-transparent to-100%" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(28vh,220px)] bg-gradient-to-t from-white from-0% via-white/55 via-35% to-transparent to-100%" />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-[min(22vw,180px)] bg-gradient-to-r from-white from-0% via-white/50 via-40% to-transparent to-100%" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-[min(22vw,180px)] bg-gradient-to-l from-white from-0% via-white/50 via-40% to-transparent to-100%" />

                {/* Corner wipes — larger blur so corners melt into bg */}
                <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/70 blur-[52px]" />
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/70 blur-[52px]" />
                <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-white/65 blur-[56px]" />
                <div className="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-white/65 blur-[56px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-right {
          from {
            opacity: 0;
            transform: translateX(22px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  )
}

