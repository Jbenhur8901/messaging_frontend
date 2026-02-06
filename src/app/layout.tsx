import type { Metadata } from "next"
import { Instrument_Sans, Sora } from "next/font/google"
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${instrumentSans.variable} ${sora.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
