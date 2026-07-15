import type { Metadata } from "next"
import { headers } from "next/headers"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { DevAgentation } from "@/components/dev-agentation"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Flow — Marketing WhatsApp ciblé pour les entreprises africaines",
  description:
    "Flow vous permet d'envoyer des campagnes WhatsApp ciblées, segmenter votre base, automatiser vos relances et mesurer vos résultats en temps réel. Solution congolaise, basée à Brazzaville.",
  icons: {
    icon: "/logo-nodes-badge.svg",
    apple: "/logo-nodes-badge.svg",
    shortcut: "/logo-nodes-badge.svg",
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html lang="fr" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} font-sans`}>
        <Providers nonce={nonce}>{children}</Providers>
        {DevAgentation && <DevAgentation />}
      </body>
    </html>
  )
}
