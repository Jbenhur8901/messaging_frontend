import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Flow — Marketing WhatsApp ciblé pour les entreprises africaines",
  description:
    "Flow vous permet d'envoyer des campagnes WhatsApp ciblées, segmenter votre base, automatiser vos relances et mesurer vos résultats en temps réel. Solution congolaise, basée à Brazzaville.",
}

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html { scroll-behavior: smooth; }`}</style>
      {children}
    </>
  )
}
