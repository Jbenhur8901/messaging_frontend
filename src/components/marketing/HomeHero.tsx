"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

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

      <div className="relative mx-auto grid min-h-[78vh] max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 lg:grid-cols-2 lg:gap-16">
        {/* Left: text */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <div className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3.5 py-2.5 backdrop-blur">
            <span className="relative h-12 w-12 overflow-hidden rounded-full shadow-[0_14px_30px_-18px_rgba(0,0,0,0.35)]">
              <Image
                src="/mtn.jpg"
                alt="MTN"
                fill
                className="object-cover"
                sizes="48px"
                priority={false}
              />
            </span>
          </div>

          <h1 className="mt-7 max-w-xl text-[34px] font-extrabold leading-[1.08] tracking-tight text-black sm:text-[54px] sm:leading-[1.05]">
            <span className="whitespace-nowrap">
              Une seule <span className="text-[#FFCC00]">plateforme</span>
            </span>
            <span className="mt-1 block whitespace-nowrap">
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
              className="group inline-flex items-center justify-center rounded-full bg-[#FFCC00] px-6 py-3 text-[13px] font-extrabold text-black shadow-[0_18px_46px_-28px_rgba(255,204,0,0.75)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.99]"
            >
              COMMENCER
            </Link>

            <Link
              href="/terms"
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-6 py-3 text-[13px] font-semibold text-black/80 hover:bg-white"
              target="_blank"
              rel="noreferrer"
            >
              EN SAVOIR PLUS
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-[30rem]">
            {[
              { title: "WhatsApp", desc: "Templates, conversations et envois groupés." },
              { title: "Flows", desc: "Parcours, relances et automatisations conversationnelles." },
              { title: "IA", desc: "Réponses automatiques et recherche documentaire." },
              { title: "Suivi", desc: "Statistiques, crédits et activité en temps réel." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-black/55">
                  {item.title}
                </p>
                <p className="mt-1 text-[13px] font-semibold leading-snug text-black/80">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: image */}
        <motion.div
          initial={{ opacity: 0, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-stretch justify-center lg:justify-end"
        >
          <div className="relative w-full">
            <div className="relative h-[62vh] w-full overflow-hidden rounded-[28px] lg:h-[78vh]">
              <div className="relative h-full w-full">
                <div className="absolute inset-0">
                  <Image
                    src="/gg.png"
                    alt="Modern smiling person"
                    fill
                    className="object-contain object-center"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    priority={false}
                  />
                </div>

                {/* Pro white gradient (studio wash) */}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.50)_18%,rgba(255,255,255,0.10)_42%,rgba(255,255,255,0)_60%)] opacity-[0.45]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.55),transparent_52%)] opacity-[0.40]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(255,255,255,0.80)_0%,rgba(255,255,255,0.22)_22%,rgba(255,255,255,0)_48%)] opacity-[0.40]" />

                {/* Edge blend */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0)_52%,rgba(255,255,255,0.22)_70%,rgba(255,255,255,0.62)_86%,rgba(255,255,255,0.96)_100%)] opacity-[0.72]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0)_38%,rgba(255,255,255,0.10)_60%,rgba(255,255,255,0.38)_78%,rgba(255,255,255,0.78)_92%,rgba(255,255,255,1)_100%)] opacity-[0.55]" />

                {/* 4-side gradients */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/95 via-white/45 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/95 via-white/45 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white/90 via-white/40 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white/90 via-white/40 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/70 via-white/18 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white/70 via-white/18 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-white/60 via-white/14 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-white/60 via-white/14 to-transparent" />

                {/* Corner wipes */}
                <div className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-white/70 blur-[28px]" />
                <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-white/65 blur-[30px]" />
                <div className="pointer-events-none absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-white/60 blur-[34px]" />
                <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-white/60 blur-[34px]" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

