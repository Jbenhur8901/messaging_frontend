import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { DevAgentation } from "@/components/dev-agentation"
import { PwaRegister } from "@/components/pwa-register"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Flow — Marketing WhatsApp ciblé pour les entreprises africaines",
  description:
    "Flow vous permet d'envoyer des campagnes WhatsApp ciblées, segmenter votre base, automatiser vos relances et mesurer vos résultats en temps réel. Solution congolaise, basée à Brazzaville.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flow",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
    shortcut: "/icon-192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <PwaRegister />
        <PwaInstallPrompt />
      </body>
    </html>
  )
}
