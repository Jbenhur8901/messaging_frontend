import type { Metadata } from "next"
import { headers } from "next/headers"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Flow - SMS Campaign Management",
  description: "Plateforme de gestion de campagnes SMS",
  icons: {
    icon: "/logo-nodes.png",
    apple: "/logo-nodes.png",
    shortcut: "/logo-nodes.png",
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
      </body>
    </html>
  )
}
