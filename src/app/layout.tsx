import type { Metadata } from "next"
import { Instrument_Sans, Sora } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import { Providers } from "@/components/providers"

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
})

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
})

export const metadata: Metadata = {
  title: "Flow - SMS Campaign Management",
  description: "Plateforme de gestion de campagnes SMS",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html lang="fr" suppressHydrationWarning>
      <head nonce={nonce} />
      <body className={`${instrumentSans.variable} ${sora.variable}`}>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  )
}
