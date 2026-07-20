"use client"

import { useEffect, useState } from "react"
import { Manrope } from "next/font/google"
import { Clock, FileArrowUp, Paperclip, ArrowsCounterClockwise, Target, MapPin, Tag, Lightning, MagnifyingGlass, Receipt, Brain, ShoppingCart, Coins, ArrowsClockwise, Rocket, Recycle, List, X } from "@phosphor-icons/react"
import s from "./flow.module.css"

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
})

const BG_SHOTS = [
  { tx: "0px",    ty: "-300px",  delay: "0s",    dur: "3.0s", msg: "🎁 -20% ce weekend · Code PROMO24" },
  { tx: "220px",  ty: "-200px",  delay: "0.38s", dur: "2.8s", msg: "📦 Commande #4821 expédiée" },
  { tx: "310px",  ty: "0px",    delay: "0.75s", dur: "3.1s", msg: "🔔 Rapport mensuel disponible" },
  { tx: "220px",  ty: "200px",  delay: "1.12s", dur: "2.9s", msg: "📍 Colis en route · 14h00" },
  { tx: "0px",    ty: "300px",  delay: "1.5s",  dur: "2.7s", msg: "💬 Réservation confirmée · 20h" },
  { tx: "-220px", ty: "200px",  delay: "1.88s", dur: "3.0s", msg: "🛒 Votre panier vous attend" },
  { tx: "-310px", ty: "0px",    delay: "2.25s", dur: "2.8s", msg: "📱 Offre VIP · Expire minuit" },
  { tx: "-220px", ty: "-200px", delay: "2.63s", dur: "3.1s", msg: "✅ Paiement reçu · Merci !" },
]

export default function FlowPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [simType, setSimType] = useState<"marketing" | "utility" | "auth">("marketing")
  const [simVolume, setSimVolume] = useState(1000)

  const SIM_TYPES = [
    { id: "marketing" as const, label: "Marketing", pricePerMsg: 18 },
    { id: "utility" as const, label: "Utilitaire", pricePerMsg: 6 },
    { id: "auth" as const, label: "Auth", pricePerMsg: 6 },
  ]
  const simPrice = SIM_TYPES.find(t => t.id === simType)!.pricePerMsg * simVolume

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let countObserver: IntersectionObserver | null = null

    function setupReveal() {
      const vh = window.innerHeight
      const els = document.querySelectorAll<HTMLElement>(`.${s.reveal}, .${s.revealScale}`)

      els.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top > vh + 20 && !prefersReduced) {
          const isScale = el.classList.contains(s.revealScale)
          const delay = el.dataset.delay ?? "0ms"
          el.style.opacity = "0"
          el.style.transform = isScale ? "scale(0.97) translateY(12px)" : "translateY(20px)"
          el.style.transition = isScale
            ? `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}`
            : `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}`
          ;(el as HTMLElement & { _needsReveal?: boolean })._needsReveal = true
        }
      })

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target as HTMLElement & { _needsReveal?: boolean }
            if (entry.isIntersecting && el._needsReveal) {
              el.style.opacity = "1"
              el.style.transform = el.classList.contains(s.revealScale)
                ? "scale(1) translateY(0)"
                : "translateY(0)"
              el._needsReveal = false
              observer.unobserve(el)
            }
          })
        },
        { threshold: 0.05 },
      )

      els.forEach((el) => {
        if ((el as HTMLElement & { _needsReveal?: boolean })._needsReveal) observer.observe(el)
      })
    }

    function setupCountUp() {
      if (prefersReduced) return
      const countEls = document.querySelectorAll<HTMLElement>("[data-countup]")
      if (!countEls.length) return
      countObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          if (el.dataset.animated) return
          el.dataset.animated = "1"
          const target = parseInt(el.dataset.countup ?? "0", 10)
          let startTime: number | null = null
          const duration = 1100
          const tick = (ts: number) => {
            if (!startTime) startTime = ts
            const t = Math.min((ts - startTime) / duration, 1)
            const ease = 1 - Math.pow(1 - t, 3)
            el.textContent = Math.round(ease * target).toString()
            if (t < 1) requestAnimationFrame(tick)
            else el.textContent = target.toString()
          }
          requestAnimationFrame(tick)
          countObserver?.unobserve(el)
        })
      }, { threshold: 0.5 })
      countEls.forEach((el) => countObserver!.observe(el))
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(setupReveal)
      setupCountUp()
    })

    return () => {
      window.removeEventListener("scroll", onScroll)
      countObserver?.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [mobileMenuOpen])

  function scrollTo(id: string) {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" })
  }

  function handleNavClick(id: string) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      scrollTo(id)
    }
  }

  const TW_S = 120   // ms before first char
  const TW_D = 35    // ms between chars
  const twL1  = "Touchez vos clients"
  const twL2a = "là où ils "
  const twL2b = "sont le plus actifs."

  const navItems = [
    ["segmentation", "Segmentation"],
    ["campaigns", "Campagnes"],
    ["reporting", "Reporting"],
    ["usecases", "Cas d'usage"],
    ["pricing", "Tarifs"],
  ] as const

  const heroStats = [
    { value: "98%", label: "Taux d'ouverture" },
    { value: "3 min", label: "Délai de lecture" },
    { value: "45%", label: "Taux de réponse" },
  ] as const

  return (
    <div className={`${s.page} ${manrope.variable}`}>
      {/* ─── NAV ─── */}
      <nav className={`${s.nav}${isScrolled ? " " + s.scrolled : ""}${mobileMenuOpen ? " " + s.navOpen : ""}`}>
        <div className={s.container}>
          <div className={s.navInner}>
            <a href="#hero" className={s.navLogo} onClick={(e) => { e.preventDefault(); scrollTo("hero") }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_flow_blanc.png" alt="Flow" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
              <span className={s.wordmark}>Flow</span>
            </a>
            <ul className={s.navLinks}>
              {navItems.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={handleNavClick(id)}>{label}</a>
                </li>
              ))}
            </ul>
            <div className={s.navCta}>
              <a href="https://wa.me/242056590857" target="_blank" rel="noopener noreferrer" className={`${s.btn} ${s.btnGhost}`}>
                Contactez-nous
              </a>
              <a href="/auth/login" className={`${s.btn} ${s.btnPrimary}`}>
                Commencer maintenant
              </a>
            </div>
            <button
              type="button"
              className={s.navMenuToggle}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="flow-mobile-menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
            </button>
          </div>
        </div>

        <div
          id="flow-mobile-menu"
          className={`${s.navMobileMenu}${mobileMenuOpen ? " " + s.navMobileMenuOpen : ""}`}
          aria-hidden={!mobileMenuOpen}
        >
          <div className={s.container}>
            <ul className={s.navMobileLinks}>
              {navItems.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={handleNavClick(id)}>{label}</a>
                </li>
              ))}
            </ul>
            <div className={s.navMobileCta}>
              <a
                href="https://wa.me/242056590857"
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.btn} ${s.btnGhost}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Contactez-nous
              </a>
              <a
                href="/auth/login"
                className={`${s.btn} ${s.btnPrimary}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Commencer maintenant
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section id="hero" className={s.heroSection}>
        <div className={s.heroBackground} aria-hidden="true">
          {BG_SHOTS.map((shot, i) => (
            <div
              key={i}
              className={s.heroBgShot}
              style={{ "--tx": shot.tx, "--ty": shot.ty, "--delay": shot.delay, "--dur": shot.dur } as React.CSSProperties}
            >
              {shot.msg}
            </div>
          ))}
        </div>
        <div className={s.container}>
          <div className={s.heroInner}>
            <h1 className={`${s.tDisplay} ${s.heroTitle}`}>
              {[...twL1].map((c, i) => (
                <span key={i} className={s.twChar} style={{ animationDelay: `${TW_S + i * TW_D}ms` }}>{c}</span>
              ))}
              <br />
              {[...twL2a].map((c, i) => (
                <span key={i} className={s.twChar} style={{ animationDelay: `${TW_S + (twL1.length + i) * TW_D}ms` }}>{c}</span>
              ))}
              <em>
                {[...twL2b].map((c, i) => (
                  <span key={i} className={s.twChar} style={{ animationDelay: `${TW_S + (twL1.length + twL2a.length + i) * TW_D}ms` }}>{c}</span>
                ))}
              </em>
              <span
                className={s.twCursor}
                style={{ animationDelay: `${TW_S + (twL1.length + twL2a.length + twL2b.length) * TW_D}ms` }}
              />
            </h1>
            <p className={s.heroSub}>
              Importez, segmentez, ciblez et mesurez vos résultats — depuis une seule interface.
            </p>
            <div className={s.heroActions}>
              <a href="/auth/login" className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`}>
                Commencer maintenant
              </a>
              <a href="#pricing" className={`${s.btn} ${s.btnGhost} ${s.btnLg}`} onClick={(e) => { e.preventDefault(); scrollTo("pricing") }}>
                Voir nos offres
              </a>
            </div>
            <div className={s.heroDataStrip}>
              {heroStats.map((stat) => (
                <div key={stat.label} className={s.dsItem}>
                  <span className={s.dsVal}>{stat.value}</span>
                  <span className={s.dsLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section id="comparison" className={s.comparison}>
        <div className={s.container}>
          <div className={s.sectionHeader}>
            <p className={`${s.tLabel} ${s.sectionEyebrow} ${s.reveal}`}>Canal marketing</p>
            <h2 className={`${s.tHeadline} ${s.reveal}`}>Le canal qui performe.<br />De loin.</h2>
            <p className={`${s.tBody} ${s.reveal}`} data-delay="80ms">
              Les chiffres ne laissent aucun doute.
            </p>
          </div>
          <div className={s.cmpGrid}>
            {[
              {
                label: "Email", open: "21", openColor: "var(--muted-dim)", delay: "0ms", active: false,
                rows: [
                  { k: "Taux d'ouverture", v: "21%",    vc: "var(--muted)" },
                  { k: "Taux de clic",     v: "2.3%",   vc: "var(--muted)" },
                  { k: "Délai de lecture", v: "26h",    vc: "var(--muted)" },
                  { k: "Taux de réponse",  v: "2%",     vc: "var(--muted)" },
                ],
              },
              {
                label: "SMS", open: "48", openColor: "var(--muted)", delay: "80ms", active: false,
                rows: [
                  { k: "Taux d'ouverture", v: "48%",   vc: undefined },
                  { k: "Taux de clic",     v: "6–8%",  vc: undefined },
                  { k: "Délai de lecture", v: "4h",    vc: undefined },
                  { k: "Taux de réponse",  v: "12%",   vc: undefined },
                ],
              },
              {
                label: "WhatsApp via Flow", open: "98", openColor: undefined, delay: "160ms", active: true,
                rows: [
                  { k: "Taux d'ouverture", v: "98%",    vc: "var(--signal)" },
                  { k: "Taux de clic",     v: "35–45%", vc: "var(--signal)" },
                  { k: "Délai de lecture", v: "3 min",  vc: "var(--signal)" },
                  { k: "Taux de réponse",  v: "45%",    vc: "var(--signal)" },
                ],
              },
            ].map((card) => (
              <div key={card.label} className={`${s.cmpCard}${card.active ? " " + s.active : ""} ${s.reveal}`} data-delay={card.delay}>
                <div className={s.cmpChannel}>{card.label}</div>
                <div className={s.cmpOpen} style={card.openColor ? { color: card.openColor } : undefined}>
                  <span data-countup={card.open}>{card.open}</span><span className={s.cmpPct}>%</span>
                </div>
                <div className={s.cmpRows}>
                  {card.rows.map((row) => (
                    <div key={row.k} className={s.cmpRow}>
                      <span className={s.k}>{row.k}</span>
                      <span className={s.v} style={row.vc ? { color: row.vc } : undefined}>{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SEGMENTATION ─── */}
      <section id="segmentation" className={s.segmentation}>
        <div className={s.container}>
          <div className={s.sectionHeader}>
            <p className={`${s.tLabel} ${s.sectionEyebrow} ${s.reveal}`}>Ciblage</p>
            <h2 className={`${s.tHeadline} ${s.reveal}`}>Le bon message.<br />À la bonne personne.</h2>
            <p className={`${s.tBody} ${s.reveal}`} data-delay="80ms">
              Chaque segment reçoit ce qui le concerne.
            </p>
          </div>
          <div className={s.segLayout}>
            <div className={s.segFeatures}>
              {[
                { Icon: Target,    delay: "0ms",   title: "Filtres comportementaux",   desc: "Historique d'achat, fréquence, fidélité. Le comportement réel, pas des suppositions." },
                { Icon: MapPin,    delay: "80ms",  title: "Segmentation géographique", desc: "Ville, quartier, zone de livraison. Ciblez au plus proche." },
                { Icon: Tag,       delay: "160ms", title: "Tags personnalisés",        desc: "VIP, prospect chaud, inactif 90j. Créez vos propres audiences." },
                { Icon: Lightning, delay: "240ms", title: "Audiences dynamiques",      desc: "Les segments se mettent à jour seuls. Zéro intervention manuelle." },
              ].map((f) => (
                <div key={f.title} className={`${s.segFeat} ${s.reveal}`} data-delay={f.delay}>
                  <div className={s.segFeatIcon}><f.Icon size={18} weight="bold" /></div>
                  <div className={s.segFeatBody}>
                    <p className={s.tTitle}>{f.title}</p>
                    <p className={s.tSmall}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${s.segMock} ${s.revealScale}`} data-delay="100ms">
              <div className={s.segMockHead}>
                <span className={s.title}>Nouveau segment</span>
                <span className={s.count}>2 847 contacts</span>
              </div>
              <div className={s.segMockBody}>
                {[
                  { Icon: MapPin,       label: "Ville",             val: "Brazzaville" },
                  { Icon: ShoppingCart, label: "Dernière commande", val: "il y a > 60j" },
                  { Icon: Coins,        label: "Panier moyen",      val: "> 25 000 XAF" },
                  { Icon: Tag,          label: "Tag",               val: "Client fidèle" },
                ].map((row) => (
                  <div key={row.label} className={s.segRow}>
                    <div className={s.segRowIcon}><row.Icon size={14} weight="bold" /></div>
                    <div className={s.segRowLabel}>{row.label}</div>
                    <div className={s.segRowVal}>{row.val}</div>
                  </div>
                ))}
              </div>
              <div className={s.segMockFooter}>
                <div className={s.segTotalGroup}>
                  <span className={s.segTotal}>Audience : <strong>2 847 / 12 500 contacts</strong></span>
                  <div className={s.segCoverage}>
                    <div className={s.segCoverageTrack}><div className={s.segCoverageFill} /></div>
                    <span className={s.segCoverageText}>22.8% de votre base</span>
                  </div>
                </div>
                <a href="#cta" className={`${s.btn} ${s.btnPrimary}`} style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }} onClick={(e) => { e.preventDefault(); scrollTo("cta") }}>
                  Créer →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAMPAIGNS ─── */}
      <section id="campaigns" className={s.campaigns}>
        <div className={s.container}>
          <div className={s.sectionHeader}>
            <p className={`${s.tLabel} ${s.sectionEyebrow} ${s.reveal}`}>Campagnes</p>
            <h2 className={`${s.tHeadline} ${s.reveal}`}>Lancez en quelques clics.<br />Mesurez tout.</h2>
            <p className={`${s.tBody} ${s.reveal}`} data-delay="80ms">
              Créez, planifiez, envoyez. En quelques clics.
            </p>
          </div>

          <div className={s.campTop}>
            <div className={`${s.campFeatured} ${s.reveal}`} data-delay="0ms">
              <p className={s.tTitle}>Templates approuvés Meta</p>
              <p className={s.tBody}>Modèles validés par Meta. Texte, images, vidéos, boutons CTA.</p>
              <div className={s.tplMock}>
                <div className={s.tplHeader}>
                  <span className={s.tplName}>Promo_Ramadan_v2</span>
                  <span className={s.tplStatus}>Approuvé ✓</span>
                </div>
                <p className={s.tplBodyText}>
                  Bonjour <span className={s.tplVar}>{"{{prénom}}"}</span> 👋 Profitez de <strong>-20%</strong> sur vos prochaines commandes jusqu&apos;au 30 mars. Offre réservée à nos clients <span className={s.tplVar}>{"{{ville}}"}</span>.
                </p>
                <div className={s.tplActions}>
                  <span className={s.tplBtn}>Voir l&apos;offre →</span>
                  <span className={s.tplBtn}>Se désabonner</span>
                </div>
              </div>
            </div>
            <div className={`${s.campSecond} ${s.reveal}`} data-delay="80ms">
              <p className={s.tTitle}>Personnalisation dynamique</p>
              <p className={s.tBody}>Prénom, ville, panier. Chaque contact reçoit son message.</p>
              <div className={s.persoVars}>
                {["{{prénom}}", "{{ville}}", "{{panier_moyen}}", "{{dernière_commande}}", "{{statut}}"].map((v) => (
                  <span key={v} className={s.persoVar}>{v}</span>
                ))}
              </div>
            </div>
          </div>

          <div className={s.campList}>
            {[
              { Icon: Clock,                  delay: "0ms",   title: "Envoi planifié",          desc: "Date, heure, fuseau. Flow envoie au moment optimal." },
              { Icon: FileArrowUp,            delay: "60ms",  title: "Import CSV & JSON",        desc: "Base importée en secondes. Doublons détectés, tags assignés." },
              { Icon: Paperclip,              delay: "120ms", title: "Médias & pièces jointes",  desc: "PDF, images, vidéos directement dans la campagne." },
              { Icon: ArrowsCounterClockwise, delay: "180ms", title: "Campagnes récurrentes",    desc: "Anniversaire, rappel mensuel, relance hebdo automatisée." },
            ].map((item) => (
              <div key={item.title} className={`${s.campListItem} ${s.reveal}`} data-delay={item.delay}>
                <div className={s.cliIcon}><item.Icon size={20} weight="bold" /></div>
                <p className={s.cliTitle}>{item.title}</p>
                <p className={s.cliDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── REPORTING ─── */}
      <section id="reporting" className={s.reporting}>
        <div className={s.container}>
          <div className={s.sectionHeader}>
            <p className={`${s.tLabel} ${s.sectionEyebrow} ${s.reveal}`}>Analytics</p>
            <h2 className={`${s.tHeadline} ${s.reveal}`}>Mesurez ce qui<br />génère du chiffre.</h2>
            <p className={`${s.tBody} ${s.reveal}`} data-delay="80ms">
              En temps réel. Pas de tableur, pas d&apos;export manuel.
            </p>
          </div>
          <div className={s.reportLayout}>
            <div className={`${s.reportMock} ${s.revealScale}`} data-delay="0ms">
              <div className={s.reportHead}>
                <span className={s.reportTitle}>Campagne — Relance Inactifs Mai</span>
                <span className={s.reportTag}>Terminée</span>
              </div>
              <div className={s.reportBody}>
                <div className={s.reportKpiRow}>
                  {[
                    { n: "5 200", l: "Envoyés",  delta: "100%",       color: "var(--signal)" },
                    { n: "97%",   l: "Livrés",   delta: "+2% vs moy.", color: undefined },
                    { n: "94%",   l: "Lus",      delta: "↑ élevé",    color: "var(--signal)" },
                  ].map((kpi) => (
                    <div key={kpi.l} className={s.reportKpi}>
                      <div className={s.n} style={kpi.color ? { color: kpi.color } : undefined}>{kpi.n}</div>
                      <div className={s.l}>{kpi.l}</div>
                      <div className={s.delta}>{kpi.delta}</div>
                    </div>
                  ))}
                </div>
                <div className={s.reportBarRow}>
                  {[
                    { label: "Répondu",     pct: "41%",  w: "41%", color: "var(--signal)" },
                    { label: "Clic bouton", pct: "29%",  w: "29%", color: "#34d399" },
                    { label: "Converti",    pct: "18%",  w: "18%", color: "#38bdf8" },
                    { label: "Désabonné",   pct: "0.4%", w: "2%",  color: "#ff4545" },
                  ].map((bar) => (
                    <div key={bar.label} className={s.reportBarItem}>
                      <span className={s.reportBarLabel}>{bar.label}</span>
                      <div className={s.reportBarTrack}>
                        <div className={s.reportBarFill} style={{ width: bar.w, background: bar.color }} />
                      </div>
                      <span className={s.reportBarVal}>{bar.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.reportFeatures}>
              {[
                { delay: "0ms",   title: "Rapports en temps réel",   desc: "Livraisons, lectures et réponses suivis au fil de l'envoi." },
                { delay: "80ms",  title: "Export CSV & PDF",          desc: "Rapport complet à la fin de chaque campagne. Envoi automatique à votre équipe." },
                { delay: "160ms", title: "Historique et comparaison", desc: "Comparez vos campagnes. Trouvez ce qui performe vraiment." },
                { delay: "240ms", title: "ROI par campagne",          desc: "Associez chaque envoi aux revenus générés." },
              ].map((f) => (
                <div key={f.title} className={`${s.reportFeat} ${s.reveal}`} data-delay={f.delay}>
                  <div className={s.reportCheck}>✓</div>
                  <div>
                    <p className={s.tTitle}>{f.title}</p>
                    <p className={s.tSmall}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── AGENTS ─── */}
      <section id="agents" className={s.agents}>
        <div className={s.container}>
          <div className={s.sectionHeader}>
            <p className={`${s.tLabel} ${s.sectionEyebrow} ${s.reveal}`}>Intelligence</p>
            <h2 className={`${s.tHeadline} ${s.agentHeadline} ${s.reveal}`}>Envoyez. Entraînez<br /><em>Yanola</em> à répondre.</h2>
            <p className={`${s.tBody} ${s.reveal}`} data-delay="80ms">
              Yanola est votre agent IA. Donnez-lui vos produits, vos tarifs, vos FAQ — il répond à vos clients 24h/24, en moins de 2 secondes.
            </p>
          </div>
          <div className={s.agentLayout}>
            <div className={s.agentPoints}>
              {[
                { num: "1", delay: "0ms",   title: "Connectez Yanola à votre campagne",  desc: "Yanola prend en charge toutes les réponses dès que la campagne est lancée." },
                { num: "2", delay: "80ms",  title: "Entraînez avec vos documents",       desc: "Catalogue, tarifs, FAQ. Yanola apprend et répond avec vos vraies informations." },
                { num: "3", delay: "160ms", title: "Réponse en moins de 2 secondes",     desc: "Yanola répond immédiatement. Aucun message sans réponse." },
                { num: "4", delay: "240ms", title: "Escalade intelligente",              desc: "Si besoin, Yanola passe la main à un humain avec tout le contexte." },
              ].map((p) => (
                <div key={p.num} className={`${s.agentPoint} ${s.reveal}`} data-delay={p.delay}>
                  <div className={s.apNum}>{p.num}</div>
                  <div>
                    <p className={s.tTitle}>{p.title}</p>
                    <p className={s.tSmall}>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${s.agentMock} ${s.revealScale}`} data-delay="120ms">
              <div className={s.yanolaHead}>
                <div className={s.yanolaIdentity}>
                  <div className={s.yanolaAvatar}>Y</div>
                  <div>
                    <div className={s.yanolaName}>Yanola</div>
                    <div className={s.yanolaStatus}>
                      <span className={s.yanolaStatusDot} />
                      Agent IA actif
                    </div>
                  </div>
                </div>
                <div className={`${s.agentToggle} ${s.on}`} />
              </div>

              <div className={s.yanolaTools}>
                <p className={s.yanolaToolsLabel}>Outils disponibles</p>
                <div className={s.yanolaToolsList}>
                  {[
                    { Icon: MagnifyingGlass, label: "Recherche catalogue & FAQ" },
                    { Icon: Paperclip,       label: "Envoi de documents PDF" },
                    { Icon: Receipt,         label: "Génération de devis" },
                    { Icon: Brain,           label: "Mémoire conversationnelle" },
                  ].map((tool) => (
                    <div key={tool.label} className={s.yanolaToolItem}>
                      <tool.Icon size={14} weight="bold" className={s.yanolaToolIcon} />
                      <span>{tool.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={s.yanolaLastMsg}>
                <span className={s.yanolaLastMsgMeta}>Dernière réponse · il y a 4s</span>
                <p className={s.yanolaLastMsgText}>&ldquo;Bonjour ! Votre commande #1842 est en cours de livraison. Souhaitez-vous le récapitulatif ?&rdquo;</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── USE CASES ─── */}
      <section id="usecases" className={s.usecases}>
        <div className={s.container}>
          <div className={s.sectionHeader}>
            <p className={`${s.tLabel} ${s.sectionEyebrow} ${s.reveal}`}>Stratégies</p>
            <h2 className={`${s.tHeadline} ${s.reveal}`}>Trois stratégies.<br />Des résultats concrets.</h2>
          </div>
          <div className={s.ucGrid}>
            {[
              {
                tag: "Relance client", tagClass: s.relance, Icon: ArrowsClockwise, delay: "0ms",
                title: "Réactivez vos clients dormants",
                body: "Inactifs depuis 60 jours. Une offre exclusive. Le taux de réactivation grimpe.",
                bullets: ["Segmenter les inactifs depuis N jours", "Envoyer une offre limitée dans le temps", "Activer l'agent pour traiter les réponses"],
              },
              {
                tag: "Acquisition", tagClass: s.acquisition, Icon: Rocket, delay: "100ms",
                title: "Convertissez vos prospects",
                body: "Prospect donné, pas encore acheté. Une séquence de 3 messages suffit.",
                bullets: ["Importer la liste de prospects", "Séquence de 3 messages sur 7 jours", "Agent commercial pour les curieux"],
              },
              {
                tag: "Reconquête", tagClass: s.reconquete, Icon: Recycle, delay: "200ms",
                title: "Récupérez vos clients perdus",
                body: "Inactifs depuis 6 mois. Un message ciblé, au bon moment, peut tout changer.",
                bullets: ["Identifier la base perdue (+6 mois)", "Message personnalisé + remise retour", "Suivi automatique à J+3 sans réponse"],
              },
            ].map((uc) => (
              <div key={uc.tag} className={`${s.ucCard} ${s.reveal}`} data-delay={uc.delay}>
                <span className={`${s.ucTag} ${uc.tagClass}`}>{uc.tag}</span>
                <div className={s.ucIcon}><uc.Icon size={28} weight="bold" /></div>
                <p className={s.tTitle}>{uc.title}</p>
                <p className={s.tBody}>{uc.body}</p>
                <div className={s.ucBullets}>
                  {uc.bullets.map((b) => <div key={b} className={s.ucBullet}>{b}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className={s.pricing}>
        <div className={s.container}>
          <div className={s.sectionHeader}>
            <p className={`${s.tLabel} ${s.sectionEyebrow} ${s.reveal}`}>Tarification</p>
            <h2 className={`${s.tHeadline} ${s.reveal}`}>Payez à l&apos;usage.<br />Débloquez à la croissance.</h2>
            <p className={`${s.tBody} ${s.reveal}`} data-delay="80ms">
              Crédits WhatsApp à la performance. Automatisations et IA avec l&apos;abonnement Pro.
            </p>
          </div>

          {/* Plan cards */}
          <div className={s.plansGrid}>
            {/* Base */}
            <div className={`${s.planCard} ${s.reveal}`} data-delay="0ms">
              <div className={s.planTag}>Base</div>
              <div className={s.planPriceBlock}>
                <span className={s.planAmt}>Gratuit</span>
              </div>
              <p className={s.planPriceSub}>Activé dès votre premier achat de crédits WhatsApp</p>
              <ul className={s.planFeatures}>
                {["Tableau de bord & statistiques", "Contacts, Tags, Champs personnalisés", "Import CSV & JSON", "Campagnes WhatsApp (envoi immédiat & planifié)", "Modèles approuvés Meta", "Boîte de réception (Conversations)"].map((f) => (
                  <li key={f} className={s.planFeat}><span className={s.planCheck}>✓</span>{f}</li>
                ))}
              </ul>
              <a href="#cta" className={`${s.btn} ${s.btnGhost}`} style={{ width: "100%", marginTop: "auto" }} onClick={(e) => { e.preventDefault(); scrollTo("cta") }}>
                Démarrer →
              </a>
            </div>

            {/* Pro */}
            <div className={`${s.planCard} ${s.planCardPro} ${s.revealScale}`} data-delay="80ms">
              <div className={s.planProLabel}>PRO</div>
              <div className={s.planTag} style={{ color: "var(--signal)" }}>Pro</div>
              <div className={s.planPriceBlock}>
                <span className={s.planAmt} style={{ color: "var(--signal)" }}>$199</span>
                <span className={s.planPer}>/mois</span>
              </div>
              <p className={s.planPriceSub}>ou <strong style={{ color: "var(--ink)" }}>$1 990/an</strong> — économisez 17%</p>
              <ul className={s.planFeatures}>
                <li className={s.planFeatAll}>Tout Base, plus :</li>
                {["Segments dynamiques (critères combinés)", "Automatisations & séquences déclenchées", "Agent IA Yanola (réponses 24h/24)", "Génération de devis PDF"].map((f) => (
                  <li key={f} className={s.planFeat}><span className={s.planCheck} style={{ color: "var(--signal)" }}>✓</span>{f}</li>
                ))}
              </ul>
              <a href="/auth/login" className={`${s.btn} ${s.btnPrimary}`} style={{ width: "100%", marginTop: "auto" }}>
                Commencer maintenant
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className={`${s.pricingDivider} ${s.reveal}`} data-delay="0ms">
            <span>Messages WhatsApp — Tarifs à la performance</span>
          </div>

          <div className={s.pricingIntro}>
            <div className={`${s.pricingNote} ${s.reveal}`} data-delay="0ms">
              <p className={s.tLabel} style={{ color: "var(--signal)" }}>Payez à votre rythme</p>
              <div className={s.flyerCmp}>
                <div className={s.flyerItem}>
                  <span className={s.flyerChan}>1 000 flyers</span>
                  <span className={s.flyerAmt}>≥ 100 000 FCFA</span>
                  <span className={s.flyerMeta}>Impression + distribution · ~10% de lecture · non mesurable</span>
                </div>
                <div className={`${s.flyerItem} ${s.flyerItemWa}`}>
                  <span className={s.flyerChan}>1 000 messages WhatsApp via Flow</span>
                  <span className={s.flyerAmt}>18 000 FCFA</span>
                  <span className={s.flyerMeta}>98% de lecture · personnalisé · livraison mesurée</span>
                </div>
              </div>
              <p className={s.flyerConclusion}>Pour le même budget, Flow touche <strong>5× plus de personnes</strong> — qui lisent vraiment.</p>

              {/* ─── Simulator ─── */}
              <div className={s.simulator}>
                <p className={s.simLabel}>Simulateur de coût</p>
                <div className={s.simTypeSel}>
                  {SIM_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`${s.simTypeBtn}${simType === t.id ? " " + s.simTypeActive : ""}`}
                      onClick={() => setSimType(t.id)}
                    >
                      <span className={s.simTypeName}>{t.label}</span>
                      <span className={s.simTypePrice}>{t.pricePerMsg} FCFA/msg</span>
                    </button>
                  ))}
                </div>
                <div className={s.simSliderWrap}>
                  <div className={s.simSliderRow}>
                    <span className={s.simVolLabel}>Volume</span>
                    <span className={s.simVolNum}>{simVolume.toLocaleString("fr-FR")} messages</span>
                  </div>
                  <input
                    type="range"
                    className={s.simSlider}
                    min={100}
                    max={50000}
                    step={100}
                    value={simVolume}
                    onChange={(e) => setSimVolume(Number(e.target.value))}
                  />
                  <div className={s.simSliderTicks}>
                    <span>100</span>
                    <span>25 000</span>
                    <span>50 000</span>
                  </div>
                </div>
                <div className={s.simResult}>
                  <span className={s.simResultAmt}>{simPrice.toLocaleString("fr-FR")} FCFA</span>
                  <span className={s.simResultSub}>pour {simVolume.toLocaleString("fr-FR")} messages {SIM_TYPES.find(t => t.id === simType)!.label.toLowerCase()}</span>
                </div>
              </div>
            </div>

            <div className={`${s.msgTypesWrap} ${s.revealScale}`} data-delay="80ms">
              <div className={s.msgTypes}>
                <div className={s.msgTypeHeader}>
                  <span>Type de message</span>
                  <span>Prix</span>
                  <span>Catégorie</span>
                </div>
                {[
                  { name: "Marketing",         desc: "Promotions, offres, campagnes",        price: "18 FCFA",  badgeClass: s.badgeMarketing, badge: "Marketing" },
                  { name: "Utilitaire",        desc: "Confirmations, notifications, rappels", price: "6 FCFA",   badgeClass: s.badgeUtility,   badge: "Utilitaire" },
                  { name: "Authentification",  desc: "OTP, codes de vérification",           price: "6 FCFA",   badgeClass: s.badgeAuth,      badge: "Auth" },
                  { name: "Service (entrant)", desc: "Réponses dans la fenêtre 24h client",  price: "Offert",   badgeClass: s.badgeService,   badge: "Service", per: "fenêtre 24h" },
                ].map((row) => (
                  <div key={row.name} className={s.msgTypeRow}>
                    <div>
                      <div className={s.msgTypeName}>{row.name}</div>
                      <div className={s.msgTypeDesc}>{row.desc}</div>
                    </div>
                    <div className={s.msgPrice}>
                      <div className={s.amount}>{row.price}</div>
                      <div className={s.per}>{row.per ?? "/ message"}</div>
                    </div>
                    <span className={`${s.msgBadge} ${row.badgeClass}`}>{row.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${s.pricingFooter} ${s.reveal}`} data-delay="200ms">
            <p className={s.tSmall}>Rechargez en FCFA par Mobile Money ou carte bancaire. L&apos;abonnement Pro est résiliable à tout moment.</p>
            <a href="https://wa.me/242056590857" target="_blank" rel="noopener noreferrer" className={`${s.btn} ${s.btnGhost}`}>Nous contacter →</a>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="cta" className={s.ctaSection}>
        <div className={s.container}>
          <div className={`${s.ctaBox} ${s.revealScale}`}>
            <h2 className={s.tHeadline}>Prêt à lancer votre première<br />campagne WhatsApp ?</h2>
            <p className={s.tBody}>30 minutes. Notre équipe vous montre Flow sur votre base. Sans engagement.</p>
            <div className={s.ctaActions}>
              <a href="/auth/login" className={`${s.btn} ${s.btnPrimary} ${s.btnXl}`}>Commencer maintenant</a>
              <a href="https://wa.me/242056590857" target="_blank" rel="noopener noreferrer" className={`${s.btn} ${s.btnGhost} ${s.btnXl}`}>Nous contacter</a>
            </div>
            <p className={s.ctaNote}>Réponse sous 24h · Démo en français · Équipe basée à Brazzaville</p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerInner}>
            <a href="#hero" className={s.footerLogo} onClick={(e) => { e.preventDefault(); scrollTo("hero") }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_flow_blanc.png" alt="Flow" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
              <span>Flow by Nodes Technology</span>
            </a>
            <div className={s.footerOrigin}>
              <span>🇨🇬</span>
              <span>Brazzaville, République du Congo</span>
            </div>
            <div className={s.footerLinks}>
              <a href="mailto:contact@nodes.cd">Contact</a>
              <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollTo("pricing") }}>Tarifs</a>
              <a href="#usecases" onClick={(e) => { e.preventDefault(); scrollTo("usecases") }}>Cas d&apos;usage</a>
            </div>
            <p className={s.footerCopy}>© 2025 Nodes Technology. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
