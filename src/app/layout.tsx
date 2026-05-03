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
  title: "Flow - Marketing interactif et agents IA",
  description: "Plateforme WhatsApp de marketing interactif, conversations automatisees et agents IA.",
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
